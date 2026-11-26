import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Booking, BookingStatus } from './entities/booking.entity.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UploadInvoiceDto } from './dto/upload-invoice.dto.js';
import { ReviewBookingDto, ReviewAction } from './dto/review-booking.dto.js';
import { Trip, TripStatus } from '../trips/entities/trip.entity.js';
import { UserRole } from '../users/entities/user.entity.js';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
  ) {}

  /**
   * توليد رقم حجز مميز وفريد
   */
  private generateBookingNumber(tripNumber: string): string {
    const randomSuffix = crypto.randomInt(1000, 9999);
    return `BK-${tripNumber}-${randomSuffix}`;
  }

  /**
   * إنشاء حجز رحلة جديد من قِبل المستخدم
   */
  async create(createBookingDto: CreateBookingDto, userId: string): Promise<Booking> {
    const trip = await this.tripRepository.findOne({
      where: { id: createBookingDto.tripId },
      relations: { service: true, office: true },
    });

    if (!trip) {
      throw new NotFoundException('الرحلة المطلوبة غير موجودة.');
    }

    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
      throw new BadRequestException('عذراً، هذه الرحلة غير متاحة للحجز حالياً (مكتملة أو ملغية).');
    }

    // التحقق من توفر المقاعد
    if (trip.availableSeats < createBookingDto.seatsCount) {
      throw new BadRequestException(
        `المقاعد المتاحة لا تكفي. المقاعد المتبقية في هذه الرحلة: ${trip.availableSeats} فقط.`,
      );
    }

    // الحساب المالي الدقيق
    const pricePerSeat = Number(trip.discountedPrice || trip.originalPrice);
    const totalAmount = pricePerSeat * createBookingDto.seatsCount;

    // خصم المقاعد المحجوزة من الرحلة
    trip.availableSeats -= createBookingDto.seatsCount;
    await this.tripRepository.save(trip);

    // تحديد الحالة المبدئية: إذا أرفق الفاتورة مباشرة تصبح قيد المراجعة، وإلا بانتظار السداد
    const hasInvoice = !!(createBookingDto.invoiceImage || createBookingDto.invoiceNumber);
    const initialStatus = hasInvoice
      ? BookingStatus.PAYMENT_UNDER_REVIEW
      : BookingStatus.PENDING_PAYMENT;

    const booking = this.bookingRepository.create({
      bookingNumber: this.generateBookingNumber(trip.tripNumber),
      userId,
      tripId: trip.id,
      seatsCount: createBookingDto.seatsCount,
      seatNumbers: createBookingDto.seatNumbers,
      passengers: createBookingDto.passengers,
      pricePerSeat,
      totalAmount,
      currency: trip.currency || 'SAR',
      paymentMethod: createBookingDto.paymentMethod || 'تحويل بنكي للحساب الرسمي',
      invoiceNumber: createBookingDto.invoiceNumber,
      invoiceImage: createBookingDto.invoiceImage,
      paymentNotes: createBookingDto.paymentNotes,
      paymentSentAt: hasInvoice ? new Date() : undefined,
      status: initialStatus,
    });

    return await this.bookingRepository.save(booking);
  }

  /**
   * إرفاق أو تحديث الفاتورة وسند التحويل للحجز
   */
  async uploadInvoice(
    bookingId: string,
    uploadInvoiceDto: UploadInvoiceDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: { trip: true, user: true },
    });

    if (!booking) {
      throw new NotFoundException('الحجز غير موجود.');
    }

    // التأكد أن الحجز يخص هذا المستخدم
    if (booking.userId !== userId) {
      throw new ForbiddenException('لا يمكنك تعديل أو رفع فاتورة لحجز لا يخصك.');
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException('تم تأكيد هذا الحجز مسبقاً بالفعل.');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('هذا الحجز ملغي، لا يمكن رفع فاتورة له.');
    }

    // إذا تم رفع ملف صورة فعلي عبر Multer
    if (file) {
      booking.invoiceImage = `/uploads/invoices/${file.filename}`;
    } else if (uploadInvoiceDto.invoiceImage) {
      booking.invoiceImage = uploadInvoiceDto.invoiceImage;
    }

    if (uploadInvoiceDto.invoiceNumber) {
      booking.invoiceNumber = uploadInvoiceDto.invoiceNumber;
    }

    if (uploadInvoiceDto.paymentMethod) {
      booking.paymentMethod = uploadInvoiceDto.paymentMethod;
    }

    if (uploadInvoiceDto.paymentNotes) {
      booking.paymentNotes = uploadInvoiceDto.paymentNotes;
    }

    // تحديث الحالة لتصبح قيد المراجعة وإلغاء سبب الرفض السابق إن وجد
    booking.status = BookingStatus.PAYMENT_UNDER_REVIEW;
    booking.paymentSentAt = new Date();
    booking.rejectionReason = undefined;

    return await this.bookingRepository.save(booking);
  }

  /**
   * مراجعة الحجز والفاتورة من قِبل المكتب (تأكيد أو رفض)
   */
  async reviewBooking(
    bookingId: string,
    reviewDto: ReviewBookingDto,
    officeId: string,
    userRole: UserRole,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: { trip: true, user: true },
    });

    if (!booking) {
      throw new NotFoundException('الحجز غير موجود.');
    }

    // التحقق من الصلاحية: المكتب صاحب الرحلة فقط أو الإدارة العامة
    if (userRole !== UserRole.ADMIN && booking.trip.officeId !== officeId) {
      throw new ForbiddenException('ليس لديك الصلاحية لمراجعة هذا الحجز؛ الرحلة تتبع مكتباً آخر.');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('هذا الحجز ملغي من قِبل العميل.');
    }

    if (reviewDto.action === ReviewAction.CONFIRM) {
      booking.status = BookingStatus.CONFIRMED;
      booking.confirmedAt = new Date();
      booking.rejectionReason = undefined;
    } else if (reviewDto.action === ReviewAction.REJECT) {
      if (!reviewDto.rejectionReason) {
        throw new BadRequestException('يرجى ذكر سبب رفض الفاتورة لتوضيحه للعميل.');
      }
      booking.status = BookingStatus.REJECTED;
      booking.rejectionReason = reviewDto.rejectionReason;

      // إعادة المقاعد إلى الرحلة تلقائياً
      booking.trip.availableSeats += booking.seatsCount;
      await this.tripRepository.save(booking.trip);
    }

    return await this.bookingRepository.save(booking);
  }

  /**
   * إلغاء الحجز من قِبل المستخدم
   */
  async cancel(bookingId: string, userId: string): Promise<{ message: string; booking: Booking }> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: { trip: true },
    });

    if (!booking) {
      throw new NotFoundException('الحجز غير موجود.');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('لا يمكنك إلغاء حجز لا يخصك.');
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'تم تأكيد الحجز ومطابقة الفاتورة بالفعل من قِبل المكتب؛ للإلغاء يرجى التواصل مع إدارة المكتب مباشرة.',
      );
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED) {
      throw new BadRequestException('الحجز ملغي أو مرفوض مسبقاً.');
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();

    // إعادة المقاعد للرحلة
    booking.trip.availableSeats += booking.seatsCount;
    await this.tripRepository.save(booking.trip);

    const saved = await this.bookingRepository.save(booking);

    return {
      message: 'تم إلغاء الحجز بنجاح وإعادة المقاعد لقائمة المتاح.',
      booking: saved,
    };
  }

  /**
   * جلب حجوزات المستخدم الحالي ("رحلاتي")
   */
  async findMyBookings(userId: string): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: { userId },
      relations: { trip: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * جلب حجوزات رحلات المكتب الحالي (خاص بالمكتب)
   */
  async findOfficeBookings(officeId: string): Promise<Booking[]> {
    return await this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.trip', 'trip')
      .innerJoinAndSelect('booking.user', 'user')
      .where('trip.office_id = :officeId', { officeId })
      .orderBy('booking.created_at', 'DESC')
      .getMany();
  }

  /**
   * جلب تفاصيل حجز محدد بالـ ID
   */
  async findOne(id: string, userId: string, userRole: UserRole): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: { trip: true, user: true },
    });

    if (!booking) {
      throw new NotFoundException('الحجز غير موجود.');
    }

    // السماح للمستخدم صاحب الحجز، أو المكتب صاحب الرحلة، أو الإدارة
    const isOwner = booking.userId === userId;
    const isTripOffice = booking.trip?.officeId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isTripOffice && !isAdmin) {
      throw new ForbiddenException('ليس لديك الصلاحية للاطلاع على هذا الحجز.');
    }

    return booking;
  }

  /**
   * جلب جميع الحجوزات في المنصة (خاص بالإدارة العامة)
   */
  async findAllAdmin(): Promise<Booking[]> {
    return await this.bookingRepository.find({
      relations: { trip: true, user: true },
      order: { createdAt: 'DESC' },
    });
  }
}

