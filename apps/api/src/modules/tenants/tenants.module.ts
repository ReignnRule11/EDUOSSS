import { Module } from "@nestjs/common";

import { TenantResolverService } from "./tenant-resolver.service";
import { TenantSelfServiceController } from "./tenants-self.controller";
import {
  TenantOnboardingController,
  TenantsController,
} from "./tenants.controller";
import { TenantsRepository } from "./tenants.repository";
import { TenantsService } from "./tenants.service";
import { TenantContextMiddleware } from "../../common/middleware/tenant-context.middleware";

@Module({
  controllers: [
    TenantsController,
    TenantOnboardingController,
    TenantSelfServiceController,
  ],
  providers: [
    TenantsService,
    TenantsRepository,
    TenantResolverService,
    TenantContextMiddleware,
  ],
  exports: [
    TenantsService,
    TenantsRepository,
    TenantResolverService,
    TenantContextMiddleware,
  ],
})
export class TenantsModule {}
