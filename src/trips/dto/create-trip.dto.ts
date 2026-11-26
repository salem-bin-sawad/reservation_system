import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  IsEnum,
  IsDateString,
  Min,
  Matches,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '../entities/trip.entity.js';

export class CreateTripDto {
  @ApiProperty({
    description: 'معرف الخدمة (UUID) التابعة لها الرحلة (مثل معرف خدمة النقل الدولي)',
    example: '3831d80b-9e13-40c5-8ab0-9afd0ed80edf',
  })
  @IsNotEmpty({ message: 'معرف الخدمة مطلوب' })
  @IsUUID('4', { message: 'معرف الخدمة غير صالح' })
  serviceId: string;

  @ApiProperty({
    description: 'مدينة الانطلاق / المغادرة',
    example: 'عدن',
  })
  @IsNotEmpty({ message: 'مدينة المغادرة مطلوبة' })
  @IsString()
  fromCity: string;

  @ApiProperty({
    description: 'مدينة الوصول النهائية',
    example: 'الدمام',
  })
  @IsNotEmpty({ message: 'مدينة الوصول مطلوبة' })
  @IsString()
  toCity: string;

  @ApiProperty({
    description: 'خط المسار الكامل ومحطات التوقف',
    example: 'عدن - الرياض - الدمام',
  })
  @IsNotEmpty({ message: 'المسار مطلوب' })
  @IsString()
  route: string;

  @ApiProperty({
    description: 'تاريخ انطلاق الرحلة (صيغة YYYY-MM-DD)',
    example: '2026-11-20',
  })
  @IsNotEmpty({ message: 'تاريخ المغادرة مطلوب' })
  @IsDateString({}, { message: 'صيغة تاريخ المغادرة غير صحيحة (YYYY-MM-DD)' })
  departureDate: string;

  @ApiProperty({
    description: 'وقت انطلاق الرحلة (صيغة 24 ساعة HH:mm)',
    example: '13:00',
  })
  @IsNotEmpty({ message: 'وقت المغادرة مطلوب' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'صيغة وقت المغادرة غير صحيحة (HH:mm)',
  })
  departureTime: string;

  @ApiProperty({
    description: 'السعر الأساسي للتذكرة',
    example: 300,
  })
  @IsNotEmpty({ message: 'السعر الأصلي مطلوب' })
  @IsNumber({}, { message: 'السعر الأصلي يجب أن يكون رقماً' })
  @Min(0)
  originalPrice: number;

  @ApiPropertyOptional({
    description: 'سعر التذكرة بعد الخصم أو العرض الخاص (اختياري)',
    example: 279,
  })
  @IsOptional()
  @IsNumber({}, { message: 'سعر الخصم يجب أن يكون رقماً' })
  @Min(0)
  discountedPrice?: number;

  @ApiPropertyOptional({
    description: 'رمز العملة (افتراضياً SAR)',
    default: 'SAR',
    example: 'SAR',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'إجمالي عدد المقاعد في المركبة/الحافلة',
    example: 50,
  })
  @IsNotEmpty({ message: 'إجمالي المقاعد مطلوب' })
  @IsInt({ message: 'إجمالي المقاعد يجب أن يكون عدداً صحيحاً' })
  @Min(1)
  totalSeats: number;

  @ApiPropertyOptional({
    description: 'عدد المقاعد الشاغرة حالياً للحجز (إذا تُرك فارغاً يساوي إجمالي المقاعد)',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  availableSeats?: number;

  @ApiPropertyOptional({
    description: 'حالة الرحلة (DRAFT: مسودة, UPCOMING: قادمة ومتاحة للحجز, STARTED: بدأت, COMPLETED: مكتملة, CANCELLED: ملغية)',
    enum: TripStatus,
    default: TripStatus.UPCOMING,
    example: TripStatus.UPCOMING,
  })
  @IsOptional()
  @IsEnum(TripStatus, { message: 'حالة الرحلة غير صالحة' })
  status?: TripStatus;

  @ApiPropertyOptional({
    description: 'اسم السائق أو لقب السائق المعتمد',
    example: 'سائق شركة المتصدر',
  })
  @IsOptional()
  @IsString()
  driverName?: string;

  @ApiPropertyOptional({
    description: 'رابط صورة المركبة أو الحافلة',
    example: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957',
  })
  @IsOptional()
  @IsString()
  vehicleImage?: string;

  @ApiPropertyOptional({
    description: 'نوع وطراز المركبة',
    example: 'حافلة VIP مرسيدس ترافجو',
  })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({
    description: 'اسم الراكب (في حال كانت التذكرة مستوردة من نظام خارجي)',
    example: 'علي سالم العمري',
  })
  @IsOptional()
  @IsString()
  passengerName?: string;

  @ApiPropertyOptional({
    description: 'تاريخ إصدار التذكرة من النظام المصدر (YYYY-MM-DD)',
    example: '2026-11-20',
  })
  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @ApiPropertyOptional({
    description: 'مصدر الحجز أو نقطة البيع أو النظام المستورد منه (TheSource)',
    example: 'فرع الروابي - الرياض',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'ملاحظات إضافية وتعليمات الحجز والدفع',
    example: 'التذكرة بسعر الشركة... والدفع إلى الحساب الرسمي. تشمل وجبة خفيفة وواي فاي.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
