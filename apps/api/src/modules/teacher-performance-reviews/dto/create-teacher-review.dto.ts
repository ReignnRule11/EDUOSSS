import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReviewRating } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateTeacherReviewDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiPropertyOptional({ example: "2024/2025" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  academicYear?: string;

  @ApiProperty()
  @IsDateString()
  reviewDate: string;

  @ApiProperty({ enum: ReviewRating })
  @IsEnum(ReviewRating)
  rating: ReviewRating;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  strengths?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  improvements?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;
}
