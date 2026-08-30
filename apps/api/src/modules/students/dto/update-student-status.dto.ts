import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AcademicStatus } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateStudentStatusDto {
  @ApiProperty({ enum: AcademicStatus })
  @IsEnum(AcademicStatus)
  @IsNotEmpty()
  status: AcademicStatus;

  @ApiPropertyOptional({ example: "Student re-admitted for the new term" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
