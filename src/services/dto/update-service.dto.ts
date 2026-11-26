import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateServiceDto {
  @ApiPropertyOptional({
    description: 'اسم الخدمة الجديد',
    example: 'نقل دولي فاخر',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'الوصف الجديد للخدمة',
    example: 'رحلات نقل بري دولية VIP بحافلات حديثة',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'الأيقونة أو الصورة الجديدة',
    example: 'bus-vip',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    description: 'تفعيل أو تعطيل الخدمة',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
