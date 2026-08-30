import { ApiPropertyOptional } from "@nestjs/swagger";
import { MedicalRecordType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryMedicalRecordsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ enum: MedicalRecordType })
  @IsOptional()
  @IsEnum(MedicalRecordType)
  recordType?: MedicalRecordType;

  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? new Date(value) : value,
  )
  from?: Date;

  @ApiPropertyOptional({ example: "2027-12-31" })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? new Date(value) : value,
  )
  to?: Date;
}
