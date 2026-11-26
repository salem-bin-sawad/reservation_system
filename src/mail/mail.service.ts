import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.configService.get<string>('SMTP_PORT', '587'), 10),
        secure: this.configService.get<string>('SMTP_SECURE') === 'true',
        auth: { user, pass },
      });
      this.logger.log(`📧 SMTP Transporter initialized successfully (${host})`);
    } else {
      this.logger.warn(
        '⚠️ SMTP server credentials not configured in .env. Falling back to terminal log output for development testing.',
      );
    }
  }

  /**
   * Send Email OTP Confirmation
   */
  async sendOtpEmail(email: string, fullName: string, otpCode: string): Promise<boolean> {
    const fromAddress =
      this.configService.get<string>('SMTP_FROM') ||
      '"نظام الحجوزات | Reservation System" <no-reply@reservation-system.com>';

    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>رمز التحقق - نظام الحجوزات</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #10b981 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; }
    .content { padding: 32px 28px; text-align: center; }
    .greeting { font-size: 18px; font-weight: bold; color: #f1f5f9; margin-bottom: 12px; }
    .description { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .otp-box { background: #0f172a; border: 2px dashed #10b981; border-radius: 12px; padding: 18px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #10b981; margin: 0 auto 20px auto; display: inline-block; min-width: 200px; }
    .badge { display: inline-block; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
    .security-notice { background: rgba(15, 23, 42, 0.6); border-right: 4px solid #2563eb; padding: 12px; text-align: right; border-radius: 6px; font-size: 12px; color: #cbd5e1; margin-top: 20px; }
    .footer { background: #0f172a; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>نظام الحجوزات | Reservation System</h1>
    </div>
    <div class="content">
      <div class="greeting">أهلاً بك، ${fullName} 👋</div>
      <div class="description">
        شكراً لتسجيلك معنا. يرجى استخدام رمز التحقق التالي لإكمال تفعيل حسابك:
      </div>
      
      <div class="otp-box">${otpCode}</div>
      
      <div>
        <span class="badge">⏱️ الرمز صالح لمدة 15 دقيقة فقط</span>
      </div>

      <div class="security-notice">
        🔒 <strong>تنبيه أمني:</strong> لا تشارك هذا الرمز مع أي شخص لحماية حسابك.
      </div>
    </div>
    <div class="footer">
      جميع الحقوق محفوظة © 2026 نظام الحجوزات.
    </div>
  </div>
</body>
</html>
    `;

    // Terminal log box display for development / debugging
    this.logger.log(`
┌─────────────────────────────────────────────────────────────┐
│ 🔑 EMAIL OTP VERIFICATION CODE                              │
├─────────────────────────────────────────────────────────────┤
│ Recipient: ${email.padEnd(48)} │
│ Name:      ${fullName.padEnd(48)} │
│ OTP Code:  \x1b[32m\x1b[1m${otpCode}\x1b[0m                                           │
│ Valid For: 15 Minutes                                       │
└─────────────────────────────────────────────────────────────┘
    `);

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: email,
          subject: '🔑 رمز التحقق من الحساب — نظام الحجوزات',
          html: htmlContent,
        });
        this.logger.log(`✅ Email OTP code sent to ${email} via SMTP.`);
        return true;
      } catch (error: any) {
        this.logger.error(`❌ Failed to send SMTP email to ${email}: ${error.message}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Send Password Reset OTP Email
   */
  async sendPasswordResetEmail(email: string, fullName: string, resetCode: string): Promise<boolean> {
    const fromAddress =
      this.configService.get<string>('SMTP_FROM') ||
      '"نظام الحجوزات | Reservation System" <no-reply@reservation-system.com>';

    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>استعادة كلمة المرور - نظام الحجوزات</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
    .header { background: linear-gradient(135deg, #e11d48 0%, #2563eb 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; }
    .content { padding: 32px 28px; text-align: center; }
    .greeting { font-size: 18px; font-weight: bold; color: #f1f5f9; margin-bottom: 12px; }
    .description { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .otp-box { background: #0f172a; border: 2px dashed #f43f5e; border-radius: 12px; padding: 18px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #f43f5e; margin: 0 auto 20px auto; display: inline-block; min-width: 200px; }
    .badge { display: inline-block; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
    .security-notice { background: rgba(15, 23, 42, 0.6); border-right: 4px solid #f43f5e; padding: 12px; text-align: right; border-radius: 6px; font-size: 12px; color: #cbd5e1; margin-top: 20px; }
    .footer { background: #0f172a; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>نظام الحجوزات | Reservation System</h1>
    </div>
    <div class="content">
      <div class="greeting">مرحباً، ${fullName} 🔐</div>
      <div class="description">
        تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك. استخدم الرمز التالي:
      </div>
      
      <div class="otp-box">${resetCode}</div>
      
      <div>
        <span class="badge">⏱️ الرمز صالح لمدة 15 دقيقة فقط</span>
      </div>

      <div class="security-notice">
        🔒 <strong>تنبيه:</strong> إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.
      </div>
    </div>
    <div class="footer">
      جميع الحقوق محفوظة © 2026 نظام الحجوزات.
    </div>
  </div>
</body>
</html>
    `;

    // Terminal log box display for development / debugging
    this.logger.log(`
┌─────────────────────────────────────────────────────────────┐
│ 🔐 PASSWORD RESET OTP CODE                                  │
├─────────────────────────────────────────────────────────────┤
│ Recipient:  ${email.padEnd(47)} │
│ Name:       ${fullName.padEnd(47)} │
│ Reset Code: \x1b[31m\x1b[1m${resetCode}\x1b[0m                                           │
│ Valid For:  15 Minutes                                      │
└─────────────────────────────────────────────────────────────┘
    `);

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: email,
          subject: '🔐 رمز إعادة تعيين كلمة المرور — نظام الحجوزات',
          html: htmlContent,
        });
        this.logger.log(`✅ Password reset OTP email sent to ${email} via SMTP.`);
        return true;
      } catch (error: any) {
        this.logger.error(`❌ Failed to send SMTP password reset email to ${email}: ${error.message}`);
        return false;
      }
    }

    return true;
  }
}

