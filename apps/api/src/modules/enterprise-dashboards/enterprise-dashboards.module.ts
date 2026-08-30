import { Module } from "@nestjs/common";

import { EnterpriseDashboardsController } from "./enterprise-dashboards.controller";
import { EnterpriseDashboardsService } from "./enterprise-dashboards.service";

@Module({
  controllers: [EnterpriseDashboardsController],
  providers: [EnterpriseDashboardsService],
  exports: [EnterpriseDashboardsService],
})
export class EnterpriseDashboardsModule {}
