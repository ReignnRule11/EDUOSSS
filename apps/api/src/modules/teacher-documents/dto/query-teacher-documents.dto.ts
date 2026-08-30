import { ApiPropertyOptional } from "@nestjs/swagger";
import { TeacherDocumentCategory } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryTeacherDocumentsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiPropertyOptional({ enum: TeacherDocumentCategory })
  @IsOptional()
  @IsEnum(TeacherDocumentCategory)
  category?: TeacherDocumentCategory;
}
