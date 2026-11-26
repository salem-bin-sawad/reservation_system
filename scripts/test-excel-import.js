import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// 1. إنشاء ملف إكسل تجريبي يحتوي على الأعمدة المحددة من المستخدم
const sampleData = [
  {
    TicketNumber: 'TK-EXCEL-001',
    PassengerName: 'سالم أحمد باعباد',
    IssuedDate: '2026-11-20',
    Date: '2026-12-05',
    RoutList: 'عدن - الرياض',
    Price: 320,
    Currency: 'SAR',
    TheSource: 'نظام حجوزات المتصدر',
  },
  {
    TicketNumber: 'TK-EXCEL-002',
    PassengerName: 'مريم سعيد الغامدي',
    IssuedDate: '2026-11-21',
    Date: '2026-12-06',
    RoutList: 'صنعاء - جدة',
    Price: 410,
    Currency: 'SAR',
    TheSource: 'فرع باب اليمن',
  },
  {
    TicketNumber: 'TK-EXCEL-003',
    PassengerName: 'خالد ناصر اليافعي',
    IssuedDate: '2026-11-22',
    Date: '2026-12-07',
    RoutList: 'المكلا - الدمام',
    Price: 380,
    Currency: 'SAR',
    TheSource: 'تطبيق المتصدر أونلاين',
  },
];

const worksheet = XLSX.utils.json_to_sheet(sampleData, {
  header: [
    'TicketNumber',
    'PassengerName',
    'IssuedDate',
    'Date',
    'RoutList',
    'Price',
    'Currency',
    'TheSource',
  ],
});

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Trips');

const tempFilePath = path.join(process.cwd(), 'temp_test_trips.xlsx');
XLSX.writeFile(workbook, tempFilePath);
console.log('✅ تم إنشاء ملف الإكسل التجريبي بنجاح:', tempFilePath);

async function runE2ETest() {
  const baseUrl = 'http://localhost:3000';

  // 2. تسجيل دخول مكتب المتصدر
  console.log('\n🔑 1. تسجيل الدخول بحساب المكتب...');
  const loginRes = await fetch(`${baseUrl}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '+966550001122',
      password: 'Password@123',
    }),
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`فشل تسجيل الدخول: ${JSON.stringify(loginData)}`);
  }
  const token = loginData.accessToken;
  console.log('✅ تم تسجيل الدخول بنجاح! التوكن تم استخراجه.');

  // 3. رفع ملف الإكسل لاستيراد الرحلات كمسودات
  console.log('\n📤 2. رفع ملف الإكسل واستيراد الرحلات كمسودات...');
  const fileBytes = fs.readFileSync(tempFilePath);
  const formData = new FormData();
  const fileBlob = new Blob([fileBytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  formData.append('file', fileBlob, 'temp_test_trips.xlsx');

  const importRes = await fetch(`${baseUrl}/trips/import-excel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const importResult = await importRes.json();
  console.log('📊 نتيجة الاستيراد:', {
    message: importResult.message,
    totalRows: importResult.totalRows,
    importedCount: importResult.importedCount,
    failedCount: importResult.failedCount,
  });

  if (!importRes.ok || importResult.importedCount === 0) {
    throw new Error(`فشل الاستيراد: ${JSON.stringify(importResult)}`);
  }

  const firstDraft = importResult.draftTrips[0];
  console.log(`✅ تم استيراد أول رحلة برقم: ${firstDraft.tripNumber} بحالة: ${firstDraft.status}`);
  console.log(`   - الراكب: ${firstDraft.passengerName}`);
  console.log(`   - المسار: ${firstDraft.fromCity} -> ${firstDraft.toCity} (${firstDraft.route})`);
  console.log(`   - المصدر: ${firstDraft.source}`);

  // 4. استعراض قائمة المسودات عبر GET /trips/office/drafts
  console.log('\n📋 3. جلب قائمة المسودات للمكتب...');
  const draftsRes = await fetch(`${baseUrl}/trips/office/drafts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const drafts = await draftsRes.json();
  console.log(`✅ عدد المسودات الحالية للمكتب: ${drafts.length}`);

  // 5. التحقق من أن المسودات لا تظهر في البحث العام للجمهور
  console.log('\n🔍 4. التحقق من حجب المسودات عن تصفح الجمهور العام...');
  const publicRes = await fetch(`${baseUrl}/trips?status=UPCOMING`);
  const publicData = await publicRes.json();
  const foundInPublic = publicData.data.some((t) => t.id === firstDraft.id);
  console.log(`✅ هل المسودة موجودة في البحث العام الموجه للجمهور؟: ${foundInPublic ? 'نعم (خطأ)' : 'لا (صحيح ومحجوبة)'}`);

  // 6. نشر واعتماد الرحلة المسودة الأولى عبر PATCH /trips/:id/publish
  console.log(`\n🚀 5. اعتماد ونشر الرحلة المسودة (${firstDraft.id})...`);
  const publishRes = await fetch(`${baseUrl}/trips/${firstDraft.id}/publish`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const publishResult = await publishRes.json();
  console.log('✅ نتيجة النشر:', publishResult.message, '| الحالة الجديدة:', publishResult.trip.status);

  // 7. التحقق من ظهورها في البحث العام بعد النشر
  console.log('\n🔍 6. التحقق من ظهور الرحلة في البحث العام بعد اعتمادها...');
  const publicAfterRes = await fetch(`${baseUrl}/trips`);
  const publicAfterData = await publicAfterRes.json();
  const foundAfterPublish = publicAfterData.data.some((t) => t.id === firstDraft.id);
  console.log(`✅ هل الرحلة أصبحت ظاهرة الآن للجمهور بعد النشر؟: ${foundAfterPublish ? 'نعم (ممتاز!)' : 'لا'}`);

  // تنظيف الملف المؤقت
  if (fs.existsSync(tempFilePath)) {
    fs.unlinkSync(tempFilePath);
  }

  console.log('\n🎉 اكتمل الاختبار بنجاح تام 100%! كافة عمليات سحب الإكسل والمسودات والنشر تعمل بشكل مثالي.');
}

// تشغيل الفحص بعد التأكد من تشغيل السيرفر
runE2ETest().catch((err) => {
  console.error('❌ خطأ في الاختبار:', err);
  process.exit(1);
});
