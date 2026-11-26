import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PassengerDto {
  @ApiProperty({ description: 'اسم الراكب بالكامل', example: 'سارة المنصور' })
  @IsNotEmpty({ message: 'اسم الراكب مطلوب' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ description: 'رقم هاتف الراكب للتواصل', example: '+966541112233' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'رقم الهوية الوطنية أو جواز السفر', example: '1098765432' })
  @IsOptional()
  @IsString()
  identityNumber?: string;
}

export class CreateBookingDto {
  @ApiProperty({
    description: 'معرف الرحلة المراد حجزها (UUID)',
    example: '5e3c39c3-076c-47ad-8220-614239138c65',
  })
  @IsNotEmpty({ message: 'معرف الرحلة مطلوب' })
  @IsUUID('4', { message: 'معرف الرحلة غير صالح' })
  tripId: string;

  @ApiProperty({
    description: 'عدد المقاعد المطلوب حجزها',
    default: 1,
    example: 2,
  })
  @IsNotEmpty({ message: 'عدد المقاعد مطلوب' })
  @IsInt({ message: 'عدد المقاعد يجب أن يكون رقماً صحيحاً' })
  @Min(1, { message: 'يجب حجز مقعد واحد على الأقل' })
  seatsCount: number;

  @ApiPropertyOptional({
    description: 'أرقام المقاعد المرغوبة إن وجدت',
    example: '14, 15',
  })
  @IsOptional()
  @IsString()
  seatNumbers?: string;

  @ApiPropertyOptional({
    description: 'قائمة بيانات الركاب المسافرين',
    type: [PassengerDto],
    example: [
      { fullName: 'سارة المنصور', phone: '+966541112233', identityNumber: '1098765432' },
      { fullName: 'نورة المنصور', phone: '+966541112234', identityNumber: '1098765433' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers?: PassengerDto[];

  @ApiPropertyOptional({
    description: 'طريقة الدفع (تحويل بنكي، حوالة شبكة الكريمي/النجم، إيداع نقدي...)',
    default: 'تحويل بنكي للحساب الرسمي',
    example: 'تحويل بنكي - مصرف الراجحي',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'رقم الحوالة أو رقم الإشعار البنكي لسند الدفع',
    example: 'TRX-98472910',
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({
    description: 'رابط أو مسار صورة الفاتورة / سند التحويل (يمكن أيضاً رفعه كملف لاحقاً)',
    example: 'https://storage.example.com/invoices/receipt-123.jpg',
  })
  @IsOptional()
  @IsString()
  invoiceImage?: string;

  @ApiPropertyOptional({
    description: 'ملاحظات الدفع (اسم صاحب الحساب المحول منه، اسم الفرع...)',
    example: 'تم التحويل من حساب سارة المنصور إلى الحساب الرسمي للشركة',
  })
  @IsOptional()
  @IsString()
  paymentNotes?: string;
}

