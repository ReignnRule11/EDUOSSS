import type { AuthPrincipal } from "@eduos/shared";
import { BadRequestException, Injectable } from "@nestjs/common";
import {
  ExamStatus,
  Prisma,
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
} from "@prisma/client";

import type {
  AddExamQuestionsDto,
  CreateExamDto,
  QueryExamsDto,
  RandomizeExamDto,
  ReorderExamQuestionsDto,
  UpdateExamDto,
} from "./dto/exam.dto";
import { ResourceNotFoundException } from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class CbtExamsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(actor: AuthPrincipal, dto: CreateExamDto) {
    return this.prisma.scoped.exam.create({
      data: this.withTenant({
        createdById: actor.userId,
        ...dto,
      } as Prisma.ExamUncheckedCreateInput),
      include: this.examInclude,
    });
  }

  async findAll(query: QueryExamsDto) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.ExamWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.exam.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: [
          { createdAt: "desc" },
          buildOrderBy(query, ["title", "status", "createdAt"]),
        ] as Prisma.ExamOrderByWithRelationInput[],
        include: this.examInclude,
      }),
      this.prisma.scoped.exam.count({ where: this.tenantWhere(where) }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string, includeQuestions = false) {
    const exam = await this.prisma.scoped.exam.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
      include: {
        ...this.examInclude,
        ...(includeQuestions
          ? {
              questions: {
                orderBy: { orderIndex: "asc" },
                include: { question: true },
              },
            }
          : {}),
      },
    });
    if (!exam) throw new ResourceNotFoundException("Exam", id);
    return exam;
  }

  async update(id: string, dto: UpdateExamDto) {
    await this.findOne(id);
    return this.prisma.scoped.exam.update({
      where: { id },
      data: dto as Prisma.ExamUpdateInput,
      include: this.examInclude,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.exam.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async publish(id: string): Promise<unknown> {
    await this.findOne(id);
    const activeCount = await this.prisma.scoped.examQuestion.count({
      where: this.tenantWhere({
        examId: id,
        question: { deletedAt: null, status: QuestionStatus.ACTIVE },
      }),
    });
    if (activeCount === 0) {
      throw new BadRequestException(
        "Exam must contain at least one active question before publishing",
      );
    }
    return this.prisma.scoped.exam.update({
      where: { id },
      data: { status: ExamStatus.PUBLISHED },
      include: this.examInclude,
    });
  }

  async addQuestions(id: string, dto: AddExamQuestionsDto) {
    const exam = await this.findOne(id, true);
    const existing = (exam.questions as Array<{ questionId: string }>).map(
      (q) => q.questionId,
    );
    const existingSet = new Set(existing);
    const maxOrder = (exam.questions as Array<{ orderIndex: number }>).reduce(
      (max, q) => Math.max(max, q.orderIndex),
      -1,
    );

    const newIds = dto.questionIds.filter((qid) => !existingSet.has(qid));
    if (newIds.length === 0) return this.findOne(id, true);

    const validQuestions = await this.prisma.scoped.question.findMany({
      where: this.tenantWhere({
        id: { in: newIds },
        deletedAt: null,
        status: QuestionStatus.ACTIVE,
      }),
      select: { id: true },
    });
    if (validQuestions.length !== newIds.length) {
      throw new BadRequestException(
        "One or more questions are invalid, missing or not active",
      );
    }

    await this.prisma.scoped.examQuestion.createMany({
      data: validQuestions.map((q, index) => ({
        tenantId: this.tenantId(),
        examId: id,
        questionId: q.id,
        orderIndex: maxOrder + index + 1,
      })),
    });

    return this.findOne(id, true);
  }

  async removeQuestion(examId: string, questionId: string) {
    const exam = await this.findOne(examId, true);
    const removed = (exam.questions as Array<{ questionId: string }>).find(
      (q) => q.questionId === questionId,
    );
    if (!removed) {
      throw new ResourceNotFoundException("ExamQuestion", questionId);
    }
    await this.prisma.scoped.examQuestion.delete({
      where: { examId_questionId: { examId, questionId } },
    });
    await this.reindex(examId);
    return this.findOne(examId, true);
  }

  async reorderQuestions(examId: string, dto: ReorderExamQuestionsDto) {
    const exam = await this.findOne(examId, true);
    const current = (exam.questions as Array<{ questionId: string }>).map(
      (q) => q.questionId,
    );
    if (current.length !== dto.orderedQuestionIds.length) {
      throw new BadRequestException(
        "Ordered list must contain every question of the exam",
      );
    }
    if (dto.orderedQuestionIds.some((qid) => !current.includes(qid))) {
      throw new BadRequestException("Ordered list contains unknown questions");
    }
    const n = dto.orderedQuestionIds.length;
    await this.prisma.$transaction([
      // Phase 1: shift every row out of the way to avoid unique conflicts
      ...dto.orderedQuestionIds.map((questionId, index) =>
        this.prisma.scoped.examQuestion.update({
          where: { examId_questionId: { examId, questionId } },
          data: { orderIndex: n + index },
        }),
      ),
      // Phase 2: apply the final order
      ...dto.orderedQuestionIds.map((questionId, index) =>
        this.prisma.scoped.examQuestion.update({
          where: { examId_questionId: { examId, questionId } },
          data: { orderIndex: index },
        }),
      ),
    ]);
    return this.findOne(examId, true);
  }

  async randomize(id: string, dto: RandomizeExamDto) {
    const exam = await this.findOne(id, true);
    const filter = (dto.config ?? exam.randomPickConfig ?? {}) as Record<
      string,
      string
    >;
    const count = dto.count ?? exam.randomPickCount ?? 10;
    if (count <= 0) {
      throw new BadRequestException("count must be positive");
    }

    const where: Prisma.QuestionWhereInput = {
      deletedAt: null,
      status: QuestionStatus.ACTIVE,
      ...(filter.type ? { type: filter.type as QuestionType } : {}),
      ...(filter.difficulty
        ? { difficulty: filter.difficulty as QuestionDifficulty }
        : {}),
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
    };
    const available = await this.prisma.scoped.question.findMany({
      where: this.tenantWhere(where),
      select: { id: true },
    });

    const availableIds = available.map((q) => q.id);
    if (availableIds.length < count) {
      throw new BadRequestException(
        `Only ${availableIds.length} questions match the filter; cannot pick ${count}`,
      );
    }

    const picked = this.shuffle(availableIds).slice(0, count);

    await this.prisma.scoped.examQuestion.deleteMany({ where: { examId: id } });
    await this.prisma.scoped.examQuestion.createMany({
      data: picked.map((questionId, index) => ({
        tenantId: this.tenantId(),
        examId: id,
        questionId,
        orderIndex: index,
      })),
    });

    return this.findOne(id, true);
  }

  // ---------------- helpers ----------------

  private async reindex(examId: string) {
    const rows = await this.prisma.scoped.examQuestion.findMany({
      where: { examId },
      orderBy: { orderIndex: "asc" },
      select: { questionId: true },
    });
    const n = rows.length;
    await this.prisma.$transaction([
      ...rows.map((row, index) =>
        this.prisma.scoped.examQuestion.update({
          where: { examId_questionId: { examId, questionId: row.questionId } },
          data: { orderIndex: n + index },
        }),
      ),
      ...rows.map((row, index) =>
        this.prisma.scoped.examQuestion.update({
          where: { examId_questionId: { examId, questionId: row.questionId } },
          data: { orderIndex: index },
        }),
      ),
    ]);
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i] as T;
      copy[i] = copy[j] as T;
      copy[j] = tmp;
    }
    return copy;
  }

  private get examInclude(): Prisma.ExamInclude {
    return {
      course: { select: { id: true, title: true } },
      subject: { select: { id: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      _count: {
        select: {
          questions: { where: { question: { deletedAt: null } } },
          attempts: true,
        },
      },
    };
  }
}
