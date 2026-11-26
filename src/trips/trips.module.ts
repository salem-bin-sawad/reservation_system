import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from './entities/trip.entity.js';
import { TripsService } from './trips.service.js';
import { TripsController } from './trips.controller.js';
import { Service } from '../services/entities/service.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, Service, User]),
    UsersModule,
  ],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}

