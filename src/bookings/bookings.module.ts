import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity.js';
import { Trip } from '../trips/entities/trip.entity.js';
import { User } from '../users/entities/user.entity.js';
import { BookingsService } from './bookings.service.js';
import { BookingsController } from './bookings.controller.js';
import { UsersModule } from '../users/users.module.js';
import { TripsModule } from '../trips/trips.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Trip, User]),
    UsersModule,
    TripsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}

