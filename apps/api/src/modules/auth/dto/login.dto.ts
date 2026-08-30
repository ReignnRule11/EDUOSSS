import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin@eduos.local" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "ChangeMe123!" })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    example: "bright-future-academy",
    description: "Tenant slug. Falls back to the X-Tenant-Id header.",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tenantSlug?: string;
}
