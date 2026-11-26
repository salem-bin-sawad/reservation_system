import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly limitsMap = new Map<string, RateLimitRecord>();
  private readonly maxRequests = 15; // Max 15 requests
  private readonly windowMs = 60 * 1000; // per 1 minute window

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp =
      (request.headers['x-forwarded-for'] as string) ||
      request.socket.remoteAddress ||
      'unknown-ip';
    const key = `${request.path}:${clientIp}`;

    const now = Date.now();
    const record = this.limitsMap.get(key);

    if (!record || now > record.resetTime) {
      this.limitsMap.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (record.count >= this.maxRequests) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'عدد الطلبات كبير جداً، يرجى الانتظار لمدة دقيقة قبل المحاولة مجدداً.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count += 1;
    return true;
  }
}

