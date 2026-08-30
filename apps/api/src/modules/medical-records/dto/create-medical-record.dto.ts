import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MedicalRecordType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateMedicalRecordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ enum: MedicalRecordType, default: MedicalRecordType.CHECKUP })
  @IsOptional()
  @IsEnum(MedicalRecordType)
  recordType?: MedicalRecordType;

  @ApiProperty({ example: "Annual checkup" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: "Routine physical examination" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ type: String, format: "date" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  recordDate?: Date;

  @ApiPropertyOptional({ example: "Follow up in six months" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
