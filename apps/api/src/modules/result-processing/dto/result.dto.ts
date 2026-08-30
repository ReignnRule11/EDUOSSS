import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GradeTerm } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class ResultScaleEntryDto {
  @ApiProperty({ example: 0, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  minScore: number;

  @ApiProperty({ example: 39.99, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  maxScore: number;

  @ApiProperty({ example: "F" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5)
  letterGrade: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  gpa: number;

  @ApiPropertyOptional({ example: "Fail" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  remark?: string;
}

export class CreateResultScaleDto {
  @ApiProperty({ example: "Standard A-F" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: "Default grading scale" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ type: [ResultScaleEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultScaleEntryDto)
  entries?: ResultScaleEntryDto[];
}

export class UpdateResultScaleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertScaleEntriesDto {
  @ApiProperty({ type: [ResultScaleEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultScaleEntryDto)
  entries: ResultScaleEntryDto[];
}

export class CreateTermResultDto {
  @ApiProperty({ example: "clcstudent" })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: "clcclass" })
  @IsString()
  @IsNotEmpty()
  classGroupId: string;

  @ApiProperty({ example: "2026/2027" })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty({ enum: GradeTerm })
  @IsEnum(GradeTerm)
  term: GradeTerm;

  @ApiPropertyOptional({ default: 0.3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  caWeight?: number;

  @ApiPropertyOptional({ default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  examWeight?: number;
}

export class SubjectScoreDto {
  @ApiProperty({ example: "clcsubject" })
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  caScore?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  examScore?: number;
}

export class SaveSubjectScoresDto {
  @ApiProperty({ type: [SubjectScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubjectScoreDto)
  scores: SubjectScoreDto[];
}

export class UpdateTermResultCommentsDto {
  @ApiPropertyOptional({ example: "Good effort this term." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  teacherComment?: string;

  @ApiPropertyOptional({ example: "Approved." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  principalComment?: string;
}

export class QueryTermResultsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: "clcclass" })
  @IsOptional()
  @IsString()
  classGroupId?: string;

  @ApiPropertyOptional({ example: "2026/2027" })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ enum: GradeTerm })
  @IsOptional()
  @IsEnum(GradeTerm)
  term?: GradeTerm;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;
}
