import { Module } from "@nestjs/common";

import {
  DiscountsController,
  FeeStructuresController,
  FinanceDashboardController,
  InvoicesController,
  PaymentsController,
} from "./finance.controller";
import { FinanceService } from "./finance.service";

@Module({
  controllers: [
    FeeStructuresController,
    DiscountsController,
    InvoicesController,
    PaymentsController,
    FinanceDashboardController,
  ],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
