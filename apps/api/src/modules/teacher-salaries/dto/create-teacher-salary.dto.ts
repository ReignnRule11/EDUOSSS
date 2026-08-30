import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateTeacherSalaryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ example: "2025-01-01" })
  @IsDateString()
  effectiveDate: string;

  @ApiProperty({ example: 250000 })
  @IsNumber()
  @Min(0)
  basicSalary: number;

  @ApiPropertyOptional({ example: 50000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  allowances?: number;

  @ApiPropertyOptional({ example: 20000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deductions?: number;

  @ApiPropertyOptional({ example: "NGN", default: "NGN" })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: "Mark as the teacher's active salary",
    default: true,
  })
  @IsOptional()
  isActive?: boolean;
}
