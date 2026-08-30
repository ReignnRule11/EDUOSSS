import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class SwitchTenantDto {
  @ApiProperty({
    description: "Target tenant id or slug (must be an active membership)",
    example: "bright-future-academy",
  })
  @IsString()
  @IsNotEmpty()
  tenantRef: string;
}
