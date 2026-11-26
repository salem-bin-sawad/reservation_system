import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity.js';

export class CreateUserDto {
  @ApiProperty({
    description: 'الاسم الكامل للمستخدم أو اسم مسؤول المكتب',
    example: 'أحمد صالح المتصدر',
  })
  @IsNotEmpty({ message: 'الاسم الكامل مطلوب' })
  @IsString({ message: 'الاسم الكامل يجب أن يكون نصاً' })
  fullName: string;

  @ApiProperty({
    description: 'رقم الجوال (المعرف الأساسي للحساب وتسجيل الدخول)',
    example: '+966550001122',
  })
  @IsNotEmpty({ message: 'رقم الجوال مطلوب للتسجيل' })
  @IsString({ message: 'رقم الجوال يجب أن يكون نصاً' })
  phone: string;

  @ApiPropertyOptional({
    description: 'البريد الإلكتروني (اختياري - كـ fallback احتياطي للإشعارات واستعادة الحساب)',
    example: 'almotasader@reservation.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'صيغة البريد الإلكتروني غير صحيحة' })
  email?: string;

  @ApiProperty({
    description: 'كلمة المرور (يجب أن تحتوي على حرف كبير وصغير ورقم أو رمز، ولا تقل عن 8 خانات)',
    example: 'Password@123',
  })
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @MinLength(8, { message: 'يجب أن لا تقل كلمة المرور عن 8 خانات' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم أو رمز خاص على الأقل',
  })
  password: string;

  @ApiPropertyOptional({
    description: 'دور الحساب في النظام (user: مستخدم عادي, office: مكتب ومزود خدمة, admin: إدارة عامة)',
    enum: UserRole,
    default: UserRole.USER,
    example: UserRole.OFFICE,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'الدور المحدد غير صالح. الأدوار المتاحة: user, office, admin' })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'اسم المكتب التجاري (خاص بحسابات المكاتب office)',
    example: 'شركة المتصدر للنقل الدولي',
  })
  @IsOptional()
  @IsString()
  officeName?: string;

  @ApiPropertyOptional({
    description: 'رقم السجل التجاري أو ترخيص النقل',
    example: '1010998877',
  })
  @IsOptional()
  @IsString()
  commercialRegistration?: string;

  @ApiPropertyOptional({
    description: 'المدينة الرئيسية للمكتب أو المستخدم',
    example: 'عدن',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'العنوان التفصيلي للمكتب',
    example: 'الشارع الرئيسي، حي المعلا',
  })
  @IsOptional()
  @IsString()
  address?: string;
}
