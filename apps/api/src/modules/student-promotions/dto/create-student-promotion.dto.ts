import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateStudentPromotionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: "Class the student is leaving" })
  @IsString()
  @IsNotEmpty()
  fromClassGroupId: string;

  @ApiProperty({ description: "Class the student is promoted to" })
  @IsString()
  @IsNotEmpty()
  toClassGroupId: string;

  @ApiProperty({ example: "2027/2028" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  academicYear: string;

  @ApiProperty({ type: String, format: "date" })
  @Type(() => Date)
  @IsDate()
  promotionDate: Date;

  @ApiPropertyOptional({ example: "Graduated to the next grade" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
