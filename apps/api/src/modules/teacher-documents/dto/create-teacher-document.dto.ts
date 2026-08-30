import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TeacherDocumentCategory } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateTeacherDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ example: "Teaching Certificate.pdf" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    enum: TeacherDocumentCategory,
    default: TeacherDocumentCategory.OTHER,
  })
  @IsOptional()
  @IsEnum(TeacherDocumentCategory)
  category?: TeacherDocumentCategory;

  @ApiPropertyOptional({ description: "Id of an uploaded file (files/upload)" })
  @IsOptional()
  @IsString()
  fileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
