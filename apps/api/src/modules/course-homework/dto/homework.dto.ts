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

export class CreateHomeworkDto {
  @ApiProperty({ example: "Chapter 3 exercises" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: "Complete exercises 1 to 5 at home..." })
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

export class SubmitHomeworkDto {
  @ApiPropertyOptional({ example: "I finished the exercises..." })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @ApiPropertyOptional({
    example: "/storage/tenantId/2026/homework.pdf",
  })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

export class GradeHomeworkDto {
  @ApiProperty({ example: 90 })
  @IsInt()
  @Min(0)
  score: number;

  @ApiPropertyOptional({ example: "Well done!" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
