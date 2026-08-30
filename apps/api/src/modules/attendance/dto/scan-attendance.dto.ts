import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ScanAttendanceDto {
  @ApiProperty({
    description:
      "QR token issued for the student, or the student admission number",
    example: "EDUOS.ATT.1.<studentId>.<hmac>",
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({
    description:
      "Class to attribute the record to. Defaults to the student's active enrollment",
  })
  @IsOptional()
  @IsString()
  classGroupId?: string;

  @ApiPropertyOptional({ type: String, format: "date", default: "today" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;
}
