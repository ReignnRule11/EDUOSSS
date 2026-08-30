import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class SendMessageDto {
  @ApiProperty({ example: "clcstudent" })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: "Receiver user id (a teacher)" })
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({ example: "Question about homework" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  subject: string;

  @ApiProperty({ example: "Could you clarify the assignment?" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;
}

export class QueryMessagesDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;
}
