import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ExamStatus } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class CreateExamDto {
  @ApiProperty({ example: "Midterm Mathematics Exam" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({ example: "Covers chapters 1-5" })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    description:
      "Optional random-pick filter. {type?, difficulty?, categoryId?}",
  })
  @IsOptional()
  @IsObject()
  randomPickConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Number of random questions to pick" })
  @IsOptional()
  @IsInt()
  @Min(1)
  randomPickCount?: number;

  @ApiPropertyOptional({ example: "clcxxxxxxxxxxxxxxxx" })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ example: "clcxxxxxxxxxxxxxxxx" })
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passMark?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  negativeMarking?: boolean;

  @ApiPropertyOptional({ default: 0.25 })
  @IsOptional()
  @Min(0)
  negativeMarkingValue?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showResultsOnSubmit?: boolean;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiPropertyOptional({
    description: "ISO date when the exam becomes available",
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({
    description: "ISO date when the exam closes",
  })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class UpdateExamDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  randomPickConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  randomPickCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passMark?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  negativeMarking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Min(0)
  negativeMarkingValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showResultsOnSubmit?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class AddExamQuestionsDto {
  @ApiProperty({ description: "Question ids to add to the exam" })
  @IsArray()
  @IsString({ each: true })
  questionIds: string[];
}

export class RandomizeExamDto {
  @ApiPropertyOptional({
    description:
      "Filter for the random pick. {type?, difficulty?, categoryId?}",
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;
}

export class ReorderExamQuestionsDto {
  @ApiProperty({ description: "All question ids in the new order" })
  @IsArray()
  @IsString({ each: true })
  orderedQuestionIds: string[];
}

export class QueryExamsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ExamStatus })
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;

  @ApiPropertyOptional({ example: "clcxxxxxxxxxxxxxxxx" })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ example: "clcxxxxxxxxxxxxxxxx" })
  @IsOptional()
  @IsString()
  subjectId?: string;
}

export class GradeAttemptDto {
  @ApiProperty({ description: "Per-question essay scores keyed by questionId" })
  @IsObject()
  essayScores: Record<string, number>;
}
