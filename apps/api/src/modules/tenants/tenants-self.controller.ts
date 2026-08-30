import { AuditAction, Permission } from "@eduos/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  type AddTenantDomainDto,
  type UpdateBrandingDto,
  type UpdateModulesDto,
  type UpdateStorageQuotaDto,
  type UpdateSubscriptionDto,
} from "./dto/tenant-admin.dto";
import { TenantsService } from "./tenants.service";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

/**
 * Self-service endpoints for the CURRENT tenant (resolved from the request
 * context). Tenant admins manage branding, subscription, modules, storage
 * and custom domains without leaving their tenant boundary.
 */
@ApiTags("Tenant - Settings")
@ApiBearerAuth()
@Controller("tenant")
export class TenantSelfServiceController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Permissions(Permission.TENANT_READ)
  @ApiOperation({ summary: "Get the current tenant settings" })
  @Cacheable({ ttl: 30 })
  getSettings(@CurrentTenant("id") tenantId: string) {
    return this.tenantsService.getSettings(tenantId);
  }

  @Patch("branding")
  @Permissions(Permission.TENANT_WRITE)
  @ApiOperation({ summary: "Update logo and branding for the current tenant" })
  @Audited({ action: AuditAction.UPDATE, resource: "tenant.branding" })
  updateBranding(
    @CurrentTenant("id") tenantId: string,
    @Body() dto: UpdateBrandingDto,
  ) {
    return this.tenantsService.updateBranding(tenantId, dto);
  }

  @Patch("subscription")
  @Permissions(Permission.TENANT_WRITE)
  @ApiOperation({ summary: "Update the subscription plan / status / seats" })
  @Audited({ action: AuditAction.UPDATE, resource: "tenant.subscription" })
  updateSubscription(
    @CurrentTenant("id") tenantId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.tenantsService.updateSubscription(tenantId, dto);
  }

  @Patch("modules")
  @Permissions(Permission.TENANT_WRITE)
  @ApiOperation({ summary: "Toggle enabled modules for the current tenant" })
  @Audited({ action: AuditAction.UPDATE, resource: "tenant.modules" })
  updateModules(
    @CurrentTenant("id") tenantId: string,
    @Body() dto: UpdateModulesDto,
  ) {
    return this.tenantsService.updateModules(tenantId, dto);
  }

  @Get("usage")
  @Permissions(Permission.TENANT_READ)
  @ApiOperation({ summary: "Storage usage, file count and active seat usage" })
  getUsage(@CurrentTenant("id") tenantId: string) {
    return this.tenantsService.getUsage(tenantId);
  }

  @Patch("storage-quota")
  @Permissions(Permission.TENANT_WRITE)
  @ApiOperation({ summary: "Adjust the storage quota" })
  updateStorageQuota(
    @CurrentTenant("id") tenantId: string,
    @Body() dto: UpdateStorageQuotaDto,
  ) {
    return this.tenantsService.updateStorageQuota(tenantId, dto);
  }

  @Get("domains")
  @Permissions(Permission.TENANT_READ)
  @ApiOperation({ summary: "List custom domains for the current tenant" })
  listDomains(@CurrentTenant("id") tenantId: string) {
    return this.tenantsService.listDomains(tenantId);
  }

  @Post("domains")
  @Permissions(Permission.TENANT_WRITE)
  @ApiOperation({ summary: "Add a custom domain" })
  @Audited({ action: AuditAction.CREATE, resource: "tenant.domain" })
  addDomain(
    @CurrentTenant("id") tenantId: string,
    @Body() dto: AddTenantDomainDto,
  ) {
    return this.tenantsService.addDomain(tenantId, dto);
  }

  @Post("domains/:domainId/verify")
  @Permissions(Permission.TENANT_WRITE)
  @ApiOperation({
    summary: "Mark a custom domain as verified (DNS ownership assumed checked)",
  })
  @Audited({ action: AuditAction.UPDATE, resource: "tenant.domain" })
  verifyDomain(
    @CurrentTenant("id") tenantId: string,
    @Param("domainId") domainId: string,
  ) {
    return this.tenantsService.verifyDomain(tenantId, domainId);
  }

  @Delete("domains/:domainId")
  @Permissions(Permission.TENANT_WRITE)
  @ApiOperation({ summary: "Remove a custom domain" })
  @Audited({ action: AuditAction.DELETE, resource: "tenant.domain" })
  removeDomain(
    @CurrentTenant("id") tenantId: string,
    @Param("domainId") domainId: string,
  ) {
    return this.tenantsService.removeDomain(tenantId, domainId);
  }
}
