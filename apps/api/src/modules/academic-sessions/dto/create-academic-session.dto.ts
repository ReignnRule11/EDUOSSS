import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SessionStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateAcademicSessionDto {
  @ApiProperty({ example: "2026/2027 Academic Year" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: "2026-2027" })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(30)
  code: string;

  @ApiPropertyOptional({ type: String, format: "date" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ type: String, format: "date" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ enum: SessionStatus, default: SessionStatus.UPCOMING })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;
}
