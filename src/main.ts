import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';
import { User } from './users/entities/user.entity.js';
import { seedDatabase } from './seeds/seed.util.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // إعدادات الـ Validation Pipe للتحقق من المدخلات تلقائياً
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // إتاحة مسار رفع وتصفح الفواتير والمرفقات
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // زراعة البيانات التجريبية تلقائياً إذا كانت قاعدة البيانات فارغة (مثلاً عند أول تشغيل على Render)
  try {
    const dataSource = app.get(DataSource);
    const userCount = await dataSource.getRepository(User).count();
    if (userCount === 0 || process.env.FORCE_SEED === 'true') {
      Logger.log('🌱 قاعدة البيانات فارغة — جاري زراعة البيانات التجريبية (Demo DB) تلقائياً...', 'Seeder');
      await seedDatabase(dataSource);
      Logger.log('✅ تمت زراعة البيانات التجريبية بنجاح!', 'Seeder');
    }
  } catch (err: any) {
    Logger.warn(`⚠️ تعذر التحقق من البيانات التجريبية التلقائية: ${err?.message || err}`, 'Seeder');
  }

  // ──────────────────────────────────────────────────────────
  // إعدادات وتوثيق Swagger / OpenAPI الكاملة
  // ──────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('نظام إدارة الحجوزات والرحلات | Reservation & Trips API')
    .setDescription(`
### 📖 دليل واجهات برمجة التطبيقات (API Documentation)

مرحباً بك في التوثيق الكامل والشامل للـ Backend الخاص بنظام إدارة الحجوزات والرحلات والنقل الدولي والتشاركي.

---

### 🛡️ أدوار وصلاحيات النظام (Roles & Permissions):
1. **المستخدم العادي (\`user\`):** تصفح الخدمات، البحث في الرحلات بالمدن والتواريخ، حجز المقاعد، وإرسال الفاتورة وسند التحويل وتتبع الحجز في "رحلاتي".
2. **المكاتب ومزودو الخدمة (\`office\`):** الانضمام للخدمات، إنشاء وإدارة الرحلات، استعراض حجوزات الرحلات التابعة للمكتب ومراجعة الفواتير المرفقة وتأكيدها أو رفضها.
3. **الإدارة العامة للنظام (\`admin\`):** صلاحيات كاملة لإدارة النظام والخدمات، واستعراض كافة الحسابات والرحلات وسجلات الحجوزات.

---

### 🔑 بيانات الحسابات التجريبية (Demo Accounts):
جميع الحسابات مفعلة وكلمة المرور الموحدة هي: **\`Password@123\`**
* **الإدارة العامة:** \`admin@reservation.com\`
* **شركة المتصدر للنقل الدولي (مكتب):** \`almotasader@reservation.com\`
* **مكتب الرواد للخدمات الشاملة (مكتب):** \`alrowad.office@reservation.com\`
* **مستخدم عادي:** \`sara.mansour@gmail.com\`

---

### 🔒 التوثيق بالمصادقة (Bearer Authentication):
لتجربة المسارات المحمية في Swagger:
1. قم بتسجيل الدخول عبر مسار \`POST /users/login\`.
2. انسخ الـ \`accessToken\`.
3. اضغط على زر **Authorize 🔓** في أعلى الصفحة وألصق التوكن.
    `)
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'أدخل توكن الـ JWT هنا بالشكل: Bearer <token>',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('المصادقة والمستخدمين (Auth & Users)', 'عمليات التسجيل، تسجيل الدخول، التحقق عبر OTP، واستعادة كلمة المرور')
    .addTag('الخدمات (Services)', 'استعراض الخدمات (نقل دولي، نقل تشاركي...) والمكاتب التابعة لكل خدمة')
    .addTag('الرحلات (Trips)', 'البحث في الرحلات، استعراض التفاصيل والمقاعد والأسعار، وإنشاء وإدارة الرحلات للمكاتب')
    .addTag('الحجوزات والفواتير (Bookings & Invoices)', 'حجز المقاعد للعملاء، رفع الفواتير وسندات التحويل، ومراجعة وتأكيد الحجوزات من قِبل المكاتب')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
    },
    customSiteTitle: 'توثيق API نظام الحجوزات والرحلات',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`🚀 السيرفر يعمل على: http://localhost:${port}`, 'Bootstrap');
  Logger.log(`📑 توثيق Swagger متاح على: http://localhost:${port}/api/docs`, 'Bootstrap');
}

await bootstrap();
