import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TenantStatus } from "@prisma/client";
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

export class CreateTenantDto {
  @ApiProperty({ example: "Bright Future Academy" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: "bright-future-academy" })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase alphanumeric with dashes",
  })
  @MaxLength(80)
  slug: string;

  @ApiPropertyOptional({ enum: TenantStatus, default: TenantStatus.TRIAL })
  @IsOptional()
  @IsIn(Object.values(TenantStatus))
  status: TenantStatus = TenantStatus.TRIAL;

  @ApiPropertyOptional({
    type: Object,
    description: "Arbitrary tenant settings (JSON)",
  })
  @IsOptional()
  settings?: Record<string, unknown>;
}
