import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiPropertyOptional({
    description: 'رقم الجوال الأساسي لتسجيل الدخول (الأساسي)',
    example: '+966550001122',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'البريد الإلكتروني (اختياري كـ Fallback في حال عدم توفر الجوال)',
    example: 'almotasader@reservation.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'المعرف الموحد: يقبل إما رقم الجوال أو البريد الإلكتروني مباشرة',
    example: '+966550001122',
  })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiProperty({
    description: 'كلمة المرور الخاصة بالحساب',
    example: 'Password@123',
  })
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @IsString({ message: 'كلمة المرور يجب أن تكون نصاً' })
  password: string;
}
