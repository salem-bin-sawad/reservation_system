import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { User } from '../../users/entities/user.entity.js';
import type { Trip } from '../../trips/entities/trip.entity.js';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string; // مثل: نقل دولي، نقل تشاركي، إلخ

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon?: string; // أيقونة أو رابط صورة الخدمة

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // علاقة Many-to-Many: أي مكتب يمكنه تقديم عدة خدمات، والخدمة الواحدة عدة مكاتب تقدمها
  @ManyToMany('User', { eager: false })
  @JoinTable({
    name: 'office_services',
    joinColumn: { name: 'service_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'office_id', referencedColumnName: 'id' },
  })
  offices: Relation<User>[];

  // علاقة One-to-Many: كل خدمة لها عدة رحلات
  @OneToMany('Trip', 'service')
  trips: Relation<Trip>[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
