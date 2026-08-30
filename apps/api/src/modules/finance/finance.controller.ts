import { AuditAction, Permission } from "@eduos/shared";
import type { AuthPrincipal } from "@eduos/shared";
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

import {
  CreateDiscountDto,
  CreateFeeStructureDto,
  CreateScholarshipDto,
  GenerateClassInvoicesDto,
  GenerateInvoiceDto,
  PaymentGatewayConfigDto,
  QueryFeeStructuresDto,
  QueryInvoicesDto,
  QueryPaymentsDto,
  RecordPaymentDto,
  UpdateDiscountDto,
  UpdateFeeStructureDto,
  UpdateScholarshipDto,
} from "./dto/finance.dto";
import { FinanceService } from "./finance.service";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Finance: Fee Structure")
@ApiBearerAuth()
@Controller("finance/fee-structures")
export class FeeStructuresController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  @Permissions(Permission.FEE_STRUCTURE_WRITE)
  @ApiOperation({ summary: "Create a fee item for a class/term" })
  @Audited({ action: AuditAction.CREATE, resource: "fee_structure" })
  create(@Body() dto: CreateFeeStructureDto) {
    return this.financeService.createFeeStructure(dto);
  }

  @Get()
  @Permissions(Permission.FEE_STRUCTURE_READ)
  @ApiOperation({ summary: "List fee structure with filters" })
  @Cacheable({ ttl: 30 })
  findAll(@Query() query: QueryFeeStructuresDto) {
    return this.financeService.listFeeStructures(query);
  }

  @Patch(":id")
  @Permissions(Permission.FEE_STRUCTURE_WRITE)
  @ApiOperation({ summary: "Update a fee item" })
  @Audited({ action: AuditAction.UPDATE, resource: "fee_structure" })
  update(@Param("id") id: string, @Body() dto: UpdateFeeStructureDto) {
    return this.financeService.updateFeeStructure(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.FEE_STRUCTURE_WRITE)
  @ApiOperation({ summary: "Deactivate a fee item" })
  @Audited({ action: AuditAction.DELETE, resource: "fee_structure" })
  remove(@Param("id") id: string) {
    return this.financeService.removeFeeStructure(id);
  }
}

@ApiTags("Finance: Discounts & Scholarships")
@ApiBearerAuth()
@Controller("finance")
export class DiscountsController {
  constructor(private readonly financeService: FinanceService) {}

  @Post("discounts")
  @Permissions(Permission.DISCOUNT_WRITE)
  @ApiOperation({ summary: "Create a discount" })
  @Audited({ action: AuditAction.CREATE, resource: "discount" })
  createDiscount(@Body() dto: CreateDiscountDto) {
    return this.financeService.createDiscount(dto);
  }

  @Get("discounts")
  @Permissions(Permission.DISCOUNT_READ)
  @ApiOperation({ summary: "List discounts" })
  @Cacheable({ ttl: 30 })
  listDiscounts() {
    return this.financeService.listDiscounts();
  }

  @Patch("discounts/:id")
  @Permissions(Permission.DISCOUNT_WRITE)
  @ApiOperation({ summary: "Update a discount" })
  @Audited({ action: AuditAction.UPDATE, resource: "discount" })
  updateDiscount(@Param("id") id: string, @Body() dto: UpdateDiscountDto) {
    return this.financeService.updateDiscount(id, dto);
  }

  @Delete("discounts/:id")
  @Permissions(Permission.DISCOUNT_WRITE)
  @ApiOperation({ summary: "Deactivate a discount" })
  @Audited({ action: AuditAction.DELETE, resource: "discount" })
  removeDiscount(@Param("id") id: string) {
    return this.financeService.removeDiscount(id);
  }

  @Post("scholarships")
  @Permissions(Permission.SCHOLARSHIP_WRITE)
  @ApiOperation({ summary: "Create a scholarship for a student" })
  @Audited({ action: AuditAction.CREATE, resource: "scholarship" })
  createScholarship(@Body() dto: CreateScholarshipDto) {
    return this.financeService.createScholarship(dto);
  }

  @Get("scholarships")
  @Permissions(Permission.SCHOLARSHIP_READ)
  @ApiOperation({ summary: "List scholarships (optionally by student)" })
  @Cacheable({ ttl: 30 })
  listScholarships(@Query("studentId") studentId?: string) {
    return this.financeService.listScholarships(studentId);
  }

  @Patch("scholarships/:id")
  @Permissions(Permission.SCHOLARSHIP_WRITE)
  @ApiOperation({ summary: "Update a scholarship" })
  @Audited({ action: AuditAction.UPDATE, resource: "scholarship" })
  updateScholarship(
    @Param("id") id: string,
    @Body() dto: UpdateScholarshipDto,
  ) {
    return this.financeService.updateScholarship(id, dto);
  }

