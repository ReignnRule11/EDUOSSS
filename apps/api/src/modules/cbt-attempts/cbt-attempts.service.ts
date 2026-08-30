import type { AuthPrincipal } from "@eduos/shared";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Exam, Prisma, Question } from "@prisma/client";
import { ExamAttemptStatus, ExamStatus, Prisma as P } from "@prisma/client";

type ExamQuestionEntry = {
  question: Question;
  orderIndex?: number;
};

type ExamWithQuestions = Exam & {
  questions: ExamQuestionEntry[];
};

import type {
  AutosaveAttemptDto,
  GradeEssaysDto,
  QueryAttemptsDto,
  StartAttemptDto,
  SubmitAttemptDto,
} from "./dto/attempt.dto";
import { ResourceNotFoundException } from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import {
  createPdfDocument,
  pdfLine,
  pdfTitle,
} from "../../common/utils/pdf.util";
import { PrismaService } from "../../database/prisma.service";
import { combineScores, markAttempt } from "../cbt-exams/cbt-marking.util";

@Injectable()
export class CbtAttemptsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // ---------------- Student: take the exam ----------------

  async start(
    examId: string,
    actor: AuthPrincipal,
    _dto: StartAttemptDto = {},
  ) {
    const exam = await this.prisma.scoped.exam.findFirst({
      where: this.tenantWhere({ id: examId, deletedAt: null }),
      include: { questions: { include: { question: true } } },
    });
    if (!exam) throw new ResourceNotFoundException("Exam", examId);
    this.assertAvailable(exam);

    const student = await this.findStudentByUser(actor.userId);
    await this.assertUnderMaxAttempts(exam.id, student.id, exam.maxAttempts);

    const active = await this.prisma.scoped.examAttempt.findFirst({
      where: this.tenantWhere({
        examId,
        studentId: student.id,
        status: ExamAttemptStatus.IN_PROGRESS,
      }),
    });
    if (active) return this.attemptDetail(active.id, actor, true);

    const questions = this.pickQuestions(exam);
    if (questions.length === 0) {
      throw new BadRequestException("This exam contains no questions");
    }

    const questionOrder = questions.map((q) => q.question.id);
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (exam.durationMinutes ?? 60) * 60_000,
    );

    const attempt = await this.prisma.scoped.examAttempt.create({
      data: this.withTenant({
        examId,
        studentId: student.id,
        status: ExamAttemptStatus.IN_PROGRESS,
        answers: {},
        questionOrder,
        autoScore: 0,
        essayScore: 0,
        startedAt: now,
        expiresAt,
        lastSavedAt: now,
      }) as Prisma.ExamAttemptUncheckedCreateInput,
    });

    return this.attemptDetail(attempt.id, actor, true);
  }

  async autosave(id: string, actor: AuthPrincipal, dto: AutosaveAttemptDto) {
    const attempt = await this.getOwnAttempt(id, actor);
    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException("This attempt is no longer editable");
    }
    const finalAttempt = await this.applyExpiry(attempt);
    if (finalAttempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      return this.attemptDetail(id, actor, true);
    }
    // Atomic: only update while the attempt is still in progress so a
    // concurrent submit cannot be overwritten afterwards.
    const updated = await this.prisma.scoped.examAttempt.updateMany({
      where: { id, status: ExamAttemptStatus.IN_PROGRESS },
      data: {
        answers: dto.answers as P.InputJsonValue,
        lastSavedAt: new Date(),
      },
    });
    if (updated.count === 0) {
      return this.attemptDetail(id, actor, true);
    }
    return this.prisma.scoped.examAttempt.findFirst({
      where: this.tenantWhere({ id }),
    });
  }

  async submit(id: string, actor: AuthPrincipal, dto: SubmitAttemptDto) {
    const attempt = await this.getOwnAttempt(id, actor);
    const finalAttempt = await this.applyExpiry(attempt);
    if (finalAttempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      // Either expired or already submitted — return the finalized state.
      return this.attemptDetail(id, actor, false);
    }

    const exam = await this.prisma.scoped.exam.findFirst({
      where: this.tenantWhere({ id: attempt.examId }),
      include: { questions: { include: { question: true } } },
    });
    if (!exam) throw new ResourceNotFoundException("Exam", attempt.examId);

    const questions = this.orderedQuestions(exam, finalAttempt.questionOrder);
    const result = markAttempt(
      questions.map((q) => q.question),
      dto.answers,
      {
        negativeMarking: exam.negativeMarking,
        negativeMarkingValue: exam.negativeMarkingValue,
      },
    );

    const essayQuestions = questions.filter((q) => q.question.type === "ESSAY");
    const hasEssays = essayQuestions.length > 0;
    const status = hasEssays
      ? ExamAttemptStatus.SUBMITTED
      : ExamAttemptStatus.GRADED;

    const gradedAt = hasEssays ? null : new Date();
    const totalScore = hasEssays ? result.autoScore : result.totalScore;

    // Atomic finalization: only an IN_PROGRESS attempt may transition to a
    // terminal state. Two concurrent submits cannot both finalize — the second
    // one updates zero rows and returns the already-finalized result.
    const updated = await this.prisma.scoped.examAttempt.updateMany({
      where: { id, status: ExamAttemptStatus.IN_PROGRESS },
      data: {
        status,
        answers: dto.answers as P.InputJsonValue,
        autoScore: result.autoScore,
        totalScore,
        results: result.questions as unknown as P.InputJsonValue,
        submittedAt: new Date(),
        gradedAt,
        lastSavedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return this.attemptDetail(id, actor, false);
    }

    return this.prisma.scoped.examAttempt.findFirst({
      where: this.tenantWhere({ id }),
      include: this.attemptInclude,
    });
  }

  // ---------------- Student: read own attempts ----------------

  async findMine(actor: AuthPrincipal, query: QueryAttemptsDto) {
    const student = await this.findStudentByUser(actor.userId);
    const pagination = toPaginationArgs(query);
    const where: Prisma.ExamAttemptWhereInput = {
      studentId: student.id,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.examAttempt.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: [
          { startedAt: "desc" },
          buildOrderBy(query, ["startedAt", "totalScore", "status"]),
        ],
        include: {
          exam: {
            select: {
              id: true,
              title: true,
              durationMinutes: true,
              passMark: true,
              negativeMarking: true,
            },
          },
        },
      }),
      this.prisma.scoped.examAttempt.count({ where: this.tenantWhere(where) }),
    ]);
    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  // ---------------- Staff: manage attempts ----------------

  async findAllForExam(examId: string, query: QueryAttemptsDto) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.ExamAttemptWhereInput = {
      examId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.examAttempt.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: [
          { startedAt: "desc" },
          buildOrderBy(query, ["startedAt", "totalScore", "status"]),
        ],
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
            },
          },
        },
      }),
      this.prisma.scoped.examAttempt.count({ where: this.tenantWhere(where) }),
    ]);
    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  /** Detail view: staff see full results; students see instant results only
   *  when the exam allows it and the attempt is graded. */
  async attemptDetail(id: string, actor: AuthPrincipal, isLive = false) {
    const attempt = await this.prisma.scoped.examAttempt.findFirst({
      where: this.tenantWhere({ id }),
      include: this.attemptInclude,
    });
    if (!attempt) throw new ResourceNotFoundException("ExamAttempt", id);

    const isStudent = actor.role === "STUDENT" || actor.role === "PARENT";
    if (isStudent) {
      const student = await this.findStudentByUser(actor.userId);
      if (attempt.studentId !== student.id) {
        throw new NotFoundException("Attempt not found");
      }
    }

    await this.applyExpiry(attempt);
    const fresh = await this.prisma.scoped.examAttempt.findFirst({
      where: this.tenantWhere({ id }),
      include: this.attemptInclude,
    });
    if (!fresh) throw new ResourceNotFoundException("ExamAttempt", id);

    return this.serialize(fresh, actor, isLive);
  }

  async gradeEssays(id: string, actor: AuthPrincipal, dto: GradeEssaysDto) {
    const attempt = await this.prisma.scoped.examAttempt.findFirst({
      where: this.tenantWhere({ id }),
      include: this.attemptInclude,
    });
    if (!attempt) throw new ResourceNotFoundException("ExamAttempt", id);
    if (
      attempt.status !== ExamAttemptStatus.SUBMITTED &&
      attempt.status !== ExamAttemptStatus.GRADED
    ) {
      throw new BadRequestException("Attempt is not in a gradable state");
    }

    const exam = await this.prisma.scoped.exam.findFirst({
      where: this.tenantWhere({ id: attempt.examId }),
      include: { questions: { include: { question: true } } },
    });
    if (!exam) throw new ResourceNotFoundException("Exam", attempt.examId);

    const questions = this.orderedQuestions(exam, attempt.questionOrder);
    const essayIds = new Set(
      questions
        .filter((q) => q.question.type === "ESSAY")
        .map((q) => q.question.id),
    );
    const provided = Object.keys(dto.essayScores ?? {});
    for (const qid of provided) {
      if (!essayIds.has(qid)) {
        throw new BadRequestException(
          `Question ${qid} is not an essay in this attempt`,
        );
      }
    }

    const scores: Record<string, number> = {};
    for (const qid of essayIds) {
      scores[qid] = Number(dto.essayScores?.[qid]) || 0;
    }
    const totalScore = combineScores(attempt.autoScore, scores);

    const results = (attempt.results ?? {}) as Record<string, unknown>;
    for (const [qid, score] of Object.entries(scores)) {
      const entry = (results[qid] as Record<string, unknown>) ?? {};
      results[qid] = {
        ...entry,
        score,
        essayScore: score,
        correct: score >= ((entry as { maxPoints?: number }).maxPoints ?? 1),
        feedback: score > 0 ? "Graded" : "Awaiting review",
        gradedBy: `${actor.email}`,
        gradedAt: new Date().toISOString(),
      };
    }

    return this.prisma.scoped.examAttempt.update({
      where: { id },
      data: {
        status: ExamAttemptStatus.GRADED,
        essayScore: Object.values(scores).reduce((s, v) => s + v, 0),
        totalScore,
        results: results as unknown as P.InputJsonValue,
        gradedById: actor.userId,
        gradedAt: new Date(),
      },
      include: this.attemptInclude,
    });
  }

  async analytics(examId: string) {
    const attempts = await this.prisma.scoped.examAttempt.findMany({
      where: this.tenantWhere({
        examId,
        status: { in: [ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.GRADED] },
      }),
      select: {
        id: true,
        autoScore: true,
        essayScore: true,
        totalScore: true,
        results: true,
        questionOrder: true,
        startedAt: true,
        submittedAt: true,
      },
    });

    const exam = await this.prisma.scoped.exam.findFirst({
      where: this.tenantWhere({ id: examId }),
      select: {
        passMark: true,
        questions: { include: { question: { select: { points: true } } } },
      },
    });

    const maxPoints = (exam?.questions ?? []).reduce(
      (sum, q) => sum + (q.question.points ?? 1),
      0,
    );
    const scored = attempts.filter((a) => a.totalScore !== null);
    const avgScore =
      scored.length === 0
        ? 0
        : scored.reduce((s, a) => s + (a.totalScore ?? 0), 0) / scored.length;
    const passMark = exam?.passMark ?? 50;
    const passed = scored.filter((a) => {
      if (maxPoints <= 0) return false;
      const percentage = ((a.totalScore ?? 0) / maxPoints) * 100;
      return percentage >= passMark;
    }).length;

    return {
      totalAttempts: attempts.length,
      gradedAttempts: scored.length,
      maxPossibleScore: maxPoints,
      avgScore: Number(avgScore.toFixed(2)),
      passRate:
        scored.length === 0
          ? 0
          : Number(((passed / scored.length) * 100).toFixed(2)),
      attemptedDistribution: {
        inProgress: attempts.length - scored.length,
        graded: scored.length,
      },
    };
  }

  /** Builds a result PDF for an attempt (staff or the owning student). */
  async exportPdf(
    id: string,
    actor: AuthPrincipal,
  ): Promise<{ pdf: Buffer; filename: string }> {
    const attempt = await this.prisma.scoped.examAttempt.findFirst({
      where: this.tenantWhere({ id }),
      include: {
        exam: {
          select: {
            title: true,
            passMark: true,
            negativeMarking: true,
          },
        },
        student: {
          select: { firstName: true, lastName: true, admissionNumber: true },
        },
      },
    });
    if (!attempt) throw new ResourceNotFoundException("ExamAttempt", id);

    const isStudent = actor.role === "STUDENT" || actor.role === "PARENT";
    if (isStudent) {
      const student = await this.findStudentByUser(actor.userId);
      if (attempt.studentId !== student.id) {
        throw new NotFoundException("Attempt not found");
      }
    }

    const exam = await this.prisma.scoped.exam.findFirst({
      where: this.tenantWhere({ id: attempt.examId }),
      include: { questions: { include: { question: true } } },
    });
    if (!exam) throw new ResourceNotFoundException("Exam", attempt.examId);

    const questions = this.orderedQuestions(exam, attempt.questionOrder);
    const results = (attempt.results ?? {}) as Record<string, unknown>;

    const pdf = await this.buildPdf({
      examTitle: exam.title,
      passMark: exam.passMark,
      studentName: `${attempt.student.firstName} ${attempt.student.lastName}`,
      admissionNumber: attempt.student.admissionNumber,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      gradedAt: attempt.gradedAt,
      autoScore: attempt.autoScore,
      essayScore: attempt.essayScore,
      totalScore: attempt.totalScore,
      questions: questions.map((q) => {
        const entry = (results[q.question.id] ?? {}) as Record<string, unknown>;
        return {
          body: q.question.body,
          type: q.question.type,
          score: Number(entry.score ?? 0),
          maxPoints: Number(entry.maxPoints ?? q.question.points ?? 1),
          feedback: String(entry.feedback ?? ""),
        };
      }),
    });

    const filename = `result-${attempt.id}.pdf`;
    return { pdf, filename };
  }

  // ---------------- helpers ----------------

  private assertAvailable(exam: Exam) {
    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new BadRequestException("This exam is not published");
    }
    const now = new Date();
    if (exam.startsAt && exam.startsAt > now) {
      throw new BadRequestException("This exam has not started yet");
    }
    if (exam.endsAt && exam.endsAt < now) {
      throw new BadRequestException("This exam has ended");
    }
  }

  private async assertUnderMaxAttempts(
    examId: string,
    studentId: string,
    maxAttempts: number,
  ) {
    if (!maxAttempts) return;
    const count = await this.prisma.scoped.examAttempt.count({
      where: this.tenantWhere({
        examId,
        studentId,
        status: { in: [ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.GRADED] },
      }),
    });
    if (count >= maxAttempts) {
      throw new BadRequestException(
        `You have reached the maximum of ${maxAttempts} attempts for this exam`,
      );
    }
  }

  /** Resolves the exam's questions in the stored (possibly shuffled) order. */
  private orderedQuestions(exam: ExamWithQuestions, questionOrder: unknown) {
    const ordered = Array.isArray(questionOrder)
      ? (questionOrder as string[])
      : [];
    const map = new Map<string, ExamQuestionEntry>();
    for (const q of exam.questions) {
      map.set(q.question.id, q);
    }
    if (ordered.length > 0) {
      return ordered
        .map((qid) => map.get(qid))
        .filter((q): q is ExamQuestionEntry => q !== undefined);
    }
    return [...exam.questions].sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
    );
  }

  private pickQuestions(exam: ExamWithQuestions): ExamQuestionEntry[] {
    const questions = exam.questions.filter(
      (q) => q.question.deletedAt === null,
    );
    if (!exam.shuffleQuestions) {
      return [...questions].sort(
        (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
      );
    }
    return this.shuffle(questions);
  }

  /**
   * Marks an expired in-progress attempt as auto-submitted and graded.
   * Returns the (possibly updated) attempt; callers should re-check status.
   */
  private async applyExpiry(attempt: {
    id: string;
    examId: string;
    expiresAt: Date | null;
    status: ExamAttemptStatus;
    answers: unknown;
    questionOrder: unknown;
    autoScore: number;
  }) {
    if (
      attempt.status !== ExamAttemptStatus.IN_PROGRESS ||
      !attempt.expiresAt ||
      attempt.expiresAt > new Date()
    ) {
      return attempt;
    }

    const exam = await this.prisma.scoped.exam.findFirst({
      where: this.tenantWhere({ id: attempt.examId }),
      include: { questions: { include: { question: true } } },
    });
    if (!exam) throw new ResourceNotFoundException("Exam", attempt.examId);

    const questions = this.orderedQuestions(exam, attempt.questionOrder);
    const result = markAttempt(
      questions.map((q) => q.question),
      (attempt.answers ?? {}) as Record<string, unknown>,
      {
        negativeMarking: exam.negativeMarking,
        negativeMarkingValue: exam.negativeMarkingValue,
      },
    );
    const hasEssays = questions.some((q) => q.question.type === "ESSAY");

    const status = hasEssays
      ? ExamAttemptStatus.SUBMITTED
      : ExamAttemptStatus.GRADED;

    // Atomic expiry: only transition if the attempt is still IN_PROGRESS and
    // past its deadline, so concurrent submit/expiry cannot double-finalize.
    const updated = await this.prisma.scoped.examAttempt.updateMany({
      where: {
        id: attempt.id,
        status: ExamAttemptStatus.IN_PROGRESS,
        expiresAt: { lte: new Date() },
      },
      data: {
        status,
        autoScore: result.autoScore,
        totalScore: result.totalScore,
        results: result.questions as unknown as P.InputJsonValue,
        submittedAt: new Date(),
        gradedAt: hasEssays ? null : new Date(),
        lastSavedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      // Another request already finalized (or the attempt was never expired).
      const fresh = await this.prisma.scoped.examAttempt.findFirst({
        where: this.tenantWhere({ id: attempt.id }),
      });
      if (!fresh)
        throw new ResourceNotFoundException("ExamAttempt", attempt.id);
      return fresh;
    }
    const fresh = await this.prisma.scoped.examAttempt.findFirst({
      where: this.tenantWhere({ id: attempt.id }),
    });
    if (!fresh) throw new ResourceNotFoundException("ExamAttempt", attempt.id);
    return fresh;
  }

  private async getOwnAttempt(id: string, actor: AuthPrincipal) {
    const attempt = await this.prisma.scoped.examAttempt.findFirst({
      where: this.tenantWhere({ id }),
    });
    if (!attempt) throw new ResourceNotFoundException("ExamAttempt", id);

    const isStudent = actor.role === "STUDENT" || actor.role === "PARENT";
    if (isStudent) {
      const student = await this.findStudentByUser(actor.userId);
      if (attempt.studentId !== student.id) {
        throw new NotFoundException("Attempt not found");
      }
    }
    return attempt;
  }

  private async findStudentByUser(userId: string) {
    const student = await this.prisma.scoped.student.findFirst({
      where: this.tenantWhere({ userId }),
    });
    if (!student) {
      throw new BadRequestException(
        "No student profile is linked to your account",
      );
    }
    return student;
  }

  /** Serializes an attempt, hiding correct answers unless the viewer is staff
   *  or the exam allows instant results. Includes the ordered questions so the
   *  student can render the paper. */
  private async serialize(
    attempt: Record<string, unknown>,
    actor: AuthPrincipal,
    _isLive: boolean,
  ) {
    const isStudent = actor.role === "STUDENT" || actor.role === "PARENT";
    const examRef = (attempt.exam ?? {}) as Record<string, unknown>;
    const status = attempt.status as ExamAttemptStatus;
    const showResults =
      !isStudent ||
      (examRef.showResultsOnSubmit === true &&
        status !== ExamAttemptStatus.IN_PROGRESS);

    const payload = { ...attempt } as Record<string, unknown>;
    const answers = (attempt.answers ?? {}) as Record<string, unknown>;

    if (showResults) {
      payload.results = attempt.results;
    } else {
      payload.results = null;
    }
    payload.answers = answers;

    const results = (attempt.results ?? {}) as Record<
      string,
      { score: number; maxPoints: number }
    >;
    const resultEntries = Object.values(results);
    if (resultEntries.length > 0 && attempt.totalScore !== null) {
      const maxPoints = resultEntries.reduce(
        (s, r) => s + (r.maxPoints ?? 0),
        0,
      );
      const passMark = Number(examRef.passMark ?? 50);
      const percentage =
        maxPoints <= 0 ? 0 : ((attempt.totalScore as number) / maxPoints) * 100;
      payload.percentageScore = Number(percentage.toFixed(2));
      payload.passed = percentage >= passMark;
    }

    // Attach the ordered questions (without correct answers for students).
    const exam = await this.prisma.scoped.exam.findFirst({
      where: this.tenantWhere({
        id: (attempt.examId ?? examRef.id) as string,
      }),
      include: { questions: { include: { question: true } } },
    });
    if (exam) {
      const ordered = this.orderedQuestions(exam, attempt.questionOrder);
      const shuffleOptions = Boolean(exam.shuffleOptions);
      payload.questions = ordered.map((q) => {
        const question = q.question;
        let options = (question.options ?? null) as
          unknown | Record<string, unknown> | null;
        if (
          shuffleOptions &&
          question.type === "MULTIPLE_CHOICE" &&
          Array.isArray(options)
        ) {
          options = this.seededShuffle(
            options as unknown[],
            `${attempt.id}-${question.id}`,
          );
        }
        const questionPayload: Record<string, unknown> = {
          id: question.id,
          type: question.type,
          body: question.body,
          points: question.points,
          difficulty: question.difficulty,
          options,
        };
        if (showResults) {
          questionPayload.correctAnswer = question.correctAnswer;
          questionPayload.explanation = question.explanation;
        }
        if (isStudent && status !== ExamAttemptStatus.IN_PROGRESS) {
          const entry = results[question.id] as
            { score: number; maxPoints: number; feedback?: string } | undefined;
          questionPayload.result = entry ?? null;
        }
        return questionPayload;
      });
    }

    return payload;
  }

  private seededShuffle<T>(arr: T[], seed: string): T[] {
    const copy = [...arr];
    let h = 0;
    for (let i = 0; i < seed.length; i += 1) {
      h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    }
    for (let i = copy.length - 1; i > 0; i -= 1) {
      h = (h * 1103515245 + 12345) >>> 0;
      const j = h % (i + 1);
      const tmp = copy[i] as T;
      copy[i] = copy[j] as T;
      copy[j] = tmp;
    }
    return copy;
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

  private get attemptInclude(): Prisma.ExamAttemptInclude {
    return {
      exam: {
        select: {
          id: true,
          title: true,
          description: true,
          durationMinutes: true,
          passMark: true,
          negativeMarking: true,
          negativeMarkingValue: true,
          shuffleQuestions: true,
          shuffleOptions: true,
          showResultsOnSubmit: true,
        },
      },
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

  // ---------------- PDF rendering ----------------

  private async buildPdf(input: {
    examTitle: string;
    passMark: number;
    studentName: string;
    admissionNumber: string;
    status: string;
    submittedAt: Date | null;
    gradedAt: Date | null;
    autoScore: number;
    essayScore: number;
    totalScore: number | null;
    questions: Array<{
      body: string;
      type: string;
      score: number;
      maxPoints: number;
      feedback: string;
    }>;
  }): Promise<Buffer> {
    const { doc, end, done } = await createPdfDocument();

    // Header
    pdfTitle(doc, input.examTitle);
    pdfLine(doc, `Student: ${input.studentName}  (${input.admissionNumber})`);
    pdfLine(doc, `Status: ${input.status}`);
    if (input.submittedAt) {
      pdfLine(doc, `Submitted: ${input.submittedAt.toISOString()}`);
    }
    if (input.gradedAt) {
      pdfLine(doc, `Graded: ${input.gradedAt.toISOString()}`);
    }
    doc.moveDown();
    doc.fontSize(12).fillColor("#1e3a5f").text("Score Summary");
    doc.text(
      `Auto-graded: ${input.autoScore.toFixed(2)} | Essay: ${input.essayScore.toFixed(2)} | Total: ${(input.totalScore ?? 0).toFixed(2)} | Pass mark: ${input.passMark}%`,
    );
    doc
      .moveDown()
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#cccccc")
      .stroke();
    doc.moveDown();

    // Per-question breakdown
    input.questions.forEach((q, index) => {
      doc
        .fontSize(11)
        .fillColor("#111")
        .text(`${index + 1}. ${q.body}`, { continued: false });
      doc
        .fontSize(10)
        .fillColor("#555")
        .text(
          `Type: ${q.type}  |  Score: ${q.score.toFixed(2)} / ${q.maxPoints.toFixed(2)}  |  ${q.feedback}`,
        );
      doc.moveDown(0.5);
    });

    end();
    return done;
  }
}
