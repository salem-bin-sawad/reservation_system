import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ServicesService } from './services.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('الخدمات (Services)')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // ───────── واجهات عامة ─────────

  @Get()
  @ApiOperation({
    summary: 'جلب جميع الخدمات المتاحة (عام)',
    description: 'عرض كافة أنواع الخدمات الفعالة في النظام مثل: (نقل دولي، نقل تشاركي، نقل خاص VIP، شحن طرود...). متاح لجميع المستخدمين.',
  })
  @ApiResponse({ status: 200, description: 'قائمة الخدمات الفعالة.' })
  findAll() {
    return this.servicesService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'جلب تفاصيل خدمة معينة مع مكاتبها (عام)',
    description: 'جلب بيانات الخدمة المحددة بالـ UUID مع قائمة بكافة المكاتب المرتبطة والمقدمة لهذه الخدمة.',
  })
  @ApiParam({ name: 'id', description: 'معرف الخدمة (UUID)', example: '3831d80b-9e13-40c5-8ab0-9afd0ed80edf' })
  @ApiResponse({ status: 200, description: 'تفاصيل الخدمة مع المكاتب.' })
  @ApiResponse({ status: 404, description: 'الخدمة غير موجودة.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.findOne(id);
  }

  @Get(':id/offices')
  @ApiOperation({
    summary: 'جلب كل المكاتب التي تقدم هذه الخدمة (عام)',
    description: 'عند ضغط المستخدم على أي خدمة (مثل: نقل دولي)، تظهر له كل المكاتب وشركات النقل التي توفر هذه الخدمة مع بيانات التواصل والمدينة.',
  })
  @ApiParam({ name: 'id', description: 'معرف الخدمة (UUID)', example: '3831d80b-9e13-40c5-8ab0-9afd0ed80edf' })
  @ApiResponse({ status: 200, description: 'قائمة المكاتب المقدمة للخدمة.' })
  @ApiResponse({ status: 404, description: 'الخدمة غير موجودة.' })
  getOffices(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.getOfficesByService(id);
  }

  // ───────── واجهات خاصة بالإدارة ─────────

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'استعراض كافة الخدمات بما فيها غير الفعالة (إدارة فقط)',
    description: 'جلب جميع الخدمات الفعالة والمعطلة. خاص بمسؤولي النظام (admin).',
  })
  @ApiResponse({ status: 200, description: 'قائمة كافة الخدمات للإدارة.' })
  @ApiResponse({ status: 403, description: 'غير مصرح به (خاص بالإدارة).' })
  findAllAdmin() {
    return this.servicesService.findAllAdmin();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'إنشاء خدمة جديدة في النظام (إدارة فقط)',
    description: 'إضافة نوع خدمة جديد إلى المنصة (مثل: نقل دولي، نقل بضائع...). خاص بالإدارة العامة.',
  })
  @ApiResponse({ status: 201, description: 'تم إنشاء الخدمة بنجاح.' })
  @ApiResponse({ status: 403, description: 'غير مصرح به (خاص بالإدارة).' })
  @ApiResponse({ status: 409, description: 'اسم الخدمة موجود بالفعل.' })
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'تحديث بيانات خدمة أو تفعيلها/تعطيلها (إدارة فقط)',
    description: 'تعديل اسم الخدمة أو وصفها أو حالتها أو أيقونتها.',
  })
  @ApiParam({ name: 'id', description: 'معرف الخدمة (UUID)' })
  @ApiResponse({ status: 200, description: 'تم تحديث الخدمة بنجاح.' })
  @ApiResponse({ status: 403, description: 'غير مصرح به.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'حذف خدمة من النظام (إدارة فقط)',
    description: 'حذف الخدمة نهائياً من قاعدة البيانات. خاص بالإدارة العامة.',
  })
  @ApiParam({ name: 'id', description: 'معرف الخدمة (UUID)' })
  @ApiResponse({ status: 200, description: 'تم حذف الخدمة بنجاح.' })
  @ApiResponse({ status: 403, description: 'غير مصرح به.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.remove(id);
  }

  // ───────── واجهات خاصة بالمكاتب ─────────

  @Post(':id/join')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'تسجيل المكتب في خدمة (مكاتب فقط)',
    description: 'يقوم المكتب المسجل بالانضمام إلى تقديم خدمة معينة (مثل نقل دولي) ليتمكن بعدها من إضافة رحلات تابعة لها والظهور للمستخدمين.',
  })
  @ApiParam({ name: 'id', description: 'معرف الخدمة (UUID)', example: '3831d80b-9e13-40c5-8ab0-9afd0ed80edf' })
  @ApiResponse({ status: 201, description: 'تم ربط المكتب بالخدمة بنجاح.' })
  @ApiResponse({ status: 403, description: 'خاص بالمكاتب فقط.' })
  @ApiResponse({ status: 409, description: 'المكتب مسجل مسبقاً في هذه الخدمة.' })
  join(
    @Param('id', ParseUUIDPipe) serviceId: string,
    @CurrentUser('sub') officeId: string,
  ) {
    return this.servicesService.joinService(serviceId, officeId);
  }

  @Delete(':id/leave')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'إلغاء تقديم المكتب للخدمة (مكاتب فقط)',
    description: 'يقوم المكتب بإلغاء اشتراكه في تقديم الخدمة المحددة.',
  })
  @ApiParam({ name: 'id', description: 'معرف الخدمة (UUID)' })
  @ApiResponse({ status: 200, description: 'تم إلغاء تسجيل المكتب من الخدمة.' })
  @ApiResponse({ status: 403, description: 'خاص بالمكاتب فقط.' })
  leave(
    @Param('id', ParseUUIDPipe) serviceId: string,
    @CurrentUser('sub') officeId: string,
  ) {
    return this.servicesService.leaveService(serviceId, officeId);
  }

  @Get('office/my-services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'الخدمات التي يقدمها مكتبي (مكاتب فقط)',
    description: 'جلب قائمة بكافة الخدمات المشترك بها المكتب الحالي المسجل دخوله.',
  })
  @ApiResponse({ status: 200, description: 'قائمة خدمات المكتب.' })
  @ApiResponse({ status: 403, description: 'خاص بالمكاتب فقط.' })
  getMyServices(@CurrentUser('sub') officeId: string) {
    return this.servicesService.getServicesByOffice(officeId);
  }
}
