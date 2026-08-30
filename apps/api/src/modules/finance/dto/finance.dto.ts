import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  DiscountType,
  FeeType,
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class CreateFeeStructureDto {
  @ApiProperty({ example: "clcclass" })
  @IsString()
  @IsNotEmpty()
  classGroupId: string;

  @ApiProperty({ example: "2026/2027" })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty({ example: "FIRST" })
  @IsString()
  @IsNotEmpty()
  term: string;

  @ApiProperty({ example: "Tuition" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ enum: FeeType })
  @IsOptional()
  @IsEnum(FeeType)
  feeType?: FeeType;

  @ApiProperty({ example: 50000, minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class UpdateFeeStructureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: FeeType })
  @IsOptional()
  @IsEnum(FeeType)
  feeType?: FeeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryFeeStructuresDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classGroupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  term?: string;
}

export class GenerateInvoiceDto {
  @ApiProperty({ example: "clcstudent" })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: "clcclass" })
  @IsString()
  @IsNotEmpty()
  classGroupId: string;

  @ApiProperty({ example: "2026/2027" })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty({ example: "FIRST" })
  @IsString()
  @IsNotEmpty()
  term: string;

  @ApiPropertyOptional({ description: "Optional discount id to apply" })
  @IsOptional()
  @IsString()
  discountId?: string;

  @ApiPropertyOptional({ description: "Optional due date ISO" })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class GenerateClassInvoicesDto {
  @ApiProperty({ example: "clcclass" })
  @IsString()
  @IsNotEmpty()
  classGroupId: string;

  @ApiProperty({ example: "2026/2027" })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty({ example: "FIRST" })
  @IsString()
  @IsNotEmpty()
  term: string;

  @ApiPropertyOptional({ description: "Optional discount id to apply" })
  @IsOptional()
  @IsString()
  discountId?: string;
}

export class QueryInvoicesDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classGroupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  term?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class RecordPaymentDto {
  @ApiProperty({ example: 20000, minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ example: "Cash at school counter" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class QueryPaymentsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class CreateDiscountDto {
  @ApiProperty({ example: "Sibling discount" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsNumber()
  @Min(0)
  value: number;
}

export class UpdateDiscountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateScholarshipDto {
  @ApiProperty({ example: "clcstudent" })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: "Merit scholarship" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType;

  @ApiProperty({ example: 25, minimum: 0 })
  @IsNumber()
  @Min(0)
  value: number;
}

export class UpdateScholarshipDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PaymentGatewayConfigDto {
  @ApiProperty({ example: "paystack" })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ example: "sk_live_xxx" })
  @IsString()
  @IsNotEmpty()
  secretKey: string;

  @ApiPropertyOptional({ example: "pk_live_xxx" })
  @IsOptional()
  @IsString()
  publicKey?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
