import { Role } from "@eduos/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { CreateTenantDto } from "./dto/create-tenant.dto";
import { OnboardTenantDto } from "./dto/onboard-tenant.dto";
import { QueryTenantsDto } from "./dto/query-tenants.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";
import { TenantsService } from "./tenants.service";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("Tenants")
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN)
@Controller("tenants")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: "Create a tenant (platform super admin only)" })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List tenants with pagination, search and filters" })
  findAll(@Query() query: QueryTenantsDto) {
    return this.tenantsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a tenant by id" })
  findOne(@Param("id") id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a tenant" })
  update(@Param("id") id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete a tenant" })
  remove(@Param("id") id: string) {
    return this.tenantsService.remove(id);
  }
}

/** Public tenant onboarding endpoints (rate limited). */
@ApiTags("Tenants - Onboarding")
@Controller("tenants/onboarding")
export class TenantOnboardingController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Post()
  @ApiOperation({
    summary:
      "Onboard a new school tenant atomically (tenant + admin + school + membership)",
  })
  onboard(@Body() dto: OnboardTenantDto) {
    return this.tenantsService.onboard(dto);
  }

  @Public()
  @Get("config")
  @ApiOperation({
    summary: "Public onboarding configuration (plans, default modules)",
  })
  config() {
    return {
      plans: ["FREE", "PRO", "ENTERPRISE"],
      defaultModules: ["academics", "attendance", "grades", "finance"],
      tenantResolutionModes: ["header", "domain", "subdomain"],
    };
  }
}
