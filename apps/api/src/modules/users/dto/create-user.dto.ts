import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserStatus } from "@prisma/client";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export const ASSIGNABLE_ROLES = [
  "PRINCIPAL",
  "VICE_PRINCIPAL",
  "ADMIN_STAFF",
  "TEACHER",
  "BURSAR",
  "LIBRARIAN",
  "STUDENT",
  "PARENT",
] as const;

export class CreateUserDto {
  @ApiProperty({ example: "Amina" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: "Bello" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: "amina.bello@school.example" })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: "Initial password. A temporary one is generated when omitted.",
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({ example: "TEACHER", enum: ASSIGNABLE_ROLES })
  @IsIn(ASSIGNABLE_ROLES)
  role: (typeof ASSIGNABLE_ROLES)[number];

  @ApiPropertyOptional({ example: "+234-800-000-0000" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsIn(Object.values(UserStatus))
  status?: UserStatus;
}
