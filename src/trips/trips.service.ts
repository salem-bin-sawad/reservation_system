import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as crypto from 'crypto';
import * as XLSX from 'xlsx';
import { Trip, TripStatus } from './entities/trip.entity.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';
import { Service } from '../services/entities/service.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * توليد رقم رحلة فريد
   */
  private generateTripNumber(): string {
    const num = crypto.randomInt(10000, 99999);
    const suffix = crypto.randomInt(0, 9);
    return `${num}-${suffix}`;
  }

  /**
   * تحليل التواريخ الواردة من ملف الإكسل (سواء كانت نص أو رقم تسلسلي لإكسل أو كائن Date)
   */
  private parseExcelDate(val: any): string {
    if (!val) {
      // تاريخ افتراضي: بعد يوم من الآن
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    }

    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }

    if (typeof val === 'number') {
      // تحويل الرقم التسلسلي لإكسل إلى تاريخ
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }

    const str = String(val).trim();

    // فحص صيغة YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // فحص صيغة DD/MM/YYYY أو DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // فحص صيغة YYYY/MM/DD
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // محاولة أخيرة عبر Date.parse
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    return fallback.toISOString().split('T')[0];
  }

  /**
   * استخراج مدينتي الانطلاق والوصول من نص المسار (RoutList)
   */
  private parseRoute(rawRoute: string): { fromCity: string; toCity: string; route: string } {
    if (!rawRoute || !rawRoute.trim()) {
      return { fromCity: 'غير محدد', toCity: 'غير محدد', route: 'مسار غير محدد' };
    }

    const cleanRoute = rawRoute.trim();
    // التقسيم بواسطة: - أو – أو — أو > أو , أو / أو "إلى" أو "to"
    const parts = cleanRoute
      .split(/\s*[-–—>,\/]\s*|\s+إلى\s+|\s+to\s+/i)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      return {
        fromCity: parts[0],
        toCity: parts[parts.length - 1],
        route: cleanRoute,
      };
    }

    return {
      fromCity: cleanRoute,
      toCity: cleanRoute,
      route: cleanRoute,
    };
  }

  /**
   * إنشاء رحلة جديدة يدوياً (خاص بالمكاتب)
   */
  async create(createTripDto: CreateTripDto, officeId: string): Promise<Trip> {
    // التحقق من وجود الخدمة
    const service = await this.serviceRepository.findOne({
      where: { id: createTripDto.serviceId, isActive: true },
      relations: { offices: true },
    });
    if (!service) {
      throw new NotFoundException('الخدمة غير موجودة أو غير فعالة.');
    }

    // التحقق أن المكتب مسجل في هذه الخدمة
    const isRegistered = service.offices.some((o) => o.id === officeId);
    if (!isRegistered) {
      throw new ForbiddenException('يجب التسجيل في هذه الخدمة أولاً قبل إنشاء رحلة.');
    }

    // التحقق من تاريخ المغادرة (يجب أن يكون في المستقبل إلا إذا كانت مسودة)
    if (createTripDto.status !== TripStatus.DRAFT) {
      const depDate = new Date(createTripDto.departureDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (depDate < today) {
        throw new BadRequestException('تاريخ المغادرة يجب أن يكون اليوم أو في المستقبل.');
      }
    }

    const trip = this.tripRepository.create({
      ...createTripDto,
      tripNumber: this.generateTripNumber(),
      officeId,
      availableSeats: createTripDto.availableSeats ?? createTripDto.totalSeats,
      status: createTripDto.status ?? TripStatus.UPCOMING,
    });

    return await this.tripRepository.save(trip);
  }

  /**
   * سحب واستيراد الرحلات من ملف إكسل وإنشاؤها كـ "مسودة" (DRAFT)
   * الحقول المدعومة:
   * TicketNumber, PassengerName, IssuedDate, Date, RoutList, Price, Currency, TheSource
   */
  async importFromExcel(
    fileBuffer: Buffer,
    officeId: string,
    options?: { serviceId?: string; defaultSeats?: number },
  ): Promise<{
    message: string;
    totalRows: number;
    importedCount: number;
    failedCount: number;
    draftTrips: Trip[];
    errors: { row: number; error: string; data?: any }[];
  }> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('الملف المرفوع فارغ.');
    }

    // 1. قراءة محتوى ملف الإكسل عبر XLSX
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException('تعذر قراءة ملف الإكسل. يرجى التأكد من صيغة الملف (.xlsx أو .xls أو .csv).');
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new BadRequestException('ملف الإكسل لا يحتوي على أي ورقة عمل.');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      throw new BadRequestException('ورقة العمل لا تحتوي على بيانات لاستيرادها.');
    }

    // 2. تحديد الخدمة المرتبطة بالمكتب
    let targetServiceId = options?.serviceId;
    if (targetServiceId) {
      const service = await this.serviceRepository.findOne({
        where: { id: targetServiceId, isActive: true },
        relations: { offices: true },
      });
      if (!service) {
        throw new NotFoundException('الخدمة المحددة غير موجودة.');
      }
      const isRegistered = service.offices.some((o) => o.id === officeId);
      if (!isRegistered) {
        throw new ForbiddenException('المكتب غير مسجل في هذه الخدمة.');
      }
    } else {
      // اختيار أول خدمة مسجل بها هذا المكتب تلقائياً
      const officeServices = await this.serviceRepository
        .createQueryBuilder('service')
        .innerJoin('service.offices', 'office', 'office.id = :officeId', { officeId })
        .where('service.isActive = true')
        .getMany();

      if (officeServices.length > 0) {
        targetServiceId = officeServices[0].id;
      } else {
        // إذا لم يكن مسجلاً بأي خدمة، نربطه بأول خدمة عامة فعالة
        const defaultService = await this.serviceRepository.findOne({
          where: { isActive: true },
        });
        if (!defaultService) {
          throw new BadRequestException('لا توجد أي خدمات متاحة في النظام لربط الرحلات بها.');
        }
        targetServiceId = defaultService.id;
      }
    }

    const defaultSeats = options?.defaultSeats || 50;
    const draftTrips: Trip[] = [];
    const errors: { row: number; error: string; data?: any }[] = [];

    // 3. معالجة الصفوف وحفظها كمسودة (DRAFT)
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 2; // رقم الصف في ملف الإكسل بعد صف العناوين

      try {
        // مطابقة الحقول بمرونة مع دعم الأحرف الكبيرة والصغيرة والأسماء البديلة
        const ticketNumberRaw = (
          row['TicketNumber'] ??
          row['ticket_number'] ??
          row['ticketNumber'] ??
          row['Ticket'] ??
          row['رقم التذكرة'] ??
          row['رقم الرحلة'] ??
          ''
        )
          .toString()
          .trim();

        const passengerName =
          (
            row['PassengerName'] ??
            row['passenger_name'] ??
            row['passengerName'] ??
            row['Passenger'] ??
            row['اسم الراكب'] ??
            row['الراكب'] ??
            ''
          )
            .toString()
            .trim() || null;

        const issuedDateRaw =
          row['IssuedDate'] ??
          row['issued_date'] ??
          row['issuedDate'] ??
          row['تاريخ الإصدار'] ??
          row['تاريخ الاصدار'] ??
          null;

        const dateRaw =
          row['Date'] ??
          row['date'] ??
          row['departure_date'] ??
          row['تاريخ الرحلة'] ??
          row['التاريخ'] ??
          null;

        const routListRaw = (
          row['RoutList'] ??
          row['rout_list'] ??
          row['routList'] ??
          row['route'] ??
          row['Route'] ??
          row['المسار'] ??
          row['خط السير'] ??
          ''
        )
          .toString()
          .trim();

        const priceRaw =
          row['Price'] ?? row['price'] ?? row['السعر'] ?? row['التكلفة'] ?? 0;
        const currencyRaw = (
          row['Currency'] ?? row['currency'] ?? row['العملة'] ?? 'SAR'
        )
          .toString()
          .trim();

        const sourceRaw =
          (
            row['TheSource'] ??
            row['the_source'] ??
            row['theSource'] ??
            row['Source'] ??
            row['source'] ??
            row['المصدر'] ??
            row['نقطة البيع'] ??
            row['الفرع'] ??
            ''
          )
            .toString()
            .trim() || null;

        // تحليل التاريخ والمسار
        const departureDate = this.parseExcelDate(dateRaw);
        const issuedDate = issuedDateRaw ? this.parseExcelDate(issuedDateRaw) : null;
        const { fromCity, toCity, route } = this.parseRoute(routListRaw);

        // حساب السعر
        const price = Math.max(0, parseFloat(String(priceRaw).replace(/[^0-9.]/g, '')) || 0);
        const currency = currencyRaw || 'SAR';

        // رقم الرحلة الفريد
        let tripNumber = ticketNumberRaw;
        if (!tripNumber) {
          tripNumber = this.generateTripNumber();
        } else {
          // التحقق من عدم تكرار رقم الرحلة مع رحلة سابقة
          const existingTrip = await this.tripRepository.findOne({
            where: { tripNumber },
          });
          if (existingTrip) {
            // إضافة لاحقة لتفادي التعارض في المعرف الفريد
            tripNumber = `${ticketNumberRaw}-${crypto.randomInt(10, 99)}`;
          }
        }

        // إنشاء كائن الرحلة كـ "مسودة"
        const tripData: Partial<Trip> = {
          tripNumber,
          serviceId: targetServiceId,
          officeId,
          fromCity,
          toCity,
          route,
          departureDate,
          departureTime: '08:00', // وقت افتراضي صباحي قابل للتعديل لاحقاً
          originalPrice: price,
          currency,
          totalSeats: defaultSeats,
          availableSeats: defaultSeats,
          status: TripStatus.DRAFT, // 👈 الحالة دائماً مسودة عند الاستيراد
          passengerName: passengerName ?? undefined,
          issuedDate: issuedDate ?? undefined,
          source: sourceRaw ?? undefined,
          notes: `مسودة مستوردة من إكسل${sourceRaw ? ` [المصدر: ${sourceRaw}]` : ''}${passengerName ? ` [الراكب: ${passengerName}]` : ''}`,
        };

        const trip = this.tripRepository.create(tripData);
        const savedTrip = await this.tripRepository.save(trip);
        draftTrips.push(savedTrip);
      } catch (err: any) {
        errors.push({
          row: rowNumber,
          error: err?.message || 'خطأ غير متوقع أثناء معالجة الصف.',
          data: row,
        });
      }
    }

    return {
      message: `تم استيراد ${draftTrips.length} رحلة بنجاح كمسودات (Drafts).`,
      totalRows: rawRows.length,
      importedCount: draftTrips.length,
      failedCount: errors.length,
      draftTrips,
      errors,
    };
  }

  /**
   * جلب كافة المسودات الخاصة بالمكتب الحالي
   */
  async findMyDrafts(officeId: string): Promise<Trip[]> {
    return await this.tripRepository.find({
      where: { officeId, status: TripStatus.DRAFT },
      relations: { service: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * اعتماد ونشر رحلة مسودة (تحويلها من DRAFT إلى UPCOMING لتصبح متاحة للحجز)
   */
  async publishDraft(
    id: string,
    officeId: string,
    userRole: UserRole,
  ): Promise<{ message: string; trip: Trip }> {
    const trip = await this.findOne(id);

    if (userRole !== UserRole.ADMIN && trip.officeId !== officeId) {
      throw new ForbiddenException('لا يمكنك نشر رحلة لا تملكها.');
    }

    if (trip.status !== TripStatus.DRAFT) {
      return { message: 'الرحلة منشورة مسبقاً وليست مسودة.', trip };
    }

    trip.status = TripStatus.UPCOMING;
    const updated = await this.tripRepository.save(trip);

    return {
      message: `تم اعتماد ونشر الرحلة رقم "${updated.tripNumber}" بنجاح وأصبحت متاحة للحجز.`,
      trip: updated,
    };
  }

  /**
   * اعتماد ونشر مجموعة من المسودات دفعة واحدة (Bulk Publish)
   */
  async publishBulkDrafts(
    officeId: string,
    tripIds?: string[],
  ): Promise<{ message: string; publishedCount: number }> {
    const qb = this.tripRepository
      .createQueryBuilder('trip')
      .where('trip.office_id = :officeId', { officeId })
      .andWhere('trip.status = :status', { status: TripStatus.DRAFT });

    if (tripIds && tripIds.length > 0) {
      qb.andWhere('trip.id IN (:...tripIds)', { tripIds });
    }

    const drafts = await qb.getMany();

    if (drafts.length === 0) {
      return {
        message: 'لا توجد مسودات مطابقة لاعتمادها ونشرها.',
        publishedCount: 0,
      };
    }

    for (const draft of drafts) {
      draft.status = TripStatus.UPCOMING;
    }

    await this.tripRepository.save(drafts);

    return {
      message: `تم اعتماد ونشر ${drafts.length} رحلة بنجاح وأصبحت متاحة للجمهور.`,
      publishedCount: drafts.length,
    };
  }

  /**
   * توليد ملف إكسل نموذجي فارغ بصيغة XLSX يحتوي على الرؤوس المعتمدة
   */
  generateSampleExcelBuffer(): Buffer {
    const sampleData = [
      {
        TicketNumber: 'TK-84721',
        PassengerName: 'عبدالله محمد السالم',
        IssuedDate: '2026-11-20',
        Date: '2026-12-01',
        RoutList: 'عدن - الرياض',
        Price: 350,
        Currency: 'SAR',
        TheSource: 'فرع عدن الرئيسي',
      },
      {
        TicketNumber: 'TK-84722',
        PassengerName: 'فاطمة أحمد باوزير',
        IssuedDate: '2026-11-21',
        Date: '2026-12-02',
        RoutList: 'صنعاء - جدة',
        Price: 420,
        Currency: 'SAR',
        TheSource: 'تطبيق حجز الرواد',
      },
      {
        TicketNumber: 'TK-84723',
        PassengerName: 'عمر خالد العتيبي',
        IssuedDate: '2026-11-22',
        Date: '2026-12-03',
        RoutList: 'الرياض - الدمام',
        Price: 120,
        Currency: 'SAR',
        TheSource: 'منصة الحجوزات السريعة',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, {
      header: [
        'TicketNumber',
        'PassengerName',
        'IssuedDate',
        'Date',
        'RoutList',
        'Price',
        'Currency',
        'TheSource',
      ],
    });

    // ضبط عرض الأعمدة ليكون مريحاً للقراءة
    worksheet['!cols'] = [
      { wch: 16 }, // TicketNumber
      { wch: 22 }, // PassengerName
      { wch: 14 }, // IssuedDate
      { wch: 14 }, // Date
      { wch: 22 }, // RoutList
      { wch: 10 }, // Price
      { wch: 10 }, // Currency
      { wch: 24 }, // TheSource
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trips_Sample');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * جلب جميع الرحلات مع فلاتر البحث (عام للمستخدمين مع استثناء المسودات تلقائياً)
   */
  async findAll(filters: {
    serviceId?: string;
    fromCity?: string;
    toCity?: string;
    date?: string;
    status?: TripStatus;
    officeId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Trip[]; total: number; page: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const qb = this.tripRepository
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.service', 'service')
      .leftJoinAndSelect('trip.office', 'office')
      .where('service.isActive = :active', { active: true });

    if (filters.serviceId) {
      qb.andWhere('trip.service_id = :serviceId', { serviceId: filters.serviceId });
    }

    if (filters.fromCity) {
      qb.andWhere('trip.from_city ILIKE :fromCity', { fromCity: `%${filters.fromCity}%` });
    }

    if (filters.toCity) {
      qb.andWhere('trip.to_city ILIKE :toCity', { toCity: `%${filters.toCity}%` });
    }

    if (filters.date) {
      qb.andWhere('trip.departure_date = :date', { date: filters.date });
    }

    if (filters.status) {
      qb.andWhere('trip.status = :status', { status: filters.status });
    } else {
      // 👈 إخفاء المسودات (DRAFT) تلقائياً من تصفح المستخدمين العاديين
      qb.andWhere('trip.status != :draftStatus', { draftStatus: TripStatus.DRAFT });
    }

    if (filters.officeId) {
      qb.andWhere('trip.office_id = :officeId', { officeId: filters.officeId });
    }

    // إخفاء حقول حساسة من كائن المكتب
    qb.addSelect([
      'office.id',
      'office.fullName',
      'office.email',
      'office.phone',
      'office.officeName',
      'office.city',
    ]);

    qb.orderBy('trip.departure_date', 'ASC')
      .addOrderBy('trip.departure_time', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * جلب تفاصيل رحلة واحدة
   */
  async findOne(id: string): Promise<Trip> {
    const trip = await this.tripRepository.findOne({
      where: { id },
      relations: { service: true, office: true },
    });
    if (!trip) {
      throw new NotFoundException('الرحلة غير موجودة.');
    }
    return trip;
  }

  /**
   * جلب رحلات المكتب الحالي (خاص بالمكتب - يشمل كافة الحالات والمسودات)
   */
  async findMyTrips(officeId: string): Promise<Trip[]> {
    return await this.tripRepository.find({
      where: { officeId },
      relations: { service: true },
      order: { departureDate: 'DESC', departureTime: 'DESC' },
    });
  }

  /**
   * تحديث رحلة (المكتب المالك أو الإدارة)
   */
  async update(
    id: string,
    updateTripDto: UpdateTripDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Trip> {
    const trip = await this.findOne(id);

    // فقط المكتب المالك أو الإدارة يمكنها التعديل
    if (userRole !== UserRole.ADMIN && trip.officeId !== userId) {
      throw new ForbiddenException('لا يمكنك تعديل رحلة لا تملكها.');
    }

    Object.assign(trip, updateTripDto);
    return await this.tripRepository.save(trip);
  }

  /**
   * حذف رحلة (المكتب المالك أو الإدارة)
   */
  async remove(id: string, userId: string, userRole: UserRole): Promise<{ message: string }> {
    const trip = await this.findOne(id);

    if (userRole !== UserRole.ADMIN && trip.officeId !== userId) {
      throw new ForbiddenException('لا يمكنك حذف رحلة لا تملكها.');
    }

    await this.tripRepository.remove(trip);
    return { message: `تم حذف الرحلة رقم "${trip.tripNumber}" بنجاح.` };
  }

  /**
   * جلب الرحلات حسب خدمة ومكتب معين
   */
  async findByServiceAndOffice(serviceId: string, officeId: string): Promise<Trip[]> {
    return await this.tripRepository.find({
      where: { serviceId, officeId },
      order: { departureDate: 'ASC', departureTime: 'ASC' },
    });
  }
}
