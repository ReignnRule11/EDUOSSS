import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolType } from "@prisma/client";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateSchoolDto {
  @ApiProperty({ example: "Bright Future Academy" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: "BFA" })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  code: string;

  @ApiPropertyOptional({ enum: SchoolType, default: SchoolType.K_12 })
  @IsOptional()
  @IsIn(Object.values(SchoolType))
  type?: SchoolType;

  @ApiPropertyOptional({ example: "12 Education Avenue, Lekki, Lagos" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ example: "+234-800-000-0000" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: "info@school.example" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "https://school.example" })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: 2005 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  establishedYear?: number;

  @ApiPropertyOptional({ example: "Knowledge is Light" })
  @IsOptional()
  @IsString()
  motto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: "2026/2027" })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
