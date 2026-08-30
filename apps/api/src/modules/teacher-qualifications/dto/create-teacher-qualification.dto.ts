import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { QualificationLevel } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateTeacherQualificationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ enum: QualificationLevel })
  @IsEnum(QualificationLevel)
  level: QualificationLevel;

  @ApiProperty({ example: "B.Sc. Education" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  degree: string;

  @ApiProperty({ example: "University of Lagos" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  institution: string;

  @ApiPropertyOptional({ example: "Mathematics" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fieldOfStudy?: string;

  @ApiPropertyOptional({ example: 2015 })
  @IsOptional()
  @IsInt()
  yearAchieved?: number;

  @ApiPropertyOptional({ example: "Second Class Upper" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  grade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
