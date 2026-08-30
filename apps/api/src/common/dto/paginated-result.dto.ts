import { ApiProperty } from "@nestjs/swagger";

import { PaginationMetaDto } from "./pagination-meta.dto";

/** Swagger-friendly generic paginated envelope. */
export class PaginatedResultDto<T> {
  @ApiProperty({ isArray: true })
  items: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
