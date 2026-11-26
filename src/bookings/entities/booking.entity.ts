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
import type { User } from '../../users/entities/user.entity.js';
import type { Trip } from '../../trips/entities/trip.entity.js';

export enum BookingStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',           // بانتظار سداد وإرفاق الفاتورة
  PAYMENT_UNDER_REVIEW = 'PAYMENT_UNDER_REVIEW', // تم إرسال الفاتورة وقيد مراجعة المكتب
  CONFIRMED = 'CONFIRMED',                       // تم التحقق من الفاتورة وتأكيد الحجز
  REJECTED = 'REJECTED',                         // تم رفض الفاتورة / الحجز
  CANCELLED = 'CANCELLED',                       // تم إلغاء الحجز من المستخدم
}

export interface PassengerInfo {
  fullName: string;
  phone?: string;
  identityNumber?: string; // رقم الهوية أو جواز السفر
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_number', type: 'varchar', length: 50, unique: true })
  bookingNumber: string; // مثل BK-93726-1049

  // ───────── المستخدم صاحب الحجز ─────────
  @ManyToOne('User', { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ name: 'user_id' })
  userId: string;

  // ───────── الرحلة المحجوزة ─────────
  @ManyToOne('Trip', { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Relation<Trip>;

  @Column({ name: 'trip_id' })
  tripId: string;

  // ───────── تفاصيل المقاعد والركاب ─────────
  @Column({ name: 'seats_count', type: 'int', default: 1 })
  seatsCount: number; // عدد المقاعد

  @Column({ name: 'seat_numbers', type: 'varchar', length: 150, nullable: true })
  seatNumbers?: string; // أرقام المقاعد إن وجدت مثل: "12, 13"

  @Column({ type: 'jsonb', nullable: true })
  passengers?: PassengerInfo[]; // بيانات الركاب

  // ───────── الحساب المالي ─────────
  @Column({ name: 'price_per_seat', type: 'decimal', precision: 10, scale: 2 })
  pricePerSeat: number; // سعر المقعد وقت الحجز

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number; // إجمالي المبلغ المطلوب

  @Column({ type: 'varchar', length: 10, default: 'SAR' })
  currency: string;

  // ───────── بيانات الفاتورة وسند التحويل ─────────
  @Column({ name: 'payment_method', type: 'varchar', length: 100, default: 'BANK_TRANSFER' })
  paymentMethod: string; // تحويل بنكي، حوالة شبكة، إيداع نقدي...

  @Column({ name: 'invoice_image', type: 'varchar', length: 500, nullable: true })
  invoiceImage?: string; // صورة أو ملف الفاتورة / سند التحويل

  @Column({ name: 'invoice_number', type: 'varchar', length: 100, nullable: true })
  invoiceNumber?: string; // رقم الحوالة أو رقم الإشعار البنكي

  @Column({ name: 'payment_notes', type: 'text', nullable: true })
  paymentNotes?: string; // ملاحظات الدفع (اسم المحول / اسم البنك / الشبكة)

  @Column({ name: 'payment_sent_at', type: 'timestamp', nullable: true })
  paymentSentAt?: Date; // وقت إرسال الفاتورة

  // ───────── حالة الحجز والمراجعة ─────────
  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING_PAYMENT,
  })
  status: BookingStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string; // سبب الرفض في حال كانت الفاتورة غير صحيحة

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

