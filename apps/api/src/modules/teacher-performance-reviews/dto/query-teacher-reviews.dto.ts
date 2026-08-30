import { ApiPropertyOptional } from "@nestjs/swagger";
import { ReviewRating } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryTeacherReviewsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiPropertyOptional({ enum: ReviewRating })
  @IsOptional()
  @IsEnum(ReviewRating)
  rating?: ReviewRating;
}
