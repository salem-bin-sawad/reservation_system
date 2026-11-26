import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReviewAction {
  CONFIRM = 'CONFIRM',
  REJECT = 'REJECT',
}

export class ReviewBookingDto {
  @ApiProperty({
    description: 'قرار المكتب بشأن الحجز والفاتورة (CONFIRM لتأكيد الحجز، REJECT لرفض الفاتورة)',
    enum: ReviewAction,
    example: ReviewAction.CONFIRM,
  })
  @IsNotEmpty({ message: 'القرار مطلوب' })
  @IsEnum(ReviewAction, { message: 'القرار يجب أن يكون CONFIRM أو REJECT' })
  action: ReviewAction;

  @ApiPropertyOptional({
    description: 'سبب الرفض (مطلوب ومهم في حال كان القرار REJECT ليظهر للمستخدم)',
    example: 'رقم الإشعار البنكي غير مطابق للمبلغ المطلوب، يرجى إعادة إرسال السند الصحيح.',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

