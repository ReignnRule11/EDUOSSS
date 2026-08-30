import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class QrSheetQueryDto {
  @ApiProperty({ description: "Class to generate the QR sheet for" })
  @IsString()
  @IsNotEmpty()
  classGroupId: string;

  @ApiPropertyOptional({ type: String, format: "date", default: "today" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;
}
