import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({
    description: 'اسم الخدمة (مثل: نقل دولي، نقل تشاركي، نقل خاص VIP...)',
    example: 'نقل دولي',
  })
  @IsNotEmpty({ message: 'اسم الخدمة مطلوب' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'وصف تفصيلي للخدمة والمزايا المقدمة بها',
    example: 'رحلات نقل بري دولية منتظمة بحافلات حديثة ومكيفة بين المدن والمحافظات',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'اسم الأيقونة أو رابط صورة الخدمة',
    example: 'bus-international',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    description: 'حالة تفعيل الخدمة في النظام',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
