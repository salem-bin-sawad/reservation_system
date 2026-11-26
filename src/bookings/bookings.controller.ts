import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as crypto from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UploadInvoiceDto } from './dto/upload-invoice.dto.js';
import { ReviewBookingDto } from './dto/review-booking.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

// إعدادات حفظ صور وفواتير وسندات التحويل
const invoiceMulterStorage = diskStorage({
  destination: './uploads/invoices',
  filename: (req, file, callback) => {
    const uniqueId = crypto.randomUUID();
    const fileExtension = extname(file.originalname);
    callback(null, `invoice-${uniqueId}${fileExtension}`);
  },
});

@ApiTags('الحجوزات والفواتير (Bookings & Invoices)')
@ApiBearerAuth('JWT-auth')
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ───────── واجهات المستخدمين (حجز وتتبع وإرفاق فواتير) ─────────

  @Post()
  @ApiOperation({
    summary: 'حجز مقاعد في رحلة جديدة (مستخدمين)',
    description: `
يقوم العميل بحجز مقاعد في رحلة محددة:
* يتم فحص توفر المقاعد تلقائياً وخصمها من الرحلة لمنع الحجز المزدوج.
* يُحسب المبلغ الإجمالي بدقة استناداً لسعر المقعد (الأصلي أو المخفض).
* يمكن إرفاق بيانات الفاتورة ورقم الحوالة مباشرة هنا أو رفعها لاحقاً عبر مسار \`upload-invoice\`.
    `,
  })
  @ApiResponse({ status: 201, description: 'تم إنشاء الحجز بنجاح وتوليد رقم الحجز.' })
  @ApiResponse({ status: 400, description: 'المقاعد غير كافية أو الرحلة منتهية.' })
  create(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.bookingsService.create(createBookingDto, userId);
  }

  @Post(':id/upload-invoice')
  @UseInterceptors(FileInterceptor('file', { storage: invoiceMulterStorage }))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'إرسال أو رفع الفاتورة وسند التحويل للحجز',
    description: `
رفع سند التحويل أو إشعار البنك (سواء كملف صورة عبر \`file\` أو رابط/بيانات بالـ JSON):
* تتحول حالة الحجز تلقائياً إلى \`PAYMENT_UNDER_REVIEW\` (قيد المراجعة).
* يظهر الحجز والفاتورة مباشرة للمكتب صاحب الرحلة للتحقق منها وتأكيد التذكرة.
    `,
  })
  @ApiParam({ name: 'id', description: 'معرف الحجز (UUID)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'صورة الفاتورة أو سند التحويل' },
        invoiceNumber: { type: 'string', description: 'رقم الإشعار أو الحوالة', example: 'TRX-10293847' },
        invoiceImage: { type: 'string', description: 'أو رابط صورة الفاتورة البديل' },
        paymentMethod: { type: 'string', description: 'طريقة الدفع', example: 'تحويل بنكي - الراجحي' },
        paymentNotes: { type: 'string', description: 'ملاحظات الدفع واسم المحول' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'تم استلام الفاتورة بنجاح وتحويل الحجز لقيد المراجعة.' })
  uploadInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() uploadInvoiceDto: UploadInvoiceDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser('sub') userId: string,
  ) {
    return this.bookingsService.uploadInvoice(id, uploadInvoiceDto, file, userId);
  }

  @Get('my-bookings')
  @ApiOperation({
    summary: 'حجوزاتي ورحلاتي (خاص بالمستخدم الحالي)',
    description: 'يعرض للمستخدم قائمة بكافة حجوزاته ورحلاته السابقة والقادمة مع تفاصيل كل رحلة وحالة الفاتورة (قيد الانتظار، مؤكد، مرفوض...). شاشة "رحلاتي".',
  })
  @ApiResponse({ status: 200, description: 'قائمة حجوزات المستخدم.' })
  findMyBookings(@CurrentUser('sub') userId: string) {
    return this.bookingsService.findMyBookings(userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'إلغاء الحجز من قِبل المستخدم',
    description: 'إلغاء حجز معلق أو قيد المراجعة وإرجاع المقاعد المحجوزة تلقائياً لقائمة المقاعد الشاغرة في الرحلة.',
  })
  @ApiParam({ name: 'id', description: 'معرف الحجز (UUID)' })
  @ApiResponse({ status: 200, description: 'تم إلغاء الحجز وإرجاع المقاعد.' })
  @ApiResponse({ status: 400, description: 'لا يمكن إلغاء الحجز إذا تم تأكيده بالفعل من قِبل المكتب.' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.bookingsService.cancel(id, userId);
  }

  // ───────── واجهات المكاتب (مراجعة الفواتير وتأكيد الرحلات) ─────────

  @Get('office/my-trips-bookings')
  @Roles(UserRole.OFFICE)
  @ApiOperation({
    summary: 'حجوزات وفواتير رحلات مكتبي (مكاتب فقط)',
    description: 'استعراض كافة الحجوزات والفواتير المرسلة من العملاء على جميع رحلات هذا المكتب لمطابقتها مع الحسابات الرسمية للشركة.',
  })
  @ApiResponse({ status: 200, description: 'قائمة حجوزات وفواتير رحلات المكتب.' })
  @ApiResponse({ status: 403, description: 'خاص بالمكاتب فقط.' })
  findOfficeBookings(@CurrentUser('sub') officeId: string) {
    return this.bookingsService.findOfficeBookings(officeId);
  }

  @Patch(':id/review')
  @Roles(UserRole.OFFICE, UserRole.ADMIN)
  @ApiOperation({
    summary: 'مراجعة وتأكيد أو رفض الفاتورة والحجز (المكتب صاحب الرحلة أو الإدارة)',
    description: `
يقوم المكتب بفحص الفاتورة ومطابقة الحوالة مع الحساب الرسمي:
* في حال اختيار \`CONFIRM\`: يتم اعتماد الحجز وتأكيد التذكرة رسمياً للعميل.
* في حال اختيار \`REJECT\`: يتم كتابة سبب الرفض وإعادة المقاعد فوراً إلى الرحلة لتصبح شاغرة مجدداً.
    `,
  })
  @ApiParam({ name: 'id', description: 'معرف الحجز (UUID)' })
  @ApiResponse({ status: 200, description: 'تم اعتماد أو رفض الحجز وتحديث الحالة.' })
  @ApiResponse({ status: 403, description: 'غير مصرح (الرحلة لا تتبع هذا المكتب).' })
  reviewBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reviewDto: ReviewBookingDto,
    @CurrentUser('sub') officeId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.bookingsService.reviewBooking(id, reviewDto, officeId, userRole);
  }

  // ───────── واجهات الإدارة واستعراض التفاصيل ─────────

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'استعراض جميع حجوزات المنصة (إدارة النظام فقط)',
    description: 'سجل شامل لجميع الحجوزات والفواتير عبر كافة المكاتب والرحلات.',
  })
  @ApiResponse({ status: 200, description: 'قائمة كافة الحجوزات في النظام.' })
  findAllAdmin() {
    return this.bookingsService.findAllAdmin();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'جلب تفاصيل حجز محدد بالـ ID',
    description: 'عرض بيانات الحجز والتذكرة، الفاتورة وسند التحويل، وحالة الحجز (متاح للعميل صاحب الحجز أو المكتب صاحب الرحلة أو المشرف).',
  })
  @ApiParam({ name: 'id', description: 'معرف الحجز (UUID)' })
  @ApiResponse({ status: 200, description: 'تفاصيل الحجز والفاتورة.' })
  @ApiResponse({ status: 403, description: 'غير مصرح بالاطلاع على حجز عميل آخر.' })
  @ApiResponse({ status: 404, description: 'الحجز غير موجود.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.bookingsService.findOne(id, userId, userRole);
  }
}

