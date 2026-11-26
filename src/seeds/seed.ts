import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { DataSource } from 'typeorm';
import { seedDatabase } from './seed.util.js';

async function runSeed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);
    await seedDatabase(dataSource);
  } catch (error) {
    console.error('❌ حدث خطأ أثناء إضافة البيانات التجريبية:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runSeed();
