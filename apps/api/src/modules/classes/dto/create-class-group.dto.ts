import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GradeLevel } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateClassGroupDto {
  @ApiProperty({ example: "Primary 4A" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: "schoolId" })
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @ApiPropertyOptional({ enum: GradeLevel, default: GradeLevel.PRIMARY })
  @IsOptional()
  @IsEnum(GradeLevel)
  gradeLevel?: GradeLevel;

  @ApiPropertyOptional({ example: "P4A" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  roomNumber?: string;

  @ApiPropertyOptional({ default: 40 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity?: number;

  @ApiPropertyOptional({ description: "Teacher id acting as head teacher" })
  @IsOptional()
  @IsString()
  headTeacherId?: string;

  @ApiPropertyOptional({ example: "2026/2027" })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
