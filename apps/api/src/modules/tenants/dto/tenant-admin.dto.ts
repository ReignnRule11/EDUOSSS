import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ArrayUnique,
} from "class-validator";

const PLANS = ["FREE", "PRO", "ENTERPRISE"] as const;
const SUBSCRIPTION_STATUSES = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
] as const;

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: PLANS })
  @IsOptional()
  @IsIn(PLANS)
  plan?: (typeof PLANS)[number];

  @ApiPropertyOptional({ enum: SUBSCRIPTION_STATUSES })
  @IsOptional()
  @IsIn(SUBSCRIPTION_STATUSES)
  subscriptionStatus?: (typeof SUBSCRIPTION_STATUSES)[number];

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  subscriptionExpiresAt?: Date;

  @ApiPropertyOptional({ description: "Maximum allowed user seats" })
  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;
}

export class UpdateModulesDto {
  @ApiProperty({
    example: ["academics", "attendance", "grades", "finance", "library"],
    description: "Modules enabled for this tenant",
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  enabledModules: string[];
}

export class UpdateBrandingDto {
  @ApiPropertyOptional({ description: "Public logo URL" })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    type: Object,
    description:
      "Branding settings: primaryColor, secondaryColor, font, logoUrl, theme",
  })
  @IsOptional()
  branding?: Record<string, unknown>;
}

export class AddTenantDomainDto {
  @ApiProperty({ example: "school.example.com" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  domain: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  isPrimary?: boolean;
}

export class UpdateStorageQuotaDto {
  @ApiProperty({ example: 53687091200, description: "Storage quota in bytes" })
  @IsInt()
  @Min(1048576)
  storageQuota: number;
}
