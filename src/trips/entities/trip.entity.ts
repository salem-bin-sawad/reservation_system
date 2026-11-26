import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { Service } from '../../services/entities/service.entity.js';
import type { User } from '../../users/entities/user.entity.js';

export enum TripStatus {
  DRAFT = 'DRAFT',             // مسودة (مستوردة من إكسل أو قيد التجهيز بانتظار النشر)
  UPCOMING = 'UPCOMING',       // لم تبدأ بعد
  STARTED = 'STARTED',         // الرحلة بدأت
  COMPLETED = 'COMPLETED',     // مكتملة
  CANCELLED = 'CANCELLED',     // ملغية
}

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trip_number', type: 'varchar', length: 50, unique: true })
  tripNumber: string; // رقم الرحلة مثل 93726-0

  // ───────── العلاقات ─────────
  @ManyToOne('Service', 'trips', { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: Relation<Service>;

  @Column({ name: 'service_id' })
  serviceId: string;

  @ManyToOne('User', { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'office_id' })
  office: Relation<User>;

  @Column({ name: 'office_id' })
  officeId: string;

  // ───────── بيانات المسار ─────────
  @Column({ name: 'from_city', type: 'varchar', length: 100 })
  fromCity: string; // مدينة المغادرة

  @Column({ name: 'to_city', type: 'varchar', length: 100 })
  toCity: string; // مدينة الوصول

  @Column({ type: 'varchar', length: 500 })
  route: string; // المسار الكامل مثل: "عدن - الرياض - الدمام"

  // ───────── التاريخ والوقت ─────────
  @Column({ name: 'departure_date', type: 'date' })
  departureDate: string; // تاريخ المغادرة

  @Column({ name: 'departure_time', type: 'time' })
  departureTime: string; // وقت المغادرة مثل "13:00"

  // ───────── التسعير ─────────
  @Column({ name: 'original_price', type: 'decimal', precision: 10, scale: 2 })
  originalPrice: number; // السعر الأصلي

  @Column({ name: 'discounted_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountedPrice?: number; // السعر بعد الخصم (اختياري)

  @Column({ type: 'varchar', length: 10, default: 'SAR' })
  currency: string; // العملة

  // ───────── المقاعد ─────────
  @Column({ name: 'total_seats', type: 'int' })
  totalSeats: number; // إجمالي المقاعد

  @Column({ name: 'available_seats', type: 'int' })
  availableSeats: number; // المقاعد المتاحة

  // ───────── حالة الرحلة ─────────
  @Column({
    type: 'enum',
    enum: TripStatus,
    default: TripStatus.UPCOMING,
  })
  status: TripStatus;

  // ───────── التقييم ─────────
  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0 })
  rating: number;

  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount: number;

  // ───────── بيانات السائق والمركبة ─────────
  @Column({ name: 'driver_name', type: 'varchar', length: 150, nullable: true })
  driverName?: string;

  @Column({ name: 'vehicle_image', type: 'varchar', length: 500, nullable: true })
  vehicleImage?: string; // رابط صورة المركبة

  @Column({ name: 'vehicle_type', type: 'varchar', length: 100, nullable: true })
  vehicleType?: string; // نوع المركبة (باص، ميني باص، سيارة...)

  // ───────── بيانات الاستيراد من إكسل / التذاكر (Excel Import Metadata) ─────────
  @Column({ name: 'passenger_name', type: 'varchar', length: 255, nullable: true })
  passengerName?: string; // اسم الراكب (إذا كانت تذكرة مستوردة)

  @Column({ name: 'issued_date', type: 'date', nullable: true })
  issuedDate?: string; // تاريخ إصدار التذكرة من ملف الإكسل

  @Column({ name: 'source', type: 'varchar', length: 255, nullable: true })
  source?: string; // مصدر الحجز أو نقطة البيع أو النظام المستورد منه (TheSource)

  // ───────── ملاحظات ─────────
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
