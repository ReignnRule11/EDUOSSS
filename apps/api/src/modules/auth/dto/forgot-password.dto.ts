import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({ example: "admin@eduos.local" })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: "bright-future-academy" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tenantSlug?: string;
}
