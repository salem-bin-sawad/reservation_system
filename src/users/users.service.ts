import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { MailService } from '../mail/mail.service.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * تشفير رمز التحقق OTP باستخدام SHA-256
   */
  private hashOtp(otpCode: string): string {
    return crypto.createHash('sha256').update(otpCode).digest('hex');
  }

  /**
   * دالة مساعدة عامة للبحث عن المستخدم بواسطة رقم الجوال (الأساسي) أو البريد (Fallback) أو المعرف الموحد
   */
  private async findUserByIdentifier(
    params: { phone?: string; email?: string; identifier?: string },
    selectFields: { password?: boolean; otpCode?: boolean; resetOtpCode?: boolean } = {},
  ): Promise<User | null> {
    const rawVal = params.phone || params.identifier || params.email;
    if (!rawVal || !rawVal.trim()) {
      return null;
    }
    const cleanVal = rawVal.trim();

    const qb = this.userRepository.createQueryBuilder('user');
    if (selectFields.password) qb.addSelect('user.password');
    if (selectFields.otpCode) qb.addSelect('user.otpCode');
    if (selectFields.resetOtpCode) qb.addSelect('user.resetOtpCode');

    // 1. إذا تم تحديد الجوال بشكل صريح
    if (params.phone) {
      qb.where('user.phone = :phone', { phone: params.phone.trim() });
      const user = await qb.getOne();
      if (user) return user;
    }

    // 2. إذا تم تحديد البريد بشكل صريح وبدون هاتف
    if (params.email && !params.phone && !params.identifier) {
      qb.where('LOWER(user.email) = LOWER(:email)', { email: params.email.trim() });
      const user = await qb.getOne();
      if (user) return user;
    }

    // 3. البحث بالمعرف الموحد: إذا احتوى على @ يبحث بالبريد، وإلا يبحث برقم الجوال
    if (cleanVal.includes('@')) {
      qb.where('LOWER(user.email) = LOWER(:val)', { val: cleanVal });
    } else {
      qb.where('user.phone = :val', { val: cleanVal });
    }

    let result = await qb.getOne();

    // 4. Fallback إضافي: في حال لم يطابق النمط المعتاد
    if (!result) {
      const fallbackQb = this.userRepository.createQueryBuilder('user');
      if (selectFields.password) fallbackQb.addSelect('user.password');
      if (selectFields.otpCode) fallbackQb.addSelect('user.otpCode');
      if (selectFields.resetOtpCode) fallbackQb.addSelect('user.resetOtpCode');

      fallbackQb.where('user.phone = :val OR LOWER(user.email) = LOWER(:val)', { val: cleanVal });
      result = await fallbackQb.getOne();
    }

    return result;
  }

  /**
   * التحقق من توفر رقم الجوال (المعرف الأساسي)
   */
  async checkPhoneAvailability(phone: string): Promise<{ available: boolean; message: string }> {
    if (!phone || !phone.trim()) {
      throw new BadRequestException('رقم الجوال مطلوب.');
    }
    const cleanPhone = phone.trim();
    const existingUser = await this.userRepository.findOne({
      where: { phone: cleanPhone },
    });

    if (existingUser) {
      throw new ConflictException('يوجد حساب مسجل بالفعل برقم الجوال هذا.');
    }

    return {
      available: true,
      message: 'رقم الجوال متاح للتسجيل.',
    };
  }

  /**
   * التحقق من توفر البريد الإلكتروني (Fallback اختياري)
   */
  async checkEmailAvailability(email: string): Promise<{ available: boolean; message: string }> {
    if (!email || !email.trim()) {
      throw new BadRequestException('البريد الإلكتروني مطلوب.');
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('يوجد حساب مسجل بالفعل بهذا البريد الإلكتروني.');
    }

    return {
      available: true,
      message: 'البريد الإلكتروني متاح للتسجيل.',
    };
  }

  /**
   * إنشاء مستخدم جديد (التسجيل برقم الجوال إلزامي، والبريد اختياري كـ Fallback)
   */
  async signup(createUserDto: CreateUserDto): Promise<Partial<User>> {
    if (!createUserDto.phone || !createUserDto.phone.trim()) {
      throw new BadRequestException('رقم الجوال إلزامي لإنشاء الحساب.');
    }

    const cleanPhone = createUserDto.phone.trim();
    const existingByPhone = await this.userRepository.findOne({
      where: { phone: cleanPhone },
    });

    if (existingByPhone) {
      throw new ConflictException('يوجد حساب مسجل بالفعل برقم الجوال هذا.');
    }

    let normalizedEmail: string | undefined = undefined;
    if (createUserDto.email && createUserDto.email.trim()) {
      normalizedEmail = createUserDto.email.toLowerCase().trim();
      const existingByEmail = await this.userRepository.findOne({
        where: { email: normalizedEmail },
      });
      if (existingByEmail) {
        throw new ConflictException('يوجد حساب مسجل بالفعل بهذا البريد الإلكتروني.');
      }
    }

    // تشفير كلمة المرور بـ 10 جولات salt
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // توليد رمز OTP مكون من 6 أرقام
    const rawOtpCode = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = this.hashOtp(rawOtpCode);
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // صالح لـ 15 دقيقة
    const otpLastSentAt = new Date();

    const user = this.userRepository.create({
      ...createUserDto,
      phone: cleanPhone,
      email: normalizedEmail,
      fullName: createUserDto.fullName.trim(),
      role: createUserDto.role || UserRole.USER,
      password: hashedPassword,
      otpCode: hashedOtp,
      otpExpiresAt,
      otpLastSentAt,
      otpAttempts: 0,
      isPhoneVerified: false,
      isEmailVerified: false,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // محاكاة إرسال رسالة SMS / واتساب برمز التحقق
    console.log(`\n📱 [SMS/WhatsApp Gateway] ================================`);
    console.log(`📱 تم إرسال كود التحقق (OTP) إلى الجوال: ${cleanPhone}`);
    console.log(`🔑 كود التحقق هو: [ ${rawOtpCode} ] (صالح لمدة 15 دقيقة)`);
    console.log(`📱 ========================================================\n`);

    // إرسال رمز OTP إضافي عبر البريد الإلكتروني إن وجد (Fallback)
    if (normalizedEmail) {
      try {
        await this.mailService.sendOtpEmail(normalizedEmail, savedUser.fullName, rawOtpCode);
      } catch (err: any) {
        console.warn(`⚠️ تعذر إرسال إيميل OTP الاحتياطي: ${err?.message || err}`);
      }
    }

    const { password, otpCode: _, ...result } = savedUser;
    return result;
  }

  /**
   * تفعيل الحساب ورقم الجوال عبر التحقق من رمز OTP
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{ message: string; success: boolean }> {
    const rawOtpCode = verifyOtpDto.otpCode.trim();

    const user = await this.findUserByIdentifier(
      {
        phone: verifyOtpDto.phone,
        email: verifyOtpDto.email,
        identifier: verifyOtpDto.identifier,
      },
      { otpCode: true },
    );

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود. يرجى التأكد من رقم الجوال.');
    }

    if (user.isPhoneVerified) {
      return { message: 'تم تفعيل رقم الجوال والحساب مسبقاً.', success: true };
    }

    // الحماية من التخمين المتكرر (أقصى حد 5 محاولات)
    if (user.otpAttempts >= 5) {
      throw new BadRequestException(
        'تم تجاوز عدد المحاولات المسموح بها، تم قفل التحقق لأسباب أمنية. يرجى طلب رمز جديد.',
      );
    }

    // التحقق من صلاحية الوقت
    if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      throw new BadRequestException('انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.');
    }

    // مقارنة التجزئة
    const hashedInputOtp = this.hashOtp(rawOtpCode);
    if (!user.otpCode || user.otpCode !== hashedInputOtp) {
      user.otpAttempts += 1;
      await this.userRepository.save(user);
      const remaining = 5 - user.otpAttempts;
      throw new BadRequestException(
        `رمز التحقق غير صحيح. ${remaining > 0 ? `المحاولات المتبقية: ${remaining}.` : 'تم قفل المحاولات.'}`,
      );
    }

    // نجاح التحقق وتفعيل رقم الجوال والحساب
    user.isPhoneVerified = true;
    if (user.email) {
      user.isEmailVerified = true;
    }
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpLastSentAt = null;
    user.otpAttempts = 0;

    await this.userRepository.save(user);

    return {
      message: 'تم تفعيل رقم الجوال وتأكيد الحساب بنجاح!',
      success: true,
    };
  }

  /**
   * إعادة إرسال رمز OTP مع مهلة 60 ثانية
   */
  async resendOtp(identifierOrPhone: string): Promise<{ message: string; success: boolean }> {
    if (!identifierOrPhone || !identifierOrPhone.trim()) {
      throw new BadRequestException('يرجى تحديد رقم الجوال أو البريد الإلكتروني.');
    }

    const user = await this.findUserByIdentifier({ identifier: identifierOrPhone });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود.');
    }

    if (user.isPhoneVerified) {
      return { message: 'تم تفعيل الحساب ورقم الجوال مسبقاً.', success: true };
    }

    if (user.otpLastSentAt) {
      const secondsSinceLastSent = (Date.now() - new Date(user.otpLastSentAt).getTime()) / 1000;
      if (secondsSinceLastSent < 60) {
        const cooldownRemaining = Math.ceil(60 - secondsSinceLastSent);
        throw new BadRequestException(
          `يرجى الانتظار ${cooldownRemaining} ثانية قبل طلب رمز جديد.`,
        );
      }
    }

    const rawOtpCode = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = this.hashOtp(rawOtpCode);
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.otpCode = hashedOtp;
    user.otpExpiresAt = otpExpiresAt;
    user.otpLastSentAt = new Date();
    user.otpAttempts = 0;

    await this.userRepository.save(user);

    // محاكاة إرسال SMS
    console.log(`\n📱 [SMS/WhatsApp Gateway] ================================`);
    console.log(`📱 تم إعادة إرسال كود التحقق (OTP) إلى الجوال: ${user.phone}`);
    console.log(`🔑 كود التحقق الجديد هو: [ ${rawOtpCode} ]`);
    console.log(`📱 ========================================================\n`);

    if (user.email) {
      try {
        await this.mailService.sendOtpEmail(user.email, user.fullName, rawOtpCode);
      } catch (err: any) {
        console.warn(`⚠️ تعذر إرسال إيميل OTP الاحتياطي: ${err?.message || err}`);
      }
    }

    return { message: 'تم إرسال رمز تحقق جديد إلى رقم جوالك بنجاح.', success: true };
  }

  /**
   * تسجيل الدخول الأساسي برقم الجوال (مع دعم Fallback للبريد الإلكتروني) وإصدار توكن JWT
   */
  async login(loginDto: LoginDto): Promise<{ message: string; accessToken: string; user: Partial<User> }> {
    const rawIdentifier = loginDto.phone || loginDto.identifier || loginDto.email;
    if (!rawIdentifier || !rawIdentifier.trim()) {
      throw new BadRequestException('يرجى إدخال رقم الجوال (أو البريد الإلكتروني).');
    }

    const user = await this.findUserByIdentifier(
      {
        phone: loginDto.phone,
        email: loginDto.email,
        identifier: loginDto.identifier,
      },
      { password: true },
    );

    if (!user) {
      throw new UnauthorizedException('رقم الجوال أو كلمة المرور غير صحيحة.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('تم تعطيل هذا الحساب. يرجى التواصل مع إدارة النظام.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('رقم الجوال أو كلمة المرور غير صحيحة.');
    }

    // التحقق من تفعيل الجوال أو الإيميل
    if (!user.isPhoneVerified && !user.isEmailVerified) {
      throw new UnauthorizedException('رقم الجوال غير مفعل. يرجى إتمام التحقق من رمز OTP أولاً.');
    }

    // توليد توكن JWT الحقيقي متضمناً رقم الجوال والدور
    const payload = {
      sub: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      officeName: user.officeName,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const { password, otpCode: _, resetOtpCode: __, ...sanitizedUser } = user;

    return {
      message: 'تم تسجيل الدخول بنجاح!',
      accessToken,
      user: sanitizedUser,
    };
  }

  /**
   * طلب استعادة كلمة المرور (إرسال الرمز لرقم الجوال أو البريد الاحتياطي)
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string; success: boolean }> {
    const user = await this.findUserByIdentifier({
      phone: forgotPasswordDto.phone,
      email: forgotPasswordDto.email,
      identifier: forgotPasswordDto.identifier,
    });

    // رسالة عامة لمنع استكشاف أرقام الجوال والحسابات المسجلة
    if (!user) {
      return {
        message: 'إذا كان الحساب مسجلاً في النظام، فقد تم إرسال رمز إعادة تعيين كلمة المرور.',
        success: true,
      };
    }

    if (user.resetOtpLastSentAt) {
      const secondsSinceLastSent = (Date.now() - new Date(user.resetOtpLastSentAt).getTime()) / 1000;
      if (secondsSinceLastSent < 60) {
        const cooldownRemaining = Math.ceil(60 - secondsSinceLastSent);
        throw new BadRequestException(
          `يرجى الانتظار ${cooldownRemaining} ثانية قبل طلب رمز جديد.`,
        );
      }
    }

    const rawResetCode = crypto.randomInt(100000, 999999).toString();
    const hashedResetCode = this.hashOtp(rawResetCode);
    const resetOtpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.resetOtpCode = hashedResetCode;
    user.resetOtpExpiresAt = resetOtpExpiresAt;
    user.resetOtpLastSentAt = new Date();

    await this.userRepository.save(user);

    // محاكاة إرسال SMS باستعادة كلمة المرور
    console.log(`\n📱 [SMS/WhatsApp Gateway] ================================`);
    console.log(`📱 تم إرسال كود استعادة كلمة المرور إلى الجوال: ${user.phone}`);
    console.log(`🔑 كود الاستعادة هو: [ ${rawResetCode} ]`);
    console.log(`📱 ========================================================\n`);

    if (user.email) {
      try {
        await this.mailService.sendPasswordResetEmail(user.email, user.fullName, rawResetCode);
      } catch (err: any) {
        console.warn(`⚠️ تعذر إرسال إيميل الاستعادة الاحتياطي: ${err?.message || err}`);
      }
    }

    return {
      message: 'إذا كان الحساب مسجلاً في النظام، فقد تم إرسال رمز إعادة تعيين كلمة المرور.',
      success: true,
    };
  }

  /**
   * إعادة تعيين كلمة المرور برمز الـ OTP الجديد
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string; success: boolean }> {
    const rawOtpCode = resetPasswordDto.otpCode.trim();

    const user = await this.findUserByIdentifier(
      {
        phone: resetPasswordDto.phone,
        email: resetPasswordDto.email,
        identifier: resetPasswordDto.identifier,
      },
      { resetOtpCode: true },
    );

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود.');
    }

    if (!user.resetOtpExpiresAt || new Date() > user.resetOtpExpiresAt) {
      throw new BadRequestException('انتهت صلاحية رمز إعادة التعيين. يرجى طلب رمز جديد.');
    }

    const hashedInputOtp = this.hashOtp(rawOtpCode);
    if (!user.resetOtpCode || user.resetOtpCode !== hashedInputOtp) {
      throw new BadRequestException('رمز إعادة التعيين غير صحيح.');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    user.password = hashedPassword;
    user.resetOtpCode = null;
    user.resetOtpExpiresAt = null;
    user.resetOtpLastSentAt = null;

    await this.userRepository.save(user);

    return {
      message: 'تمت إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.',
      success: true,
    };
  }

  /**
   * جلب مستخدم حسب المعرف ID
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  /**
   * جلب مستخدم حسب رقم الجوال
   */
  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { phone: phone.trim() },
    });
  }

  /**
   * جلب مستخدم حسب البريد (Fallback)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  /**
   * جلب قائمة جميع المستخدمين (خاص بالإدارة العامة)
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
