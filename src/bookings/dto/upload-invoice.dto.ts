import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadInvoiceDto {
  @ApiPropertyOptional({
    description: 'رقم الفاتورة أو رقم الحوالة أو الإشعار البنكي',
    example: 'TRX-98472910',
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({
    description: 'رابط صورة الفاتورة (أو يتم رفع الملف مباشرة عبر الـ form-data)',
    example: 'https://storage.example.com/invoices/receipt-123.jpg',
  })
  @IsOptional()
  @IsString()
  invoiceImage?: string;

  @ApiPropertyOptional({
    description: 'طريقة الدفع المستخدمة',
    example: 'حوالة شبكة الكريمي',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'ملاحظات وتفاصيل الدفع (اسم المودع، البنك، رقم العملية)',
    example: 'تم الإيداع عبر حساب مصرف الراجحي، اسم المودع: سارة المنصور',
  })
  @IsOptional()
  @IsString()
  paymentNotes?: string;
}

