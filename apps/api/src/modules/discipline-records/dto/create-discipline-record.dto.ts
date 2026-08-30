import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  DisciplineCategory,
  DisciplineSeverity,
  DisciplineStatus,
} from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateDisciplineRecordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ enum: DisciplineCategory })
  @IsEnum(DisciplineCategory)
  category: DisciplineCategory;

  @ApiProperty({ enum: DisciplineSeverity })
  @IsEnum(DisciplineSeverity)
  severity: DisciplineSeverity;

  @ApiProperty({ type: String, format: "date" })
  @Type(() => Date)
  @IsDate()
  incidentDate: Date;

  @ApiProperty({ example: "Disruptive behaviour during class" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ example: "Verbal warning issued" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  actionTaken?: string;

  @ApiPropertyOptional({
    enum: DisciplineStatus,
    default: DisciplineStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(DisciplineStatus)
  status?: DisciplineStatus;
}
