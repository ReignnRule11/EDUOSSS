import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsIn, IsOptional, IsString } from "class-validator";

export class NotifyParentsDto {
  @ApiProperty({ example: "2026-09-01", default: "today" })
  @Type(() => Date)
  @IsDate()
  date: Date;

  @ApiPropertyOptional({ description: "Notify only this class" })
  @IsOptional()
  @IsString()
  classGroupId?: string;

  @ApiPropertyOptional({ description: "Notify only this student" })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({
    description: "Which records to notify for",
    enum: ["ABSENT", "LATE"],
    default: "ABSENT",
  })
  @IsOptional()
  @IsIn(["ABSENT", "LATE"])
  status?: "ABSENT" | "LATE";
}
