import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentCategory } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateStudentDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: "Birth certificate.pdf" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: DocumentCategory, default: DocumentCategory.OTHER })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ example: "Official copy from hospital" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
