import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, ValidateNested } from "class-validator";

import { CreateStudentDto } from "./create-student.dto";

export class BulkImportStudentsDto {
  @ApiProperty({
    type: [CreateStudentDto],
    description: "Array of student records to create",
  })
  @Type(() => CreateStudentDto)
  @ValidateNested({ each: true })
  students: CreateStudentDto[];

  @ApiPropertyOptional({
    example: true,
    description:
      "When true, existing admission numbers are skipped instead of failing the whole import",
  })
  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;
}
