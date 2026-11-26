import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiPropertyOptional({
    description: 'رقم الجوال المراد تفعيله (الأساسي)',
    example: '+966550001122',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'أو البريد الإلكتروني (Fallback)',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'أو المعرف الموحد (جوال أو إيميل)',
    example: '+966550001122',
  })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiProperty({
    description: 'رمز التحقق (OTP) المكون من 6 أرقام',
    example: '123456',
  })
  @IsNotEmpty({ message: 'رمز التحقق (OTP) مطلوب' })
  @IsString()
  @Length(6, 6, { message: 'رمز التحقق يجب أن يتكون من 6 أرقام' })
  otpCode: string;
}
