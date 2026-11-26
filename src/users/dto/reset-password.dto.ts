import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiPropertyOptional({
    description: 'رقم الجوال المسجل',
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
    description: 'أو المعرف الموحد',
    example: '+966550001122',
  })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiProperty({
    description: 'رمز استعادة كلمة المرور المكون من 6 أرقام',
    example: '654321',
  })
  @IsNotEmpty({ message: 'رمز التحقق مطلوب' })
  @IsString()
  @Length(6, 6, { message: 'رمز التحقق يجب أن يتكون من 6 أرقام' })
  otpCode: string;

  @ApiProperty({
    description: 'كلمة المرور الجديدة (تحتوي على حرف كبير وصغير ورقم أو رمز، ولا تقل عن 8 خانات)',
    example: 'NewSecurePassword@2026',
  })
  @IsNotEmpty({ message: 'كلمة المرور الجديدة مطلوبة' })
  @MinLength(8, { message: 'يجب أن لا تقل كلمة المرور عن 8 خانات' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم أو رمز خاص على الأقل',
  })
  newPassword: string;
}
