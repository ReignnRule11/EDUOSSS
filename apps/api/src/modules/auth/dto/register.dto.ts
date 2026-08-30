import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

const SELF_SERVICE_ROLES = ["STUDENT", "PARENT"] as const;

export class RegisterDto {
  @ApiProperty({ example: "Amina" })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: "Bello" })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: "amina.bello@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "S3curePass123!" })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: "STUDENT", enum: [...SELF_SERVICE_ROLES] })
  @IsOptional()
  @IsIn(SELF_SERVICE_ROLES)
  role: (typeof SELF_SERVICE_ROLES)[number] = "STUDENT";

  @ApiPropertyOptional({ example: "bright-future-academy" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tenantSlug?: string;
}
