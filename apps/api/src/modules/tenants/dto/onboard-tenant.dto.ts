import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class OnboardTenantDto {
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

  @ApiProperty({ example: "John" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  adminFirstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  adminLastName: string;

  @ApiProperty({ example: "admin@academy.example" })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ example: "S3curePass123!" })
  @IsString()
  @MinLength(8)
  adminPassword: string;

  @ApiPropertyOptional({
    example: "Academy High",
    description: "Defaults to the tenant name",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  schoolName?: string;

  @ApiPropertyOptional({
    example: "PRO",
    description: "Initial subscription plan",
  })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({
    example: "academy.example.com",
    description: "Optional custom domain",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;
}
