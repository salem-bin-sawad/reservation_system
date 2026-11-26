import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { User, UserRole } from '../users/entities/user.entity.js';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * إنشاء خدمة جديدة (خاص بالإدارة)
   */
  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    const existing = await this.serviceRepository.findOne({
      where: { name: createServiceDto.name },
    });
    if (existing) {
      throw new ConflictException(`الخدمة "${createServiceDto.name}" موجودة بالفعل.`);
    }

    const service = this.serviceRepository.create(createServiceDto);
    return await this.serviceRepository.save(service);
  }

  /**
   * جلب جميع الخدمات الفعالة (عام)
   */
  async findAll(): Promise<Service[]> {
    return await this.serviceRepository.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * جلب جميع الخدمات بما فيها غير الفعالة (للإدارة)
   */
  async findAllAdmin(): Promise<Service[]> {
    return await this.serviceRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * جلب خدمة بمعرفها مع المكاتب المرتبطة بها
   */
  async findOne(id: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: { offices: true },
    });
    if (!service) {
      throw new NotFoundException(`الخدمة غير موجودة.`);
    }
    return service;
  }

  /**
   * جلب كل المكاتب المرتبطة بخدمة معينة
   */
  async getOfficesByService(serviceId: string): Promise<User[]> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId, isActive: true },
      relations: { offices: true },
    });
    if (!service) {
      throw new NotFoundException(`الخدمة غير موجودة.`);
    }
    // فلترة المكاتب النشطة والمفعلة فقط
    return service.offices.filter((office) => office.isActive && office.isEmailVerified);
  }

  /**
   * تحديث خدمة (خاص بالإدارة)
   */
  async update(id: string, updateServiceDto: UpdateServiceDto): Promise<Service> {
    const service = await this.findOne(id);
    Object.assign(service, updateServiceDto);
    return await this.serviceRepository.save(service);
  }

  /**
   * حذف خدمة (خاص بالإدارة)
   */
  async remove(id: string): Promise<{ message: string }> {
    const service = await this.findOne(id);
    await this.serviceRepository.remove(service);
    return { message: `تم حذف الخدمة "${service.name}" بنجاح.` };
  }

  /**
   * تسجيل مكتب في خدمة (ربط المكتب بالخدمة)
   */
  async joinService(serviceId: string, officeId: string): Promise<{ message: string }> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      relations: { offices: true },
    });
    if (!service) {
      throw new NotFoundException('الخدمة غير موجودة.');
    }

    const office = await this.userRepository.findOne({ where: { id: officeId } });
    if (!office || office.role !== UserRole.OFFICE) {
      throw new ForbiddenException('فقط المكاتب يمكنها التسجيل في الخدمات.');
    }

    const alreadyJoined = service.offices.some((o) => o.id === officeId);
    if (alreadyJoined) {
      throw new ConflictException('المكتب مسجل بالفعل في هذه الخدمة.');
    }

    service.offices.push(office);
    await this.serviceRepository.save(service);

    return { message: `تم تسجيل المكتب "${office.officeName || office.fullName}" في خدمة "${service.name}" بنجاح.` };
  }

  /**
   * إلغاء تسجيل مكتب من خدمة
   */
  async leaveService(serviceId: string, officeId: string): Promise<{ message: string }> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      relations: { offices: true },
    });
    if (!service) {
      throw new NotFoundException('الخدمة غير موجودة.');
    }

    const officeIndex = service.offices.findIndex((o) => o.id === officeId);
    if (officeIndex === -1) {
      throw new NotFoundException('المكتب غير مسجل في هذه الخدمة.');
    }

    service.offices.splice(officeIndex, 1);
    await this.serviceRepository.save(service);

    return { message: 'تم إلغاء تسجيل المكتب من الخدمة بنجاح.' };
  }

  /**
   * جلب الخدمات التي يقدمها مكتب معين
   */
  async getServicesByOffice(officeId: string): Promise<Service[]> {
    return await this.serviceRepository
      .createQueryBuilder('service')
      .innerJoin('service.offices', 'office', 'office.id = :officeId', { officeId })
      .where('service.isActive = :isActive', { isActive: true })
      .orderBy('service.name', 'ASC')
      .getMany();
  }
}