  @Delete("scholarships/:id")
  @Permissions(Permission.SCHOLARSHIP_WRITE)
  @ApiOperation({ summary: "Deactivate a scholarship" })
  @Audited({ action: AuditAction.DELETE, resource: "scholarship" })
  removeScholarship(@Param("id") id: string) {
    return this.financeService.removeScholarship(id);
  }
}

@ApiTags("Finance: Invoices")
@ApiBearerAuth()
@Controller("finance/invoices")
export class InvoicesController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  @Permissions(Permission.INVOICE_WRITE)
  @ApiOperation({ summary: "Generate an invoice for a student/term" })
  @Audited({ action: AuditAction.CREATE, resource: "invoice" })
  generate(@Body() dto: GenerateInvoiceDto) {
    return this.financeService.generateInvoice(dto);
  }

  @Post("generate-class")
  @Permissions(Permission.INVOICE_WRITE)
  @ApiOperation({
    summary: "Generate invoices for all students in a class/term",
  })
  @Audited({ action: AuditAction.CREATE, resource: "invoice" })
  generateClass(@Body() dto: GenerateClassInvoicesDto) {
    return this.financeService.generateClassInvoices(dto);
  }

  @Get()
  @Permissions(Permission.INVOICE_READ)
  @ApiOperation({ summary: "List invoices" })
  @Cacheable({ ttl: 15 })
  findAll(
    @Query() query: QueryInvoicesDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.financeService.listInvoices(query, actor);
  }

  @Get("outstanding")
  @Permissions(Permission.INVOICE_READ)
  @ApiOperation({ summary: "Outstanding fees (invoices with balance)" })
  outstanding(
    @Query() query: QueryInvoicesDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.financeService.outstanding(query, actor);
  }

  @Get(":id")
  @Permissions(Permission.INVOICE_READ)
  @ApiOperation({ summary: "Get an invoice by id" })
  findOne(@Param("id") id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.financeService.getInvoice(id, actor);
  }

  @Post(":id/payments")
  @Permissions(Permission.PAYMENT_WRITE)
  @ApiOperation({ summary: "Record a payment against an invoice" })
  @Audited({ action: AuditAction.CREATE, resource: "payment" })
  recordPayment(
    @Param("id") id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.financeService.recordPayment(id, dto, actor);
  }

  @Post(":id/gateway-initiate")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Permissions(Permission.PAYMENT_WRITE)
  @ApiOperation({ summary: "Initiate a gateway payment" })
  initiateGateway(
    @Param("id") id: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.financeService.initiateGatewayPayment(id, actor);
  }
}

@ApiTags("Finance: Payments & Receipts")
@ApiBearerAuth()
@Controller("finance")
export class PaymentsController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("payments")
  @Permissions(Permission.PAYMENT_READ)
  @ApiOperation({ summary: "List payments with filters" })
  @Cacheable({ ttl: 15 })
  listPayments(
    @Query() query: QueryPaymentsDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.financeService.listPayments(query, actor);
  }

  @Get("receipts/:receiptNumber")
  @Permissions(Permission.RECEIPT_READ)
  @ApiOperation({ summary: "Get a receipt by receipt number" })
  getReceipt(@Param("receiptNumber") receiptNumber: string) {
    return this.financeService.getReceipt(receiptNumber);
  }

  @Post("payments/:paymentId/gateway-confirm")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Permissions(Permission.PAYMENT_WRITE)
  @ApiOperation({ summary: "Confirm a gateway payment (mock webhook)" })
  confirmGateway(@Param("paymentId") paymentId: string) {
    return this.financeService.confirmGatewayPayment(paymentId);
  }
}

@ApiTags("Finance: Dashboard & Gateway")
@ApiBearerAuth()
@Controller("finance")
export class FinanceDashboardController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("dashboard")
  @Permissions(Permission.FINANCE_ANALYTICS)
  @ApiOperation({ summary: "Financial dashboard aggregates" })
  dashboard() {
    return this.financeService.dashboard();
  }

  @Get("gateway")
  @Permissions(Permission.FINANCE_GATEWAY)
  @ApiOperation({ summary: "Get payment gateway config (public fields)" })
  getGateway() {
    return this.financeService.getGatewayConfig();
  }

  @Patch("gateway")
  @Permissions(Permission.FINANCE_GATEWAY)
  @ApiOperation({ summary: "Save payment gateway config" })
  @Audited({ action: AuditAction.UPDATE, resource: "finance_gateway" })
  saveGateway(@Body() dto: PaymentGatewayConfigDto) {
    return this.financeService.saveGatewayConfig(dto);
  }
}
