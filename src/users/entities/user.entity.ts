import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UserRole {
  USER = 'user',     // مستخدم عادي (تصفح، طلب خدمات، حجوزات)
  OFFICE = 'office', // المكاتب (الأشخاص الذين يوفرون الخدمة)
  ADMIN = 'admin',   // الإدارة العامة للنظام (كامل الصلاحيات)
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ----------------------------------------------------
  // بيانات الحساب الأساسية
  // ----------------------------------------------------
  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  phone: string; // رقم الجوال (المعرف الأساسي للحساب وتسجيل الدخول)

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email?: string; // البريد الإلكتروني (اختياري / كـ fallback احتياطي)

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  // ----------------------------------------------------
  // بيانات خاصة بالمكاتب / مزودي الخدمة (اختيارية للمستخدم العادي)
  // ----------------------------------------------------
  @Column({ name: 'office_name', type: 'varchar', length: 255, nullable: true })
  officeName?: string;

  @Column({ name: 'commercial_registration', type: 'varchar', length: 100, nullable: true })
  commercialRegistration?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  // ----------------------------------------------------
  // التحقق عبر رمز OTP وحالة الحساب
  // ----------------------------------------------------
  @Column({ name: 'otp_code', type: 'varchar', length: 255, nullable: true, select: false })
  otpCode?: string | null;

  @Column({ name: 'otp_expires_at', type: 'timestamp', nullable: true })
  otpExpiresAt?: Date | null;

  @Column({ name: 'otp_last_sent_at', type: 'timestamp', nullable: true })
  otpLastSentAt?: Date | null;

  @Column({ name: 'otp_attempts', type: 'int', default: 0 })
  otpAttempts: number;

  // ----------------------------------------------------
  // استعادة كلمة المرور
  // ----------------------------------------------------
  @Column({ name: 'reset_otp_code', type: 'varchar', length: 255, nullable: true, select: false })
  resetOtpCode?: string | null;

  @Column({ name: 'reset_otp_expires_at', type: 'timestamp', nullable: true })
  resetOtpExpiresAt?: Date | null;

  @Column({ name: 'reset_otp_last_sent_at', type: 'timestamp', nullable: true })
  resetOtpLastSentAt?: Date | null;

  @Column({ name: 'is_phone_verified', type: 'boolean', default: false })
  isPhoneVerified: boolean;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
