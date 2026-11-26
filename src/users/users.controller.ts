import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { RateLimiterGuard } from '../common/guards/rate-limiter.guard.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from './entities/user.entity.js';

@ApiTags('المصادقة والمستخدمين (Auth & Users)')
@Controller('users')
@UseGuards(RateLimiterGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('check-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'فحص توفر رقم الجوال (المعرف الأساسي)',
    description: 'التحقق مما إذا كان رقم الجوال متاحاً للتسجيل أو مستخدماً مسبقاً قبل إكمال نموذج التسجيل.',
  })
  @ApiResponse({ status: 200, description: 'رقم الجوال متاح أو مستخدم بالفعل.' })
  async checkPhone(@Body('phone') phone: string) {
    return this.usersService.checkPhoneAvailability(phone);
  }

  @Post('check-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'فحص توفر البريد الإلكتروني (Fallback اختياري)',
    description: 'التحقق مما إذا كان البريد الإلكتروني متاحاً كبريد احتياطي أو مستخدماً مسبقاً.',
  })
  @ApiResponse({ status: 200, description: 'البريد متاح أو مستخدم بالفعل.' })
  async checkEmail(@Body('email') email: string) {
    return this.usersService.checkEmailAvailability(email);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'تسجيل حساب جديد وتوليد رمز OTP برقم الجوال',
    description: 'تسجيل مستخدم عادي (user) أو مكتب (office) أو مشرف (admin) بواسطة رقم الجوال الإلزامي والبريد الاختياري كـ fallback، مع إرسال كود OTP لتفعيل الجوال والحساب.',
  })
  @ApiResponse({ status: 201, description: 'تم إنشاء الحساب بنجاح وتوليد كود التحقق (OTP).' })
  @ApiResponse({ status: 409, description: 'رقم الجوال أو البريد مسجل مسبقاً.' })
  async signup(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.signup(createUserDto);
    return {
      message: 'تم تسجيل الحساب بنجاح. يرجى تفعيل رقم الجوال برمز التحقق (OTP).',
      user,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'تسجيل الدخول برقم الجوال (مع دعم البريد كـ Fallback) وإصدار توكن JWT',
    description: 'تسجيل الدخول الأساسي يتم عبر رقم الجوال وكلمة المرور، أو عبر البريد الإلكتروني الاحتياطي. يعيد توكن JWT يحتوي على صلاحيات المستخدم (user, office, admin).',
  })
  @ApiResponse({ status: 200, description: 'تم تسجيل الدخول بنجاح مع إرجاع accessToken.' })
  @ApiResponse({ status: 401, description: 'بيانات الدخول غير صحيحة أو الحساب غير مفعل.' })
  async login(@Body() loginDto: LoginDto) {
    return this.usersService.login(loginDto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'تفعيل الحساب ورقم الجوال برمز OTP',
    description: 'التحقق من كود الـ 6 أرقام المشفر بـ SHA-256، مع التحقق من صلاحية الوقت (15 دقيقة) وحد أقصى 5 محاولات لمنع التخمين.',
  })
  @ApiResponse({ status: 200, description: 'تم تفعيل رقم الجوال والحساب بنجاح.' })
  @ApiResponse({ status: 400, description: 'كود التحقق غير صحيح أو منتهي الصلاحية.' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.usersService.verifyOtp(verifyOtpDto);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'إعادة إرسال رمز التحقق OTP إلى الجوال',
    description: 'إعادة إرسال كود تحقق جديد إلى رقم الجوال مع مهلة أمان مضادة للسبام (60 ثانية بين كل طلب).',
  })
  @ApiResponse({ status: 200, description: 'تم إرسال كود جديد بنجاح.' })
  @ApiResponse({ status: 400, description: 'يجب الانتظار قبل طلب كود جديد.' })
  async resendOtp(
    @Body('phone') phone?: string,
    @Body('identifier') identifier?: string,
    @Body('email') email?: string,
  ) {
    return this.usersService.resendOtp(phone || identifier || email || '');
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'طلب استعادة كلمة المرور عبر الجوال (أو البريد)',
    description: 'إرسال كود OTP مخصص لاستعادة كلمة المرور إلى رقم الجوال المسجل في النظام (أو البريد الإلكتروني).',
  })
  @ApiResponse({ status: 200, description: 'تم إرسال رمز استعادة كلمة المرور.' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.usersService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'تعيين كلمة المرور الجديدة بعد التحقق من الرمز',
    description: 'التحقق من كود الاستعادة وتعيين كلمة المرور الجديدة وتشفيرها بنجاح.',
  })
  @ApiResponse({ status: 200, description: 'تمت إعادة تعيين كلمة المرور بنجاح.' })
  @ApiResponse({ status: 400, description: 'رمز الاستعادة غير صحيح أو منتهي الصلاحية.' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.usersService.resetPassword(resetPasswordDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'الملف الشخصي للمستخدم الحالي',
    description: 'جلب بيانات الحساب الحالي المسجل دخوله عبر استخراج الـ ID من توكن الـ JWT.',
  })
  @ApiResponse({ status: 200, description: 'بيانات الحساب الشخصي.' })
  @ApiResponse({ status: 401, description: 'غير مصرح (التوكن مفقود أو غير صالح).' })
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'استعراض كل المستخدمين (إدارة النظام فقط)',
    description: 'جلب قائمة كاملة بجميع المستخدمين والمكاتب والمشرفين المسجلين في النظام. خاص بحساب الإدارة (admin).',
  })
  @ApiResponse({ status: 200, description: 'قائمة جميع المستخدمين.' })
  @ApiResponse({ status: 403, description: 'غير مصرح به (خاص بالإدارة فقط).' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'جلب بيانات مستخدم محدد بالـ ID',
    description: 'جلب بيانات مستخدم أو مكتب عبر معرّف الـ UUID.',
  })
  @ApiParam({ name: 'id', description: 'معرف المستخدم (UUID)', example: '3cec9863-ceb9-45f0-872e-59f3b43d5eed' })
  @ApiResponse({ status: 200, description: 'بيانات المستخدم.' })
  @ApiResponse({ status: 404, description: 'المستخدم غير موجود.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }
}
