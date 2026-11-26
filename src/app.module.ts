import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './users/users.module.js';
import { MailModule } from './mail/mail.module.js';
import { ServicesModule } from './services/services.module.js';
import { TripsModule } from './trips/trips.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { User } from './users/entities/user.entity.js';
import { Service } from './services/entities/service.entity.js';
import { Trip } from './trips/entities/trip.entity.js';
import { Booking } from './bookings/entities/booking.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const useSsl =
          configService.get<string>('DB_SSL', 'false') === 'true' ||
          Boolean(databaseUrl);

        return {
          type: 'postgres',
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: configService.get<string>('DB_HOST', 'localhost'),
                port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
                username: configService.get<string>('DB_USERNAME', 'postgres'),
                password: configService.get<string>('DB_PASSWORD', 'postgres'),
                database: configService.get<string>('DB_DATABASE', 'reservation_db'),
              }),
          ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
          entities: [User, Service, Trip, Booking],
          autoLoadEntities: true,
          synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
          logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
        };
      },
    }),
    MailModule,
    UsersModule,
    ServicesModule,
    TripsModule,
    BookingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
