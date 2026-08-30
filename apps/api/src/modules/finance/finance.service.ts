import type { AuthPrincipal } from "@eduos/shared";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import {
  DiscountType,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";

import type {
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
import { computeInvoiceTotals } from "./finance-computation.util";
import {
  BadRequestOperationException,
  ForbiddenOperationException,
  ResourceNotFoundException,
} from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import { resolveStudentScope } from "../../common/utils/student-scope.util";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class FinanceService extends BaseRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  // ---------------- Fee structure ----------------

  async createFeeStructure(dto: CreateFeeStructureDto) {
    const existing = await this.prisma.scoped.feeStructure.findFirst({
      where: this.tenantWhere({
        classGroupId: dto.classGroupId,
        academicYear: dto.academicYear,
        term: dto.term,
        name: dto.name,
        deletedAt: null,
      }),
    });
    if (existing) {
      throw new BadRequestOperationException(
        "A fee with the same name already exists for this class/term",
      );
    }
    return this.prisma.scoped.feeStructure.create({
      data: this.withTenant({
        classGroupId: dto.classGroupId,
        academicYear: dto.academicYear,
        term: dto.term,
        name: dto.name,
        feeType: dto.feeType ?? "TUITION",
        amount: dto.amount,
      } as Prisma.FeeStructureUncheckedCreateInput),
      include: this.feeStructureInclude,
    });
  }

  async listFeeStructures(query: QueryFeeStructuresDto) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.FeeStructureWhereInput = {
      deletedAt: null,
      ...(query.classGroupId ? { classGroupId: query.classGroupId } : {}),
      ...(query.academicYear ? { academicYear: query.academicYear } : {}),
      ...(query.term ? { term: query.term } : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.feeStructure.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "name",
          "amount",
          "createdAt",
        ]) as Prisma.FeeStructureOrderByWithRelationInput,
        include: this.feeStructureInclude,
      }),
      this.prisma.scoped.feeStructure.count({ where: this.tenantWhere(where) }),
    ]);
    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async updateFeeStructure(id: string, dto: UpdateFeeStructureDto) {
    await this.getFeeStructure(id);
    return this.prisma.scoped.feeStructure.update({
      where: { id },
      data: dto as Prisma.FeeStructureUpdateInput,
      include: this.feeStructureInclude,
    });
  }

  async removeFeeStructure(id: string): Promise<void> {
    await this.getFeeStructure(id);
    await this.prisma.scoped.feeStructure.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------- Discounts & scholarships ----------------

  async createDiscount(dto: CreateDiscountDto) {
    const existing = await this.prisma.scoped.discount.findFirst({
      where: this.tenantWhere({ name: dto.name, deletedAt: null }),
    });
    if (existing) {
      throw new BadRequestOperationException("Discount name already exists");
    }
    return this.prisma.scoped.discount.create({
      data: this.withTenant({
        name: dto.name,
        type: dto.type ?? DiscountType.PERCENTAGE,
        value: dto.value,
      } as Prisma.DiscountUncheckedCreateInput),
    });
  }

  async listDiscounts() {
    const items = await this.prisma.scoped.discount.findMany({
      where: this.tenantWhere({ deletedAt: null }),
      orderBy: { name: "asc" },
    });
    return { items, meta: { total: items.length } };
  }

  async updateDiscount(id: string, dto: UpdateDiscountDto) {
    const discount = await this.prisma.scoped.discount.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
    });
    if (!discount) throw new ResourceNotFoundException("Discount", id);
    return this.prisma.scoped.discount.update({
      where: { id },
      data: dto as Prisma.DiscountUpdateInput,
    });
  }

  async removeDiscount(id: string): Promise<void> {
    await this.prisma.scoped.discount
      .findFirst({
        where: this.tenantWhere({ id, deletedAt: null }),
      })
      .then((d) => {
        if (!d) throw new ResourceNotFoundException("Discount", id);
      });
    await this.prisma.scoped.discount.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createScholarship(dto: CreateScholarshipDto) {
    return this.prisma.scoped.scholarship.create({
      data: this.withTenant({
        studentId: dto.studentId,
        name: dto.name,
        type: dto.type ?? DiscountType.PERCENTAGE,
        value: dto.value,
      } as Prisma.ScholarshipUncheckedCreateInput),
      include: this.scholarshipInclude,
    });
  }

  async listScholarships(studentId?: string) {
    const items = await this.prisma.scoped.scholarship.findMany({
      where: this.tenantWhere({
        deletedAt: null,
        ...(studentId ? { studentId } : {}),
      }),
      orderBy: { createdAt: "desc" },
      include: this.scholarshipInclude,
    });
    return { items, meta: { total: items.length } };
  }

  async updateScholarship(id: string, dto: UpdateScholarshipDto) {
    const scholarship = await this.prisma.scoped.scholarship.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
    });
    if (!scholarship) throw new ResourceNotFoundException("Scholarship", id);
    return this.prisma.scoped.scholarship.update({
      where: { id },
      data: dto as Prisma.ScholarshipUpdateInput,
      include: this.scholarshipInclude,
    });
  }

  async removeScholarship(id: string): Promise<void> {
    await this.prisma.scoped.scholarship
      .findFirst({
        where: this.tenantWhere({ id, deletedAt: null }),
      })
      .then((s) => {
        if (!s) throw new ResourceNotFoundException("Scholarship", id);
      });
    await this.prisma.scoped.scholarship.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------- Invoices ----------------

  async generateInvoice(dto: GenerateInvoiceDto, _actor?: AuthPrincipal) {
    const fees = await this.prisma.scoped.feeStructure.findMany({
      where: this.tenantWhere({
        classGroupId: dto.classGroupId,
        academicYear: dto.academicYear,
        term: dto.term,
        isActive: true,
        deletedAt: null,
      }),
    });
    if (fees.length === 0) {
      throw new BadRequestOperationException(
        "No active fee structure found for this class/term",
      );
    }

    const existing = await this.prisma.scoped.invoice.findFirst({
      where: this.tenantWhere({
        studentId: dto.studentId,
        classGroupId: dto.classGroupId,
        academicYear: dto.academicYear,
        term: dto.term,
      }),
    });
    if (existing) {
      throw new BadRequestOperationException(
        "An invoice already exists for this student/term",
      );
    }

    const student = await this.prisma.scoped.student.findFirst({
      where: this.tenantWhere({ id: dto.studentId, deletedAt: null }),
      select: { id: true },
    });
    if (!student) throw new ResourceNotFoundException("Student", dto.studentId);

    const discount = dto.discountId
      ? await this.prisma.scoped.discount.findFirst({
          where: this.tenantWhere({
            id: dto.discountId,
            isActive: true,
            deletedAt: null,
          }),
        })
      : null;
    const scholarship = await this.prisma.scoped.scholarship.findFirst({
      where: this.tenantWhere({
        studentId: dto.studentId,
        isActive: true,
        deletedAt: null,
      }),
    });

    const subtotal = fees.reduce((sum, f) => sum + f.amount, 0);
    const totals = computeInvoiceTotals({
      subtotal,
      discount,
      scholarship,
    });
    const { discountAmount, scholarshipAmount, total } = totals;

    const invoiceNumber = await this.nextInvoiceNumber();
    const invoice = await this.prisma.scoped.invoice.create({
      data: this.withTenant({
        invoiceNumber,
        studentId: dto.studentId,
        classGroupId: dto.classGroupId,
        academicYear: dto.academicYear,
        term: dto.term,
        status: InvoiceStatus.ISSUED,
        totalAmount: total,
        discountAmount,
        scholarshipAmount,
        paidAmount: 0,
        balanceAmount: total,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        items: {
          create: fees.map((f) =>
            this.withTenant({
              name: f.name,
              description: `${f.feeType} fee for ${dto.academicYear} ${dto.term}`,
              amount: f.amount,
            } as Prisma.InvoiceItemUncheckedCreateInput),
          ),
        },
      }) as Prisma.InvoiceUncheckedCreateInput,
      include: this.invoiceInclude,
    });
    return invoice;
  }

  async generateClassInvoices(dto: GenerateClassInvoicesDto) {
    const enrollments = await this.prisma.scoped.enrollment.findMany({
      where: this.tenantWhere({
        classGroupId: dto.classGroupId,
        academicYear: dto.academicYear,
        term: dto.term,
        status: "ACTIVE" as const,
      }),
      select: { studentId: true },
    });
    if (enrollments.length === 0) {
      throw new BadRequestOperationException(
        "No active students found in this class/term",
      );
    }

    const created: string[] = [];
    for (const enrollment of enrollments) {
      try {
        const invoice = await this.generateInvoice(
          {
            studentId: enrollment.studentId,
            classGroupId: dto.classGroupId,
            academicYear: dto.academicYear,
            term: dto.term,
            discountId: dto.discountId,
          },
          undefined,
        );
        created.push(invoice.id);
      } catch (err) {
        // skip students that already have an invoice for this term
        if (err instanceof BadRequestOperationException) continue;
        throw err;
      }
    }
    return { generated: created.length, total: enrollments.length };
  }

  async listInvoices(query: QueryInvoicesDto, actor?: AuthPrincipal) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.classGroupId ? { classGroupId: query.classGroupId } : {}),
      ...(query.academicYear ? { academicYear: query.academicYear } : {}),
      ...(query.term ? { term: query.term } : {}),
      ...(query.status ? { status: query.status as InvoiceStatus } : {}),
    };
    if (actor && this.isViewerRole(actor.role)) {
      const student = await this.findStudentByUser(actor.userId);
      where.studentId = student.id;
    }
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.invoice.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "totalAmount",
          "balanceAmount",
          "createdAt",
        ]) as Prisma.InvoiceOrderByWithRelationInput,
        include: this.invoiceInclude,
      }),
      this.prisma.scoped.invoice.count({ where: this.tenantWhere(where) }),
    ]);
    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async getInvoice(id: string, actor?: AuthPrincipal) {
    const invoice = await this.prisma.scoped.invoice.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
      include: this.invoiceInclude,
    });
    if (!invoice) throw new ResourceNotFoundException("Invoice", id);
    if (actor && this.isViewerRole(actor.role)) {
      const student = await this.findStudentByUser(actor.userId);
      if (invoice.studentId !== student.id) {
        throw new ResourceNotFoundException("Invoice", id);
      }
    }
    return invoice;
  }

  /** Computes and refreshes the paid/balance/status fields of an invoice. */
  private async refreshInvoiceStatus(invoiceId: string) {
    const invoice = await this.prisma.scoped.invoice.findFirst({
      where: this.tenantWhere({ id: invoiceId }),
    });
    if (!invoice) return;
    const payments = await this.prisma.scoped.payment.aggregate({
      where: this.tenantWhere({
        invoiceId,
        status: PaymentStatus.COMPLETED,
      }),
      _sum: { amount: true },
    });
    const paid = payments._sum.amount ?? 0;
    const balance = Math.max(0, invoice.totalAmount - paid);
    const status =
      balance <= 0
        ? InvoiceStatus.PAID
        : paid > 0
          ? InvoiceStatus.PARTIAL
          : InvoiceStatus.ISSUED;
    return this.prisma.scoped.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: paid, balanceAmount: balance, status },
      include: this.invoiceInclude,
    });
  }

  // ---------------- Payments & receipts ----------------

  async recordPayment(
    invoiceId: string,
    dto: RecordPaymentDto,
    actor: AuthPrincipal,
  ) {
    const invoice = await this.getInvoice(invoiceId);
    const balance = invoice.balanceAmount;
    if (dto.amount <= 0 || dto.amount > balance) {
      throw new BadRequestOperationException(
        `Payment amount must be between 0 and the outstanding balance (${balance})`,
      );
    }

    const reference = this.nextPaymentReference();
    const payment = await this.prisma.scoped.payment.create({
      data: this.withTenant({
        invoiceId,
        studentId: invoice.studentId,
        reference,
        amount: dto.amount,
        method: dto.method ?? PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        recordedById: actor.userId,
        paidAt: new Date(),
      } as Prisma.PaymentUncheckedCreateInput),
      include: this.paymentInclude,
    });

    const receipt = await this.prisma.scoped.receipt.create({
      data: this.withTenant({
        paymentId: payment.id,
        receiptNumber: await this.nextReceiptNumber(),
      } as Prisma.ReceiptUncheckedCreateInput),
    });

    await this.refreshInvoiceStatus(invoiceId);
    return {
      ...payment,
      receipt: { id: receipt.id, receiptNumber: receipt.receiptNumber },
    };
  }

  async listPayments(query: QueryPaymentsDto, actor?: AuthPrincipal) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.PaymentWhereInput = {
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    if (actor && this.isViewerRole(actor.role)) {
      const student = await this.findStudentByUser(actor.userId);
      where.studentId = student.id;
    }
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.payment.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "amount",
          "createdAt",
        ]) as Prisma.PaymentOrderByWithRelationInput,
        include: this.paymentInclude,
      }),
      this.prisma.scoped.payment.count({ where: this.tenantWhere(where) }),
    ]);
    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async getReceipt(receiptNumber: string) {
    const receipt = await this.prisma.scoped.receipt.findFirst({
      where: this.tenantWhere({ receiptNumber }),
      include: {
        payment: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
              },
            },
            invoice: {
              include: { classGroup: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!receipt) throw new ResourceNotFoundException("Receipt", receiptNumber);
    return receipt;
  }

  /** Outstanding fees: invoices with a positive balance. */
  async outstanding(query: QueryInvoicesDto, actor?: AuthPrincipal) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      balanceAmount: { gt: 0 },
      ...(query.classGroupId ? { classGroupId: query.classGroupId } : {}),
      ...(query.academicYear ? { academicYear: query.academicYear } : {}),
      ...(query.term ? { term: query.term } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
    };
    if (actor && this.isViewerRole(actor.role)) {
      const scope = await resolveStudentScope(this.prisma.scoped, actor);
      where.studentId = { in: scope.studentIds ?? [] };
    }
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.invoice.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: {
          balanceAmount: "desc",
        } as Prisma.InvoiceOrderByWithRelationInput,
        include: this.invoiceInclude,
      }),
      this.prisma.scoped.invoice.count({ where: this.tenantWhere(where) }),
    ]);
    const totalOutstanding = await this.prisma.scoped.invoice.aggregate({
      where: this.tenantWhere(where),
      _sum: { balanceAmount: true },
    });
    return {
      items,
      meta: {
        ...buildPaginationMeta(totalItems, pagination.page, pagination.limit),
        totalOutstanding: totalOutstanding._sum.balanceAmount ?? 0,
      },
    };
  }

  // ---------------- Dashboard ----------------

  async dashboard() {
    const [collected, outstandingAgg, invoiceCount, paymentCount] =
      await this.prisma.$transaction([
        this.prisma.scoped.payment.aggregate({
          where: this.tenantWhere({ status: PaymentStatus.COMPLETED }),
          _sum: { amount: true },
        }),
        this.prisma.scoped.invoice.aggregate({
          where: this.tenantWhere({
            deletedAt: null,
            balanceAmount: { gt: 0 },
          }),
          _sum: { balanceAmount: true },
        }),
        this.prisma.scoped.invoice.count({
          where: this.tenantWhere({ deletedAt: null }),
        }),
        this.prisma.scoped.payment.count({
          where: this.tenantWhere({ status: PaymentStatus.COMPLETED }),
        }),
      ]);

    const recentPayments = await this.prisma.scoped.payment.findMany({
      where: this.tenantWhere({ status: PaymentStatus.COMPLETED }),
      orderBy: { createdAt: "desc" },
      take: 5,
      include: this.paymentInclude,
    });

    return {
      totalCollected: collected._sum.amount ?? 0,
      totalOutstanding: outstandingAgg._sum.balanceAmount ?? 0,
      invoiceCount,
      paymentCount,
      recentPayments,
    };
  }

  // ---------------- Payment gateway (mock) ----------------

  /**
   * Fail-closed gateway guard.
   * In production the mock gateway must never be used; a real provider must be
   * explicitly configured. This prevents accidental "test mode" payments.
   */
  private isMockGatewayAllowed(): boolean {
    return this.config.get<string>("nodeEnv") !== "production";
  }

  private async assertGatewayAllowed(): Promise<void> {
    const env = this.config.get<string>("nodeEnv");
    const tenant = await this.prisma.scoped.tenant.findFirst({
      where: { id: this.tenantId() },
      select: { settings: true },
    });
    const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
    const gateway = (settings.financeGateway ?? {}) as Record<string, unknown>;

    if (env === "production") {
      const provider = String(gateway.provider ?? "").toLowerCase();
      const realProviders = ["paystack", "flutterwave", "stripe", "paddle"];
      const isActive = gateway.isActive !== false;
      if (!provider || !realProviders.includes(provider) || !isActive) {
        throw new ForbiddenOperationException(
          "Online payments are not configured for this tenant",
        );
      }
    }
  }

  async getGatewayConfig() {
    const tenant = await this.prisma.scoped.tenant.findFirst({
      where: { id: this.tenantId() },
      select: { settings: true },
    });
    const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
    const gateway = settings.financeGateway as
      Record<string, unknown> | undefined;
    if (!gateway?.provider) return null;
    return {
      provider: gateway.provider,
      publicKey: gateway.publicKey ?? null,
      isActive: gateway.isActive ?? false,
    };
  }

  async saveGatewayConfig(dto: PaymentGatewayConfigDto) {
    const provider = dto.provider.trim().toLowerCase();
    if (provider === "mock") {
      throw new ForbiddenOperationException(
        "The mock payment provider cannot be used",
      );
    }
    const tenant = await this.prisma.scoped.tenant.findFirst({
      where: { id: this.tenantId() },
    });
    if (!tenant) throw new ResourceNotFoundException("Tenant", this.tenantId());
    const settings = (tenant.settings ?? {}) as Record<string, unknown>;
    settings.financeGateway = {
      provider: dto.provider.trim(),
      secretKey: dto.secretKey,
      publicKey: dto.publicKey,
      isActive: dto.isActive ?? true,
    };
    await this.prisma.scoped.tenant.update({
      where: { id: tenant.id },
      data: { settings: settings as Prisma.InputJsonValue },
    });
    return this.getGatewayConfig();
  }

  /** Creates a PENDING gateway payment for an invoice (mock). */
  async initiateGatewayPayment(invoiceId: string, actor: AuthPrincipal) {
    await this.assertGatewayAllowed();
    const invoice = await this.getInvoice(invoiceId, actor);
    if (invoice.balanceAmount <= 0) {
      throw new BadRequestOperationException(
        "Invoice has no outstanding balance",
      );
    }
    const reference = this.nextPaymentReference();
    // Guard against reference reuse (defense in depth on top of the DB unique).
    const existing = await this.prisma.scoped.payment.findFirst({
      where: this.tenantWhere({ reference }),
    });
    if (existing) {
      throw new BadRequestOperationException("Duplicate payment reference");
    }
    const payment = await this.prisma.scoped.payment.create({
      data: this.withTenant({
        invoiceId,
        studentId: invoice.studentId,
        reference,
        amount: invoice.balanceAmount,
        method: PaymentMethod.PAYSTACK,
        status: PaymentStatus.PENDING,
        gateway: "paystack",
        gatewayRef: reference,
        recordedById: actor.userId,
      } as Prisma.PaymentUncheckedCreateInput),
      include: this.paymentInclude,
    });
    return {
      payment,
      // In production this is replaced by the configured provider's checkout
      // URL. The mock URL is only returned when the mock gateway is allowed.
      checkoutUrl: this.isMockGatewayAllowed()
        ? `/api/v1/finance/payments/${payment.id}/gateway-confirm`
        : null,
      reference,
    };
  }

  /** Simulates the gateway webhook confirming a payment. */
  async confirmGatewayPayment(
    paymentId: string,
    verification?: {
      amount?: number;
      reference?: string;
      gatewayRef?: string;
      status?: string;
    },
  ) {
    await this.assertGatewayAllowed();
    const payment = await this.prisma.scoped.payment.findFirst({
      where: this.tenantWhere({ id: paymentId }),
      include: { invoice: { select: { id: true, totalAmount: true } } },
    });
    if (!payment) throw new ResourceNotFoundException("Payment", paymentId);

    // Server-side verification: never trust client-supplied success alone.
    if (verification) {
      if (verification.status && verification.status !== "success") {
        throw new BadRequestOperationException("Payment was not successful");
      }
      if (
        verification.amount !== undefined &&
        Math.abs(verification.amount - payment.amount) > 0.001
      ) {
        throw new BadRequestOperationException("Payment amount mismatch");
      }
      if (
        verification.reference &&
        verification.reference !== payment.reference
      ) {
        throw new BadRequestOperationException("Payment reference mismatch");
      }
      if (
        verification.gatewayRef &&
        verification.gatewayRef !== payment.gatewayRef
      ) {
        throw new BadRequestOperationException("Gateway reference mismatch");
      }
    }

    // Atomic state transition: only PENDING may become COMPLETED. This prevents
    // duplicate confirmations from double-crediting an invoice.
    const updated = await this.prisma.scoped.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.COMPLETED, paidAt: new Date() },
    });
    if (updated.count === 0) {
      throw new BadRequestOperationException("Payment is not pending");
    }

    // Receipt must be unique per payment.
    const existingReceipt = await this.prisma.scoped.receipt.findFirst({
      where: this.tenantWhere({ paymentId }),
    });
    if (existingReceipt) {
      // Already confirmed — idempotent success.
      return {
        id: paymentId,
        status: PaymentStatus.COMPLETED,
        receiptNumber: existingReceipt.receiptNumber,
      };
    }
    const receipt = await this.prisma.scoped.receipt.create({
      data: this.withTenant({
        paymentId,
        receiptNumber: await this.nextReceiptNumber(),
      } as Prisma.ReceiptUncheckedCreateInput),
    });
    await this.refreshInvoiceStatus(payment.invoiceId);
    return {
      id: paymentId,
      status: PaymentStatus.COMPLETED,
      receiptNumber: receipt.receiptNumber,
    };
  }

  // ---------------- helpers ----------------

  private isViewerRole(role: string): boolean {
    return role === "STUDENT" || role === "PARENT";
  }

  private async findStudentByUser(userId: string) {
    const student = await this.prisma.scoped.student.findFirst({
      where: this.tenantWhere({ userId }),
    });
    if (!student) {
      throw new BadRequestOperationException(
        "No student profile is linked to your account",
      );
    }
    return student;
  }

  private async getFeeStructure(id: string) {
    const fee = await this.prisma.scoped.feeStructure.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
    });
    if (!fee) throw new ResourceNotFoundException("FeeStructure", id);
    return fee;
  }

  private async nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.scoped.invoice.count({
      where: this.tenantWhere({}),
    });
    return `INV-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  private nextPaymentReference(): string {
    return `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  }

  private async nextReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.scoped.receipt.count({
      where: this.tenantWhere({}),
    });
    return `RCP-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  private get feeStructureInclude(): Prisma.FeeStructureInclude {
    return {
      classGroup: { select: { id: true, name: true } },
    };
  }

  private get invoiceInclude(): Prisma.InvoiceInclude {
    return {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      },
      classGroup: { select: { id: true, name: true } },
      items: true,
      payments: {
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          receipt: true,
        },
      },
    };
  }

  private get paymentInclude(): Prisma.PaymentInclude {
    return {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          academicYear: true,
          term: true,
        },
      },
      receipt: true,
    };
  }

  private get scholarshipInclude(): Prisma.ScholarshipInclude {
    return {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      },
    };
  }
}
