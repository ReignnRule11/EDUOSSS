import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TeacherAttendanceStatus } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateTeacherAttendanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ example: "2025-01-15" })
  @IsDateString()
  date: string;

  @ApiProperty({
    enum: TeacherAttendanceStatus,
    default: TeacherAttendanceStatus.PRESENT,
  })
  @IsOptional()
  @IsEnum(TeacherAttendanceStatus)
  status?: TeacherAttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  checkInAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  checkOutAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
