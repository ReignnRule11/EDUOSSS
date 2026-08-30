import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateStudentTransferDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional({ description: "School being transferred from" })
  @IsOptional()
  @IsString()
  fromSchoolId?: string;

  @ApiProperty({ description: "Destination school" })
  @IsString()
  @IsNotEmpty()
  toSchoolId: string;

  @ApiPropertyOptional({ description: "Destination class group (optional)" })
  @IsOptional()
  @IsString()
  toClassGroupId?: string;

  @ApiPropertyOptional({ example: "Family relocation" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiProperty({ type: String, format: "date" })
  @Type(() => Date)
  @IsDate()
  transferDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
