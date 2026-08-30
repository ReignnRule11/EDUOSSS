import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EnrollmentStatus } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateEnrollmentDto {
  @ApiProperty({ example: "studentId" })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: "classGroupId" })
  @IsString()
  @IsNotEmpty()
  classGroupId: string;

  @ApiProperty({ example: "2026/2027" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  academicYear: string;

  @ApiPropertyOptional({ example: "FIRST" })
  @IsOptional()
  @IsString()
  term?: string;

  @ApiPropertyOptional({
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
