import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateAssignmentDto {
  @ApiProperty({ example: "Build a landing page" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: "Deliver a responsive landing page..." })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  instructions?: string;

  @ApiPropertyOptional({ example: "ckx...lesson" })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxScore?: number;
}

export class SubmitAssignmentDto {
  @ApiPropertyOptional({ example: "Here is my submission..." })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @ApiPropertyOptional({
    example: "/storage/tenantId/2026/submission.pdf",
  })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

export class GradeSubmissionDto {
  @ApiProperty({ example: 85 })
  @IsInt()
  @Min(0)
  score: number;

  @ApiPropertyOptional({ example: "Great work, watch your spacing." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
