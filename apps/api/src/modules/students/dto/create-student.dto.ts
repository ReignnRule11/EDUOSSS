import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AcademicStatus, Gender } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateStudentDto {
  @ApiProperty({ example: "BFA/2026/0005" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  admissionNumber: string;

  @ApiProperty({ example: "schoolId" })
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty({ example: "Zainab" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: "Lawal" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({ type: String, format: "date" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @ApiPropertyOptional({ example: "PRIMARY" })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({ enum: AcademicStatus, default: AcademicStatus.ACTIVE })
  @IsOptional()
  @IsEnum(AcademicStatus)
  academicStatus?: AcademicStatus;

  @ApiPropertyOptional({ example: "Ibrahim Lawal" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  guardianName?: string;

  @ApiPropertyOptional({ example: "+234-800-000-0011" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  guardianPhone?: string;

  @ApiPropertyOptional({ example: "guardian@example.com" })
  @IsOptional()
  @IsEmail()
  guardianEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({
    description: "Link an existing user account as login identity",
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
