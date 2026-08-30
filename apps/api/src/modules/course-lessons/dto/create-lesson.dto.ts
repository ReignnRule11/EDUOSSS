import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateLessonDto {
  @ApiProperty({ example: "HTML Fundamentals" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: "Learn the building blocks of the web." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @ApiPropertyOptional({
    example: "## Overview\nLesson body (markdown or HTML supported)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;

  @ApiPropertyOptional({
    example: "/storage/tenantId/2026/abc.mp4",
    description: "Public URL of an uploaded video (see Files media upload)",
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({
    example: "/storage/tenantId/2026/abc.mp3",
  })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({
    example: "/storage/tenantId/2026/abc.pdf",
  })
  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @ApiPropertyOptional({ default: 0, description: "Position in the course" })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: "Estimated duration in minutes" })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;
}
