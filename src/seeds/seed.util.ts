import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity.js';
import { Service } from '../services/entities/service.entity.js';
import { Trip, TripStatus } from '../trips/entities/trip.entity.js';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity.js';

export async function seedDatabase(dataSource: DataSource): Promise<void> {
  console.log('\n🚀 بدء عملية زراعة البيانات التجريبية الموسعة (Expanded Demo Data Seeder)...\n');

  const userRepository = dataSource.getRepository(User);
    const serviceRepository = dataSource.getRepository(Service);
    const tripRepository = dataSource.getRepository(Trip);
    const bookingRepository = dataSource.getRepository(Booking);

    const defaultPassword = await bcrypt.hash('Password@123', 10);

    // ────────────────────────────────────────────────────
    // 1. المستخدمون (Admins, Offices, Users)
    // ────────────────────────────────────────────────────
    const demoUsers: Partial<User>[] = [
      // 👑 إدارة النظام
      {
        fullName: 'سليمان الفهد (مدير عام النظام)',
        email: 'admin@reservation.com',
        phone: '+966500000001',
        password: defaultPassword,
        role: UserRole.ADMIN,
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },
      {
        fullName: 'ريان الشمري (مشرف نظام)',
        email: 'moderator@reservation.com',
        phone: '+966500000002',
        password: defaultPassword,
        role: UserRole.ADMIN,
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },

      // 🏢 المكاتب وشركات النقل ومقدمو الخدمة
      {
        fullName: 'أحمد صالح المتصدر',
        email: 'almotasader@reservation.com',
        phone: '+966550001122',
        password: defaultPassword,
        role: UserRole.OFFICE,
        officeName: 'شركة المتصدر للنقل الدولي',
        commercialRegistration: '1010998877',
        city: 'عدن',
        address: 'الشارع الرئيسي، حي المعلا',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },
      {
        fullName: 'عبدالعزيز الغامدي',
        email: 'alrowad.office@reservation.com',
        phone: '+966551122334',
        password: defaultPassword,
        role: UserRole.OFFICE,
        officeName: 'مكتب الرواد للخدمات الشاملة',
        commercialRegistration: '1010784920',
        city: 'الرياض',
        address: 'طريق الملك فهد، حي الملقا',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },
      {
        fullName: 'ماجد القرني',
        email: 'alqaema.office@reservation.com',
        phone: '+966554433221',
        password: defaultPassword,
        role: UserRole.OFFICE,
        officeName: 'مكتب القمة لإدارة الفعاليات والنقل',
        commercialRegistration: '4030612948',
        city: 'جدة',
        address: 'شارع التحلية، حي الروضة',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },
      {
        fullName: 'فيصل الدوسري',
        email: 'alofooq.office@reservation.com',
        phone: '+966556677889',
        password: defaultPassword,
        role: UserRole.OFFICE,
        officeName: 'مكتب الأفق للخدمات العامة',
        commercialRegistration: '2050938174',
        city: 'الدمام',
        address: 'طريق الأمير محمد بن فهد، حي الشاطئ',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },
      {
        fullName: 'طارق عبدالكريم البراق',
        email: 'alburaq@reservation.com',
        phone: '+966558899001',
        password: defaultPassword,
        role: UserRole.OFFICE,
        officeName: 'شركة البراق للنقل الدولي والسياحي',
        commercialRegistration: '3020485910',
        city: 'صنعاء',
        address: 'شارع الستين الجنوبي، جوار جسر المصباحي',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },
      {
        fullName: 'سالم بن محفوظ',
        email: 'aloula.travel@reservation.com',
        phone: '+966557766554',
        password: defaultPassword,
        role: UserRole.OFFICE,
        officeName: 'شركة الأولى للنقل البري والشحن',
        commercialRegistration: '1090382716',
        city: 'المكلا',
        address: 'الشارع العام، حي الديس',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },
      {
        fullName: 'منصور الشهري',
        email: 'goldeneagle@reservation.com',
        phone: '+966552233445',
        password: defaultPassword,
        role: UserRole.OFFICE,
        officeName: 'مكتب النسر الذهبي لرحلات العمرة والزيارة',
        commercialRegistration: '4020918273',
        city: 'مكة المكرمة',
        address: 'طريق إبراهيم الخليل، العزيزية',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },
      {
        fullName: 'إبراهيم الأنصاري',
        email: 'alyamama@reservation.com',
        phone: '+966553344556',
        password: defaultPassword,
        role: UserRole.OFFICE,
        officeName: 'مؤسسة اليمامة للنقل التشاركي والسريع',
        commercialRegistration: '5010293847',
        city: 'المدينة المنورة',
        address: 'طريق سلطانة، حي القبلتين',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },

      // 👤 المستخدمون العاديون
      {
        fullName: 'سارة المنصور',
        email: 'sara.mansour@gmail.com',
        phone: '+966541112233',
        password: defaultPassword,
        role: UserRole.USER,
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },
      {
        fullName: 'محمد القحطاني',
        email: 'mohammed.q@gmail.com',
        phone: '+966542223344',
        password: defaultPassword,
        role: UserRole.USER,
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },
      {
        fullName: 'نورة السبيعي',
        email: 'noura.subaie@gmail.com',
        phone: '+966543334455',
        password: defaultPassword,
        role: UserRole.USER,
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },
      {
        fullName: 'خالد العتيبي',
        email: 'khalid.otaibi@gmail.com',
        phone: '+966544445566',
        password: defaultPassword,
        role: UserRole.USER,
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },
      {
        fullName: 'فاطمة باوزير',
        email: 'fatima.bawazir@gmail.com',
        phone: '+966545556677',
        password: defaultPassword,
        role: UserRole.USER,
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      },
    ];

    const savedUsersMap = new Map<string, User>();
    for (const userData of demoUsers) {
      let user = await userRepository.findOne({
        where: [{ phone: userData.phone }, { email: userData.email }],
      });
      if (user) {
        Object.assign(user, userData);
        user = await userRepository.save(user);
      } else {
        user = await userRepository.save(userRepository.create(userData));
      }
      savedUsersMap.set(user.email!, user);
      console.log(`  👤 [${user.role.toUpperCase()}] ${user.fullName} (${user.phone}) - [Email: ${user.email}]`);
    }

    // ────────────────────────────────────────────────────
    // 2. الخدمات (Services) وربط المكاتب بها
    // ────────────────────────────────────────────────────
    console.log('\n🚌 جاري إنشاء الخدمات وربط المكاتب بها...');

    const motasaderOffice = savedUsersMap.get('almotasader@reservation.com')!;
    const rowadOffice = savedUsersMap.get('alrowad.office@reservation.com')!;
    const qaemaOffice = savedUsersMap.get('alqaema.office@reservation.com')!;
    const ofooqOffice = savedUsersMap.get('alofooq.office@reservation.com')!;
    const buraqOffice = savedUsersMap.get('alburaq@reservation.com')!;
    const oulaOffice = savedUsersMap.get('aloula.travel@reservation.com')!;
    const eagleOffice = savedUsersMap.get('goldeneagle@reservation.com')!;
    const yamamaOffice = savedUsersMap.get('alyamama@reservation.com')!;

    const demoServices = [
      {
        name: 'نقل دولي',
        description: 'رحلات نقل بري دولية منتظمة بحافلات حديثة ومكيفة بين المدن والمحافظات والدول المجاورة',
        icon: 'bus-international',
        isActive: true,
        offices: [motasaderOffice, buraqOffice, oulaOffice, rowadOffice, qaemaOffice],
      },
      {
        name: 'نقل تشاركي',
        description: 'رحلات مشتركة اقتصادية بالسيارات والحافلات الصغيرة بين مختلف الوجهات لتوفير التكاليف',
        icon: 'car-share',
        isActive: true,
        offices: [motasaderOffice, rowadOffice, ofooqOffice, yamamaOffice],
      },
      {
        name: 'نقل خاص VIP',
        description: 'حجوزات وسيارات خاصة فارهة مع سائق لرحلات الأفراد والعائلات ورجال الأعمال من الباب إلى الباب',
        icon: 'car-vip',
        isActive: true,
        offices: [qaemaOffice, ofooqOffice, buraqOffice],
      },
      {
        name: 'شحن طرود وأمانات',
        description: 'خدمة سريعة ومضمونة لإرسال واستلام الطرود والرسائل والأمانات مع تتبع مباشر',
        icon: 'package-delivery',
        isActive: true,
        offices: [motasaderOffice, oulaOffice, ofooqOffice],
      },
      {
        name: 'رحلات سياحية وعمرة',
        description: 'تنظيم رحلات العمرة والزيارات السياحية الدينية والترفيهية بحافلات مجهزة وخدمات ضيافة',
        icon: 'bus-tourism',
        isActive: true,
        offices: [eagleOffice, qaemaOffice, buraqOffice],
      },
      {
        name: 'تأجير حافلات وسيارات',
        description: 'تأجير حافلات وسيارات كاملة مع سائق للمجموعات والشركات والفعاليات',
        icon: 'van-rental',
        isActive: true,
        offices: [eagleOffice, rowadOffice, yamamaOffice],
      },
    ];

    const savedServicesMap = new Map<string, Service>();
    for (const serv of demoServices) {
      let service = await serviceRepository.findOne({
        where: { name: serv.name },
        relations: { offices: true },
      });
      if (service) {
        service.description = serv.description;
        service.icon = serv.icon;
        service.isActive = serv.isActive;
        service.offices = serv.offices;
        service = await serviceRepository.save(service);
      } else {
        service = await serviceRepository.save(serviceRepository.create(serv));
      }
      savedServicesMap.set(service.name, service);
      console.log(`  ⭐ خدمة "${service.name}" (مرتبط بها ${service.offices.length} مكاتب)`);
    }

    // ────────────────────────────────────────────────────
    // 3. الرحلات التفصيلية (Trips) عبر تواريخ مختلفة
    // ────────────────────────────────────────────────────
    console.log('\n🎫 جاري إنشاء وتحديث الرحلات التفصيلية...');

    const intlService = savedServicesMap.get('نقل دولي')!;
    const sharedService = savedServicesMap.get('نقل تشاركي')!;
    const vipService = savedServicesMap.get('نقل خاص VIP')!;
    const tourService = savedServicesMap.get('رحلات سياحية وعمرة')!;

    const demoTrips: Partial<Trip>[] = [
      // ────────── رحلات الخميس 19 نوفمبر 2026 ──────────
      {
        tripNumber: '93720-0',
        serviceId: intlService.id,
        officeId: motasaderOffice.id,
        fromCity: 'عدن',
        toCity: 'الرياض',
        route: 'عدن - عتق - منفذ الوديعة - الرياض',
        departureDate: '2026-11-19',
        departureTime: '08:00',
        originalPrice: 290,
        discountedPrice: 265,
        currency: 'SAR',
        totalSeats: 50,
        availableSeats: 0,
        status: TripStatus.STARTED,
        rating: 4.9,
        ratingCount: 110,
        driverName: 'سائق شركة المتصدر',
        vehicleType: 'حافلة مرسيدس ترافجو VIP',
        vehicleImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957',
        notes: 'الرحلة انطلقت بالفعل في موعدها. الدفع للحساب الرسمي للشركة.',
      },
      {
        tripNumber: '61019-1',
        serviceId: sharedService.id,
        officeId: yamamaOffice.id,
        fromCity: 'المدينة المنورة',
        toCity: 'جدة',
        route: 'المدينة المنورة - رابغ - جدة',
        departureDate: '2026-11-19',
        departureTime: '17:00',
        originalPrice: 85,
        discountedPrice: 70,
        currency: 'SAR',
        totalSeats: 7,
        availableSeats: 2,
        status: TripStatus.UPCOMING,
        rating: 4.8,
        ratingCount: 45,
        driverName: 'سائق مؤسسة اليمامة',
        vehicleType: 'تويوتا إنوفا 2025 عائلية',
        vehicleImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341',
        notes: 'رحلة سريعة تشاركية ومريحة.',
      },

      // ────────── رحلات الجمعة 20 نوفمبر 2026 (تطابق الصور بدقة) ──────────
      {
        tripNumber: '93726-0',
        serviceId: intlService.id,
        officeId: motasaderOffice.id,
        fromCity: 'عدن',
        toCity: 'الدمام',
        route: 'عدن - الرياض - الدمام',
        departureDate: '2026-11-20',
        departureTime: '13:00',
        originalPrice: 300,
        discountedPrice: 279,
        currency: 'SAR',
        totalSeats: 50,
        availableSeats: 0,
        status: TripStatus.STARTED,
        rating: 5.0,
        ratingCount: 142,
        driverName: 'سائق شركة المتصدر',
        vehicleType: 'حافلة VIP مرسيدس ترافجو',
        vehicleImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957',
        notes: 'التذكرة بسعر الشركة... والدفع إلى الحساب الرسمي. تشمل وجبة خفيفة ومشروبات وخدمة واي فاي.',
      },
      {
        tripNumber: '88410-2',
        serviceId: intlService.id,
        officeId: buraqOffice.id,
        fromCity: 'صنعاء',
        toCity: 'الرياض',
        route: 'صنعاء - مأرب - منفذ الوديعة - الرياض',
        departureDate: '2026-11-20',
        departureTime: '14:30',
        originalPrice: 310,
        discountedPrice: 280,
        currency: 'SAR',
        totalSeats: 48,
        availableSeats: 14,
        status: TripStatus.UPCOMING,
        rating: 4.8,
        ratingCount: 78,
        driverName: 'كابتن نبيل البراق',
        vehicleType: 'حافلة فولفو 9900 فارهة',
        vehicleImage: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e',
        notes: 'خدمة راقية تشمل شواحن ومقاعد تدليك مريحة.',
      },
      {
        tripNumber: '44201-3',
        serviceId: tourService.id,
        officeId: eagleOffice.id,
        fromCity: 'جدة',
        toCity: 'مكة المكرمة',
        route: 'مطار الملك عبدالعزيز (جدة) - الحرم المكي',
        departureDate: '2026-11-20',
        departureTime: '19:00',
        originalPrice: 60,
        discountedPrice: 50,
        currency: 'SAR',
        totalSeats: 45,
        availableSeats: 20,
        status: TripStatus.UPCOMING,
        rating: 4.9,
        ratingCount: 160,
        driverName: 'الشيخ منصور الشهري',
        vehicleType: 'حافلة سياحية معتمرين',
        vehicleImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957',
        notes: 'رحلة مباشرة إلى محطة أجياد بالحرم المكي الشريف.',
      },

      // ────────── رحلات السبت 21 نوفمبر 2026 ──────────
      {
        tripNumber: '55102-3',
        serviceId: sharedService.id,
        officeId: rowadOffice.id,
        fromCity: 'عدن',
        toCity: 'الرياض',
        route: 'عدن - صنعاء - الرياض',
        departureDate: '2026-11-21',
        departureTime: '15:30',
        originalPrice: 220,
        discountedPrice: 195,
        currency: 'SAR',
        totalSeats: 8,
        availableSeats: 4,
        status: TripStatus.UPCOMING,
        rating: 4.8,
        ratingCount: 65,
        driverName: 'أبو فهد الغامدي',
        vehicleType: 'جي إم سي يوكن XL عائلي',
        vehicleImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf',
        notes: 'رحلة سريعة تشاركية مريحة وواسعة للأمتعة.',
      },
      {
        tripNumber: '73021-4',
        serviceId: intlService.id,
        officeId: oulaOffice.id,
        fromCity: 'المكلا',
        toCity: 'الرياض',
        route: 'المكلا - سيئون - شحن - الرياض',
        departureDate: '2026-11-21',
        departureTime: '07:30',
        originalPrice: 280,
        discountedPrice: 250,
        currency: 'SAR',
        totalSeats: 50,
        availableSeats: 19,
        status: TripStatus.UPCOMING,
        rating: 4.7,
        ratingCount: 52,
        driverName: 'سالم الحضرمي',
        vehicleType: 'باص كينج لونج VIP حديث',
        vehicleImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957',
        notes: 'شامل استراحة غداء وخدمة الشحن السريع.',
      },
      {
        tripNumber: '11921-5',
        serviceId: sharedService.id,
        officeId: ofooqOffice.id,
        fromCity: 'الدمام',
        toCity: 'الرياض',
        route: 'الدمام - بقيق - الهفوف - الرياض',
        departureDate: '2026-11-21',
        departureTime: '16:00',
        originalPrice: 95,
        discountedPrice: 80,
        currency: 'SAR',
        totalSeats: 7,
        availableSeats: 3,
        status: TripStatus.UPCOMING,
        rating: 4.9,
        ratingCount: 38,
        driverName: 'كابتن فيصل الدوسري',
        vehicleType: 'هيونداي ستاريا VIP 2025',
        vehicleImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341',
        notes: 'رحلة تشاركية سريعة بين الدمام والرياض.',
      },

      // ────────── رحلات الأحد 22 نوفمبر 2026 ──────────
      {
        tripNumber: '93727-1',
        serviceId: intlService.id,
        officeId: motasaderOffice.id,
        fromCity: 'الرياض',
        toCity: 'عدن',
        route: 'الرياض - منفذ الوديعة - عتق - عدن',
        departureDate: '2026-11-22',
        departureTime: '10:00',
        originalPrice: 300,
        discountedPrice: 260,
        currency: 'SAR',
        totalSeats: 50,
        availableSeats: 18,
        status: TripStatus.UPCOMING,
        rating: 4.9,
        ratingCount: 98,
        driverName: 'سائق شركة المتصدر',
        vehicleType: 'حافلة VIP مكيفة',
        vehicleImage: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e',
        notes: 'رحلة العودة من الرياض إلى عدن مباشرة.',
      },
      {
        tripNumber: '32022-6',
        serviceId: sharedService.id,
        officeId: rowadOffice.id,
        fromCity: 'الرياض',
        toCity: 'جدة',
        route: 'الرياض - القويعية - الطائف - جدة',
        departureDate: '2026-11-22',
        departureTime: '12:00',
        originalPrice: 160,
        discountedPrice: 140,
        currency: 'SAR',
        totalSeats: 7,
        availableSeats: 5,
        status: TripStatus.UPCOMING,
        rating: 4.8,
        ratingCount: 71,
        driverName: 'سائق مكتب الرواد',
        vehicleType: 'تويوتا فورتشنر عائلية',
        vehicleImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf',
        notes: 'خدمة سريعة مع استراحة قهوة مجانية.',
      },

      // ────────── رحلات الاثنين 23 نوفمبر 2026 ──────────
      {
        tripNumber: '78234-4',
        serviceId: intlService.id,
        officeId: qaemaOffice.id,
        fromCity: 'جدة',
        toCity: 'صنعاء',
        route: 'جدة - الطائف - نجران - صنعاء',
        departureDate: '2026-11-23',
        departureTime: '08:00',
        originalPrice: 320,
        discountedPrice: 290,
        currency: 'SAR',
        totalSeats: 48,
        availableSeats: 25,
        status: TripStatus.UPCOMING,
        rating: 4.7,
        ratingCount: 81,
        driverName: 'كابتن ماجد القرني',
        vehicleType: 'باص سياحي ممتاز',
        vehicleImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957',
        notes: 'شاشات ترفيهية وشواحن USB لكل مقعد.',
      },
      {
        tripNumber: '55023-7',
        serviceId: tourService.id,
        officeId: eagleOffice.id,
        fromCity: 'مكة المكرمة',
        toCity: 'المدينة المنورة',
        route: 'مكة المكرمة - قطار الحرمين موازياً - المدينة المنورة',
        departureDate: '2026-11-23',
        departureTime: '14:00',
        originalPrice: 90,
        discountedPrice: 75,
        currency: 'SAR',
        totalSeats: 49,
        availableSeats: 32,
        status: TripStatus.UPCOMING,
        rating: 4.9,
        ratingCount: 130,
        driverName: 'كابتن أحمد النسر',
        vehicleType: 'حافلة VIP رحلات زيارة',
        vehicleImage: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e',
        notes: 'زيارة مسجد قباء وموقع أحد ضمن البرنامج.',
      },

      // ────────── رحلات الثلاثاء 24 نوفمبر 2026 ──────────
      {
        tripNumber: '99401-5',
        serviceId: vipService.id,
        officeId: ofooqOffice.id,
        fromCity: 'الدمام',
        toCity: 'الرياض',
        route: 'الدمام - الخبر - الرياض',
        departureDate: '2026-11-24',
        departureTime: '16:00',
        originalPrice: 450,
        discountedPrice: 400,
        currency: 'SAR',
        totalSeats: 4,
        availableSeats: 4,
        status: TripStatus.UPCOMING,
        rating: 5.0,
        ratingCount: 40,
        driverName: 'سائق الأفق الخاص',
        vehicleType: 'مرسيدس S-Class VIP',
        vehicleImage: 'https://images.unsplash.com/photo-1563720223185-11003d516935',
        notes: 'خدمة خاصة VIP من الباب إلى الباب مع سائق بزي رسمي.',
      },
      {
        tripNumber: '88124-8',
        serviceId: intlService.id,
        officeId: buraqOffice.id,
        fromCity: 'الرياض',
        toCity: 'صنعاء',
        route: 'الرياض - السليل - شرورة - مأرب - صنعاء',
        departureDate: '2026-11-24',
        departureTime: '09:00',
        originalPrice: 310,
        discountedPrice: 275,
        currency: 'SAR',
        totalSeats: 50,
        availableSeats: 21,
        status: TripStatus.UPCOMING,
        rating: 4.8,
        ratingCount: 92,
        driverName: 'سائق شركة البراق',
        vehicleType: 'حافلة حديثة مكيفة',
        vehicleImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957',
        notes: 'رحلة العودة الأسبوعية المنتظمة.',
      },

      // ────────── رحلات الأربعاء 25 نوفمبر 2026 ──────────
      {
        tripNumber: '67025-9',
        serviceId: sharedService.id,
        officeId: yamamaOffice.id,
        fromCity: 'المدينة المنورة',
        toCity: 'الرياض',
        route: 'المدينة المنورة - القصيم - الرياض',
        departureDate: '2026-11-25',
        departureTime: '11:00',
        originalPrice: 150,
        discountedPrice: 130,
        currency: 'SAR',
        totalSeats: 8,
        availableSeats: 6,
        status: TripStatus.UPCOMING,
        rating: 4.8,
        ratingCount: 50,
        driverName: 'كابتن إبراهيم الأنصاري',
        vehicleType: 'فان هيونداي H1 عائلي',
        vehicleImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341',
        notes: 'رحلة هادئة ومريحة مع توقف في بريدة.',
      },
      {
        tripNumber: '99025-10',
        serviceId: vipService.id,
        officeId: qaemaOffice.id,
        fromCity: 'جدة',
        toCity: 'الرياض',
        route: 'جدة - مطار الملك خالد الدولي (الرياض)',
        departureDate: '2026-11-25',
        departureTime: '18:00',
        originalPrice: 600,
        discountedPrice: 520,
        currency: 'SAR',
        totalSeats: 4,
        availableSeats: 4,
        status: TripStatus.UPCOMING,
        rating: 5.0,
        ratingCount: 33,
        driverName: 'سائق القمة VIP',
        vehicleType: 'لكزس ES350 فارهة',
        vehicleImage: 'https://images.unsplash.com/photo-1563720223185-11003d516935',
        notes: 'خدمة رجال أعمال وتنقل فاخر بين جدة والرياض.',
      },
    ];

    for (const tripData of demoTrips) {
      let trip = await tripRepository.findOne({
        where: { tripNumber: tripData.tripNumber },
      });
      if (trip) {
        Object.assign(trip, tripData);
        await tripRepository.save(trip);
      } else {
        await tripRepository.save(tripRepository.create(tripData));
      }
      console.log(`  🚌 رحلة #${tripData.tripNumber} (${tripData.fromCity} ➔ ${tripData.toCity}) [${tripData.discountedPrice || tripData.originalPrice} ${tripData.currency}] بتاريخ ${tripData.departureDate}`);
    }

    // ────────────────────────────────────────────────────
    // 4. الحجوزات التجريبية (Bookings with Invoices)
    // ────────────────────────────────────────────────────
    console.log('\n📄 جاري إنشاء الحجوزات التجريبية والفواتير...');

    const saraUser = savedUsersMap.get('sara.mansour@gmail.com')!;
    const mohammedUser = savedUsersMap.get('mohammed.q@gmail.com')!;
    const khalidUser = savedUsersMap.get('khalid.otaibi@gmail.com')!;

    const trip1 = await tripRepository.findOne({ where: { tripNumber: '93726-0' } });
    const trip2 = await tripRepository.findOne({ where: { tripNumber: '55102-3' } });
    const trip3 = await tripRepository.findOne({ where: { tripNumber: '78234-4' } });

    if (trip1 && trip2 && trip3) {
      const demoBookings: Partial<Booking>[] = [
        // 1. حجز مؤكد مع إرفاق الفاتورة ومطابقتها (شركة المتصدر)
        {
          bookingNumber: 'BK-93726-0-1049',
          userId: saraUser.id,
          tripId: trip1.id,
          seatsCount: 2,
          seatNumbers: '14, 15',
          pricePerSeat: Number(trip1.discountedPrice || trip1.originalPrice),
          totalAmount: Number(trip1.discountedPrice || trip1.originalPrice) * 2,
          currency: 'SAR',
          passengers: [
            { fullName: 'سارة المنصور', phone: '+966541112233', identityNumber: '1098765432' },
            { fullName: 'نورة المنصور', phone: '+966541112234', identityNumber: '1098765433' },
          ],
          paymentMethod: 'تحويل بنكي - مصرف الراجحي',
          invoiceNumber: 'TRX-93821049',
          invoiceImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c',
          paymentNotes: 'تم التحويل إلى الحساب الرسمي لشركة المتصدر للنقل الدولي - رقم العملية 93821049',
          paymentSentAt: new Date(),
          status: BookingStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
        // 2. حجز تم إرسال فاتورته وهو قيد مراجعة المكتب (مكتب الرواد)
        {
          bookingNumber: 'BK-55102-3-2051',
          userId: mohammedUser.id,
          tripId: trip2.id,
          seatsCount: 1,
          seatNumbers: '3',
          pricePerSeat: Number(trip2.discountedPrice || trip2.originalPrice),
          totalAmount: Number(trip2.discountedPrice || trip2.originalPrice),
          currency: 'SAR',
          passengers: [
            { fullName: 'محمد القحطاني', phone: '+966542223344', identityNumber: '1087654321' },
          ],
          paymentMethod: 'حوالة شبكة الكريمي السريعة',
          invoiceNumber: 'KUR-7749102',
          invoiceImage: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07',
          paymentNotes: 'إشعار تحويل شبكة الكريمي - مستلم: مكتب الرواد للخدمات',
          paymentSentAt: new Date(),
          status: BookingStatus.PAYMENT_UNDER_REVIEW,
        },
        // 3. حجز جديد بانتظار سداد وإرفاق الفاتورة من العميل (مكتب القمة)
        {
          bookingNumber: 'BK-78234-4-3094',
          userId: khalidUser.id,
          tripId: trip3.id,
          seatsCount: 1,
          seatNumbers: '22',
          pricePerSeat: Number(trip3.discountedPrice || trip3.originalPrice),
          totalAmount: Number(trip3.discountedPrice || trip3.originalPrice),
          currency: 'SAR',
          passengers: [
            { fullName: 'خالد العتيبي', phone: '+966544445566', identityNumber: '1076543210' },
          ],
          paymentMethod: 'تحويل بنكي للحساب الرسمي',
          status: BookingStatus.PENDING_PAYMENT,
        },
      ];

      for (const bookingData of demoBookings) {
        let booking = await bookingRepository.findOne({
          where: { bookingNumber: bookingData.bookingNumber },
        });
        if (booking) {
          Object.assign(booking, bookingData);
          await bookingRepository.save(booking);
        } else {
          await bookingRepository.save(bookingRepository.create(bookingData));
        }
        console.log(`  🎫 حجز #${bookingData.bookingNumber} [${bookingData.status}] بقيمة ${bookingData.totalAmount} ${bookingData.currency}`);
      }
    }

    console.log('\n✨ تمت زراعة وتحديث كافة البيانات التجريبية بنجاح!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 الإحصائيات الحالية:');
    console.log(`  • إجمالي المستخدمين والمكاتب: ${demoUsers.length}`);
    console.log(`  • إجمالي الخدمات المتاحة: ${demoServices.length}`);
    console.log(`  • إجمالي الرحلات المجدولة: ${demoTrips.length}`);
    console.log(`  • إجمالي الحجوزات التجريبية: 3`);
    console.log('🔑 كلمة المرور الموحدة لجميع الحسابات: Password@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
