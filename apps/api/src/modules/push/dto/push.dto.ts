import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class SubscribeDto {
  @ApiProperty({ example: "https://fcm.googleapis.com/..." })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({
    description: "The subscription keys object (p256dh, auth)",
  })
  @IsObject()
  keys: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class SendPushDto {
  @ApiProperty({ example: "Fee due reminder" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: "Your tuition balance is now due." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional({ example: "/dashboard/finance" })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: "Restrict recipients to specific user ids",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];
}
