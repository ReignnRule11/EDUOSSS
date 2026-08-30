import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AiFeature } from "@prisma/client";
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

export class LessonPlannerDto {
  @ApiProperty({ example: "Mathematics" })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: "Primary 5" })
  @IsString()
  @IsNotEmpty()
  classLevel: string;

  @ApiProperty({ example: "Fractions" })
  @IsString()
  @IsNotEmpty()
  topic: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: "Group activities and practical examples" })
  @IsOptional()
  @IsString()
  focus?: string;
}

export class QuestionGeneratorDto {
  @ApiProperty({ example: "Mathematics" })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ example: "Fractions" })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ example: "MULTIPLE_CHOICE" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: "MEDIUM" })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  count?: number;

  @ApiPropertyOptional({
    description: "Save generated questions to the question bank",
  })
  @IsOptional()
  @IsBoolean()
  saveToBank?: boolean;
}

export class ReportCommentDto {
  @ApiProperty({ example: "Amina" })
  @IsString()
  @IsNotEmpty()
  studentName: string;

  @ApiProperty({ example: "Mathematics" })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ example: "85" })
  @IsOptional()
  @IsString()
  performance?: string;

  @ApiPropertyOptional({ example: "Consistent effort in homework" })
  @IsOptional()
  @IsString()
  context?: string;
}

export class TutorMessageDto {
  @ApiProperty({ example: "Mathematics" })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: "Explain how to add fractions" })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: "Prior conversation turns" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TutorTurnDto)
  history?: TutorTurnDto[];
}

export class TutorTurnDto {
  @ApiProperty({ enum: ["user", "assistant"] })
  @IsString()
  @IsNotEmpty()
  role: "user" | "assistant";

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class RecommendationDto {
  @ApiProperty({ example: "Amina" })
  @IsString()
  @IsNotEmpty()
  studentName: string;

  @ApiProperty({ example: "Mathematics" })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({
    description: "Weak areas, e.g. ['fractions', 'geometry']",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  weakAreas?: string[];

  @ApiPropertyOptional({ example: "Aiming for distinction" })
  @IsOptional()
  @IsString()
  goal?: string;
}

export class InsightDto {
  @ApiProperty({ example: "Primary 5" })
  @IsString()
  @IsNotEmpty()
  classLevel: string;

  @ApiPropertyOptional({ example: "2026/2027 FIRST" })
  @IsOptional()
  @IsString()
  term?: string;

  @ApiPropertyOptional({
    description:
      "Context data, e.g. {'average': 62, 'gradeDistribution': {...}}",
  })
  @IsOptional()
  context?: Record<string, unknown>;
}

export class CreatePromptTemplateDto {
  @ApiProperty({ enum: AiFeature })
  @IsEnum(AiFeature)
  feature: AiFeature;

  @ApiProperty({ example: "Default lesson plan" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    example:
      "Create a lesson plan for {subject} at {classLevel} covering {topic}.",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  prompt: string;

  @ApiPropertyOptional({ description: "Template variables used in the prompt" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}

export class UpdatePromptTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  prompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryUsageLogsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AiFeature })
  @IsOptional()
  @IsEnum(AiFeature)
  feature?: AiFeature;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class AiConfigDto {
  @ApiProperty({ example: "openai" })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ example: "sk-..." })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiPropertyOptional({ example: "https://api.openai.com/v1" })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ example: "gpt-4o-mini" })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  monthlyLimit?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
