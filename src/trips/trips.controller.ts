import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { TripsService } from './trips.service.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';
import { TripStatus } from './entities/trip.entity.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('الرحلات (Trips)')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // ───────── واجهات عامة (بحث وتصفح للجمهور) ─────────

  @Get()
  @ApiOperation({
    summary: 'البحث وتصفح الرحلات المنشورة (عام - يستثني المسودات تلقائياً)',
    description: `
تصفح قائمة الرحلات المنشورة والمتاحة للحجز والبحث فيها:
* يتم استبعاد الرحلات التي في حالة مسودة (\`DRAFT\`) تلقائياً حتى لا تظهر للجمهور قبل اعتمادها.
* فلترة حسب مدينة المغادرة (\`fromCity\`) ومدينة الوصول (\`toCity\`).
* فلترة حسب تاريخ اليوم المحدد في شريط الأيام (\`date\`).
* فلترة حسب نوع الخدمة أو حالة الرحلة أو المكتب.
    `,
  })
  @ApiQuery({ name: 'fromCity', required: false, description: 'مدينة الانطلاق', example: 'عدن' })
  @ApiQuery({ name: 'toCity', required: false, description: 'مدينة الوصول', example: 'الدمام' })
  @ApiQuery({ name: 'date', required: false, description: 'تاريخ الرحلة (YYYY-MM-DD)', example: '2026-12-01' })
  @ApiQuery({ name: 'serviceId', required: false, description: 'معرف الخدمة (UUID)' })
  @ApiQuery({ name: 'status', required: false, enum: TripStatus, description: 'حالة الرحلة' })
  @ApiQuery({ name: 'officeId', required: false, description: 'معرف المكتب' })
  @ApiQuery({ name: 'page', required: false, description: 'رقم الصفحة (افتراضي 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد النتائج في الصفحة (افتراضي 20)', example: 10 })
  @ApiResponse({ status: 200, description: 'نتائج البحث عن الرحلات مع الترقيم.' })
  findAll(
    @Query('serviceId') serviceId?: string,
    @Query('fromCity') fromCity?: string,
    @Query('toCity') toCity?: string,
    @Query('date') date?: string,
    @Query('status') status?: TripStatus,
    @Query('officeId') officeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tripsService.findAll({
      serviceId,
      fromCity,
      toCity,
      date,
      status,
      officeId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ───────── واجهات خاصة بالمكاتب (استيراد إكسل والمسودات) ─────────

  @Post('import-excel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'سحب واستيراد الرحلات من ملف إكسل كمسودات (مكاتب فقط)',
    description: `
يقوم المكتب برفع ملف إكسل (\`.xlsx\` أو \`.xls\` أو \`.csv\`) يحتوي على التذاكر/الرحلات.
يتم إنشاء جميع السجلات كـ **مسودات (DRAFT)** تلقائياً حتى يقوم المكتب بمراجعتها واعتماد نشرها لاحقاً.

الأعمدة المتوقعة في ملف الإكسل:
* \`TicketNumber\`: رقم التذكرة أو معرف الرحلة.
* \`PassengerName\`: اسم الراكب (اختياري).
* \`IssuedDate\`: تاريخ إصدار التذكرة (اختياري، مثل \`2026-11-20\`).
* \`Date\`: تاريخ انطلاق الرحلة (مثل \`2026-12-01\`).
* \`RoutList\`: خط السير ومسار الرحلة (مثل: \`عدن - الرياض\` أو \`صنعاء - جدة\`).
* \`Price\`: السعر (مثل: \`350\`).
* \`Currency\`: العملة (مثل: \`SAR\` أو \`YER\`).
* \`TheSource\`: مصدر الحجز أو نقطة البيع أو النظام الخارجي.
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'ملف الإكسل (.xlsx, .xls, .csv)',
        },
        serviceId: {
          type: 'string',
          description: 'معرف الخدمة التابعة لها الرحلات (اختياري - في حال تركه فارغاً يتم الربط بالخدمة المسجل بها المكتب تلقائياً)',
          example: '3831d80b-9e13-40c5-8ab0-9afd0ed80edf',
        },
        defaultSeats: {
          type: 'number',
          description: 'عدد المقاعد الافتراضي لكل رحلة (افتراضياً 50 مقعداً)',
          example: 50,
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'تم استيراد الرحلات بنجاح كمسودات (Drafts).' })
  @ApiResponse({ status: 400, description: 'ملف غير صالح أو فارغ.' })
  @ApiResponse({ status: 403, description: 'خاص بالمكاتب والإدارة فقط.' })
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') officeId: string,
    @Body('serviceId') serviceId?: string,
    @Body('defaultSeats') defaultSeats?: string,
  ) {
    if (!file) {
      throw new BadRequestException('يجب إرفاق ملف إكسل بصيغة .xlsx أو .xls أو .csv');
    }

    return this.tripsService.importFromExcel(file.buffer, officeId, {
      serviceId,
      defaultSeats: defaultSeats ? parseInt(defaultSeats, 10) : 50,
    });
  }

  @Get('sample-excel')
  @ApiOperation({
    summary: 'تحميل نموذج ملف إكسل الجاهز للاستيراد (Template)',
    description: 'تحميل ملف إكسل (.xlsx) نموذجي يحتوي على الرؤوس الصحيحة (TicketNumber, PassengerName, IssuedDate, Date, RoutList, Price, Currency, TheSource) وبيانات تجريبية إرشادية.',
  })
  @ApiResponse({ status: 200, description: 'تحميل ملف النموذج بصيغة .xlsx.' })
  downloadSampleExcel(@Res() res: Response) {
    const buffer = this.tripsService.generateSampleExcelBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="trips_import_sample.xlsx"');
    res.send(buffer);
  }

  @Get('office/drafts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'استعراض الرحلات المسودة الخاصة بالمكتب (مكاتب فقط)',
    description: 'جلب قائمة بكافة الرحلات المستوردة أو المحفوظة كمسودة (DRAFT) والخاصة بالمكتب الحالي لمراجعتها قبل النشر.',
  })
  @ApiResponse({ status: 200, description: 'قائمة المسودات.' })
  findMyDrafts(@CurrentUser('sub') officeId: string) {
    return this.tripsService.findMyDrafts(officeId);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'اعتماد ونشر رحلة مسودة (مكاتب فقط)',
    description: 'تحويل حالة الرحلة من مسودة (\`DRAFT\`) إلى مجدولة (\`UPCOMING\`) لتصبح معتمدة وتظهر للمستخدمين في البحث للحجز.',
  })
  @ApiParam({ name: 'id', description: 'معرف الرحلة (UUID)' })
  @ApiResponse({ status: 200, description: 'تم نشر الرحلة بنجاح وأصبحت متاحة للجمهور.' })
  publishDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') officeId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.tripsService.publishDraft(id, officeId, userRole);
  }

  @Post('office/publish-bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'اعتماد ونشر مسودات متعددة دفعة واحدة (Bulk Publish)',
    description: 'نشر كافة المسودات أو مجموعة محددة من الـ IDs الخاصة بالمكتب دفعة واحدة لتصبح معتمدة ومتاحة للحجز.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tripIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'قائمة معرفات الرحلات المسودة (في حال تركها فارغة يتم نشر كافة المسودات الحالية)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'تم نشر المسودات المحددة بنجاح.' })
  publishBulkDrafts(
    @CurrentUser('sub') officeId: string,
    @Body('tripIds') tripIds?: string[],
  ) {
    return this.tripsService.publishBulkDrafts(officeId, tripIds);
  }

  @Get('office/my-trips')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'كافة رحلات المكتب الحالي (مكاتب فقط)',
    description: 'استعراض كافة الرحلات الخاصة بالمكتب المسجل دخوله (المسودات والمجدولة والمنتهية).',
  })
  @ApiResponse({ status: 200, description: 'قائمة رحلات المكتب.' })
  @ApiResponse({ status: 403, description: 'خاص بالمكاتب فقط.' })
  findMyTrips(@CurrentUser('sub') officeId: string) {
    return this.tripsService.findMyTrips(officeId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'إنشاء رحلة جديدة يدوياً (مكاتب فقط)',
    description: 'يقوم المكتب بإنشاء رحلة جديدة تابعة لإحدى الخدمات التي يقدمها، مع تحديد المسار والتوقيت والأسعار والمقاعد.',
  })
  @ApiResponse({ status: 201, description: 'تم إنشاء الرحلة وتوليد رقم الرحلة الفريد بنجاح.' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة أو تاريخ في الماضي.' })
  @ApiResponse({ status: 403, description: 'المكتب غير مسجل في هذه الخدمة.' })
  create(
    @Body() createTripDto: CreateTripDto,
    @CurrentUser('sub') officeId: string,
  ) {
    return this.tripsService.create(createTripDto, officeId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'جلب تفاصيل الرحلة الكاملة (عام)',
    description: `
يعرض كافة تفاصيل الرحلة المحددة:
* رقم الرحلة ومصدرها واسم الراكب إن وجد.
* التقييم بالنجوم واسم المكتب والأسعار والمقاعد المتبقية.
    `,
  })
  @ApiParam({ name: 'id', description: 'معرف الرحلة (UUID)', example: '5e3c39c3-076c-47ad-8220-614239138c65' })
  @ApiResponse({ status: 200, description: 'كافة تفاصيل الرحلة.' })
  @ApiResponse({ status: 404, description: 'الرحلة غير موجودة.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tripsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'تحديث بيانات الرحلة (المكتب المالك أو الإدارة)',
    description: 'تعديل توقيت الرحلة أو حالتها أو الأسعار أو المقاعد المتبقية.',
  })
  @ApiParam({ name: 'id', description: 'معرف الرحلة (UUID)' })
  @ApiResponse({ status: 200, description: 'تم تحديث الرحلة بنجاح.' })
  @ApiResponse({ status: 403, description: 'غير مصرح (لا تملك هذه الرحلة).' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTripDto: UpdateTripDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.tripsService.update(id, updateTripDto, userId, userRole);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'حذف رحلة (المكتب المالك أو الإدارة)',
    description: 'حذف الرحلة نهائياً من النظام. متاح فقط للمكتب الذي أنشأ الرحلة أو مشرف النظام.',
  })
  @ApiParam({ name: 'id', description: 'معرف الرحلة (UUID)' })
  @ApiResponse({ status: 200, description: 'تم حذف الرحلة بنجاح.' })
  @ApiResponse({ status: 403, description: 'غير مصرح.' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.tripsService.remove(id, userId, userRole);
  }
}
