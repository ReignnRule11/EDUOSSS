import type { AuthPrincipal } from "@eduos/shared";
import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, QuestionStatus } from "@prisma/client";

import type {
  CreateQuestionCategoryDto,
  CreateQuestionDto,
  QueryQuestionsDto,
  UpdateQuestionCategoryDto,
  UpdateQuestionDto,
} from "./dto/question.dto";
import { ResourceNotFoundException } from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class CbtQuestionsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // ---------------- Categories ----------------

  async createCategory(dto: CreateQuestionCategoryDto) {
    const existing = await this.prisma.scoped.questionCategory.findFirst({
      where: this.tenantWhere({ name: dto.name }),
    });
    if (existing) {
      throw new BadRequestException("A category with this name already exists");
    }
    return this.prisma.scoped.questionCategory.create({
      data: this.withTenant({
        name: dto.name,
        description: dto.description,
      } as Prisma.QuestionCategoryUncheckedCreateInput),
      include: this.categoryInclude,
    });
  }

  async listCategories() {
    const items = await this.prisma.scoped.questionCategory.findMany({
      where: this.tenantWhere({ deletedAt: null }),
      orderBy: { name: "asc" },
      include: this.categoryInclude,
    });
    return { items, meta: { total: items.length } };
  }

  async updateCategory(id: string, dto: UpdateQuestionCategoryDto) {
    const category = await this.findCategory(id);
    if (dto.name && dto.name !== category.name) {
      const existing = await this.prisma.scoped.questionCategory.findFirst({
        where: this.tenantWhere({ name: dto.name, deletedAt: null }),
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          "A category with this name already exists",
        );
      }
    }
    return this.prisma.scoped.questionCategory.update({
      where: { id },
      data: dto as Prisma.QuestionCategoryUpdateInput,
    });
  }

  async removeCategory(id: string): Promise<void> {
    await this.findCategory(id);
    const count = await this.prisma.scoped.question.count({
      where: this.tenantWhere({ categoryId: id, deletedAt: null }),
    });
    if (count > 0) {
      throw new BadRequestException(
        "Category is in use by questions and cannot be removed",
      );
    }
    await this.prisma.scoped.questionCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------- Questions ----------------

  async create(actor: AuthPrincipal, dto: CreateQuestionDto) {
    this.validateQuestionPayload(dto);
    return this.prisma.scoped.question.create({
      data: this.withTenant({
        categoryId: dto.categoryId,
        createdById: actor.userId,
        type: dto.type,
        difficulty: dto.difficulty ?? "MEDIUM",
        body: dto.body,
        options: (dto.options as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        correctAnswer:
          (dto.correctAnswer as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        explanation: dto.explanation,
        points: dto.points ?? 1,
        status: dto.status ?? QuestionStatus.ACTIVE,
      } as Prisma.QuestionUncheckedCreateInput),
      include: this.questionInclude,
    });
  }

  async findAll(query: QueryQuestionsDto) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.QuestionWhereInput = {
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { body: { contains: query.search, mode: "insensitive" } }
        : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.question.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: [
          { createdAt: "desc" },
          buildOrderBy(query, ["body", "type", "difficulty", "createdAt"]),
        ] as Prisma.QuestionOrderByWithRelationInput[],
        include: this.questionInclude,
      }),
      this.prisma.scoped.question.count({ where: this.tenantWhere(where) }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const question = await this.prisma.scoped.question.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
      include: this.questionInclude,
    });
    if (!question) throw new ResourceNotFoundException("Question", id);
    return question;
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const existing = await this.findOne(id);
    this.validateQuestionPayload({ ...existing, ...dto } as CreateQuestionDto);
    return this.prisma.scoped.question.update({
      where: { id },
      data: {
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.options !== undefined
          ? { options: dto.options as Prisma.InputJsonValue }
          : {}),
        ...(dto.correctAnswer !== undefined
          ? { correctAnswer: dto.correctAnswer as Prisma.InputJsonValue }
          : {}),
        ...(dto.explanation !== undefined
          ? { explanation: dto.explanation }
          : {}),
        ...(dto.points !== undefined ? { points: dto.points } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      } as Prisma.QuestionUpdateInput,
      include: this.questionInclude,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.question.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------- Validation helpers ----------------

  /** Basic structural validation of options/correctAnswer per question type. */
  private validateQuestionPayload(dto: CreateQuestionDto): void {
    switch (dto.type) {
      case "MULTIPLE_CHOICE": {
        const options = dto.options as Array<{
          id: string;
          text: string;
          isCorrect?: boolean;
        }>;
        if (!Array.isArray(options) || options.length < 2) {
          throw new BadRequestException(
            "MCQ requires at least 2 options [{id,text,isCorrect}]",
          );
        }
        const correct = options.filter((o) => o.isCorrect);
        if (correct.length !== 1) {
          throw new BadRequestException(
            "MCQ must have exactly one option marked isCorrect",
          );
        }
        break;
      }
      case "TRUE_FALSE": {
        const answer = dto.correctAnswer as { value?: unknown };
        if (typeof answer?.value !== "boolean") {
          throw new BadRequestException(
            "TRUE_FALSE requires correctAnswer {value: boolean}",
          );
        }
        break;
      }
      case "FILL_BLANK": {
        const answer = dto.correctAnswer as { answers?: unknown };
        if (
          !answer?.answers ||
          !Array.isArray(answer.answers) ||
          answer.answers.length === 0
        ) {
          throw new BadRequestException(
            "FILL_BLANK requires correctAnswer {answers: string[]}",
          );
        }
        break;
      }
      case "MATCHING": {
        const options = dto.options as {
          left?: Array<{ id: string; text: string }>;
          right?: Array<{ id: string; text: string }>;
        };
        const pairs = dto.correctAnswer as {
          pairs?: Array<{ leftId: string; rightId: string }>;
        };
        if (
          !options?.left ||
          !options.right ||
          options.left.length === 0 ||
          options.right.length === 0
        ) {
          throw new BadRequestException(
            "MATCHING requires options {left:[{id,text}], right:[{id,text}]}",
          );
        }
        if (!pairs?.pairs || pairs.pairs.length !== options.left.length) {
          throw new BadRequestException(
            "MATCHING requires correctAnswer pairs matching every left item",
          );
        }
        break;
      }
      case "ESSAY":
        // Free text, no structural requirements.
        break;
    }
  }

  private async findCategory(id: string) {
    const category = await this.prisma.scoped.questionCategory.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
    });
    if (!category) {
      throw new ResourceNotFoundException("QuestionCategory", id);
    }
    return category;
  }

  private get categoryInclude(): Prisma.QuestionCategoryInclude {
    return {
      _count: { select: { questions: { where: { deletedAt: null } } } },
    };
  }

  private get questionInclude(): Prisma.QuestionInclude {
    return {
      category: { select: { id: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    };
  }
}
