import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
} from "@prisma/client";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class CreateQuestionDto {
  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ example: "What does HTML stand for?" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;

  @ApiPropertyOptional({ enum: QuestionDifficulty, default: "MEDIUM" })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({ example: "clcxxxxxxxxxxxxxxxx" })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      "MCQ: [{id,text,isCorrect}]; MATCHING: {left:[{id,text}], right:[{id,text}]}",
  })
  @IsOptional()
  options?: unknown;

  @ApiPropertyOptional({
    description:
      "MCQ: {optionId}; TRUE_FALSE: {value}; FILL_BLANK: {answers:[]}; MATCHING: {pairs:[{leftId,rightId}]}",
  })
  @IsOptional()
  correctAnswer?: unknown;

  @ApiPropertyOptional({ example: "It stands for HyperText Markup Language." })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @ApiPropertyOptional({ enum: QuestionStatus, default: "ACTIVE" })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  body?: string;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiPropertyOptional({ enum: QuestionDifficulty })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  options?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  correctAnswer?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @ApiPropertyOptional({ enum: QuestionStatus })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;
}

export class CreateQuestionCategoryDto {
  @ApiProperty({ example: "Mathematics" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: "Algebra, geometry and calculus" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateQuestionCategoryDto {
  @ApiPropertyOptional({ example: "Mathematics" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class QueryQuestionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiPropertyOptional({ enum: QuestionDifficulty })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: QuestionStatus })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;
}

export class AddExamQuestionsDto {
  @ApiProperty({ description: "Question ids to add to the exam" })
  @IsArray()
  @IsString({ each: true })
  questionIds: string[];
}
