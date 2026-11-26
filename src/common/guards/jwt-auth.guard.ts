import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('يجب تسجيل الدخول أولاً للوصول إلى هذا المورد.');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('صيغة التوكن غير صحيحة.');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET', 'default_secret_key');
      const payload = await this.jwtService.verifyAsync(token, { secret });
      (request as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('التوكن غير صالح أو منتهي الصلاحية.');
    }
  }
}
