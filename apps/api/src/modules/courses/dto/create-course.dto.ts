import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CourseStatus } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateCourseDto {
  @ApiProperty({ example: "Introduction to Web Development" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    example: "A beginner-friendly course covering HTML, CSS and JavaScript.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @ApiPropertyOptional({ example: "Full course description with syllabus..." })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @ApiPropertyOptional({ example: "Beginner" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  level?: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/thumb.jpg" })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: "ckx...subject" })
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional({ example: "ckx...teacher" })
  @IsOptional()
  @IsString()
  instructorId?: string;

  @ApiPropertyOptional({ example: "ckx...school" })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional({ enum: CourseStatus, default: CourseStatus.DRAFT })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;
}
