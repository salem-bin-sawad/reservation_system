import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiPropertyOptional({
    description: 'رقم الجوال المسجل في النظام (الأساسي لإرسال رمز الاستعادة)',
    example: '+966550001122',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'أو البريد الإلكتروني المسجل في النظام (Fallback)',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'أو المعرف الموحد (يقبل جوال أو إيميل)',
    example: '+966550001122',
  })
  @IsOptional()
  @IsString()
  identifier?: string;
}
