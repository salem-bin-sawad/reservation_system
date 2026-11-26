import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  IsEnum,
  IsDateString,
  Min,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '../entities/trip.entity.js';

export class UpdateTripDto {
  @ApiPropertyOptional({ description: 'مدينة الانطلاق', example: 'عدن' })
  @IsOptional()
  @IsString()
  fromCity?: string;

  @ApiPropertyOptional({ description: 'مدينة الوصول', example: 'الدمام' })
  @IsOptional()
  @IsString()
  toCity?: string;

  @ApiPropertyOptional({ description: 'المسار الكامل', example: 'عدن - الرياض - الدمام' })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({ description: 'تاريخ المغادرة', example: '2026-11-20' })
  @IsOptional()
  @IsDateString({}, { message: 'صيغة تاريخ المغادرة غير صحيحة (YYYY-MM-DD)' })
  departureDate?: string;

  @ApiPropertyOptional({ description: 'وقت المغادرة', example: '13:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'صيغة وقت المغادرة غير صحيحة (HH:mm)',
  })
  departureTime?: string;

  @ApiPropertyOptional({ description: 'السعر الأساسي', example: 300 })
  @IsOptional()
  @IsNumber({}, { message: 'السعر الأصلي يجب أن يكون رقماً' })
  @Min(0)
  originalPrice?: number;

  @ApiPropertyOptional({ description: 'سعر الخصم', example: 279 })
  @IsOptional()
  @IsNumber({}, { message: 'سعر الخصم يجب أن يكون رقماً' })
  @Min(0)
  discountedPrice?: number;

  @ApiPropertyOptional({ description: 'إجمالي المقاعد', example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalSeats?: number;

  @ApiPropertyOptional({ description: 'المقاعد المتاحة', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  availableSeats?: number;

  @ApiPropertyOptional({
    description: 'حالة الرحلة',
    enum: TripStatus,
    example: TripStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(TripStatus, { message: 'حالة الرحلة غير صالحة' })
  status?: TripStatus;

  @ApiPropertyOptional({ description: 'اسم السائق', example: 'سائق شركة المتصدر' })
  @IsOptional()
  @IsString()
  driverName?: string;

  @ApiPropertyOptional({ description: 'صورة المركبة', example: 'https://images.unsplash.com/...' })
  @IsOptional()
  @IsString()
  vehicleImage?: string;

  @ApiPropertyOptional({ description: 'نوع وطراز المركبة', example: 'باص مرسيدس ترافجو VIP' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ description: 'ملاحظات إضافية', example: 'تم تحديث توقيت الانطلاق.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
