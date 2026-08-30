import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GradeTerm } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateGradeDto {
  @ApiProperty({ example: "studentId" })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: "classGroupId" })
  @IsString()
  @IsNotEmpty()
  classGroupId: string;

  @ApiProperty({ example: "subjectId" })
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({ example: "2026/2027" })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty({ enum: GradeTerm })
  @IsEnum(GradeTerm)
  term: GradeTerm;

  @ApiPropertyOptional({ example: 87, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @ApiPropertyOptional({ example: "Excellent performance" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  remark?: string;
}
