import type { AuthPrincipal } from "@eduos/shared";
import { Injectable, BadRequestException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { AiFeature } from "@prisma/client";

import type {
  AiConfigDto,
  CreatePromptTemplateDto,
  InsightDto,
  LessonPlannerDto,
  QueryUsageLogsDto,
  QuestionGeneratorDto,
  RecommendationDto,
  ReportCommentDto,
  TutorMessageDto,
  UpdatePromptTemplateDto,
} from "./dto/ai.dto";
import { ResourceNotFoundException } from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";

interface AiConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  monthlyLimit: number;
  isActive: boolean;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AiCallResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  mock: boolean;
}

const DEFAULT_TEMPLATES: Record<AiFeature, string> = {
  LESSON_PLANNER:
    "You are an experienced teacher. Create a detailed lesson plan for the subject '{subject}' at {classLevel} covering '{topic}'. Duration: {durationMinutes} minutes. Focus: {focus}. Include objectives, activities, materials and assessment.",
  QUESTION_GENERATOR:
    "You are an exam setter. Generate {count} {type} questions of {difficulty} difficulty on '{topic}' for {subject}. Return them as a numbered list with clear options and mark the correct answer.",
  REPORT_COMMENT:
    "You are a teacher writing a report card comment for {studentName} in {subject}. Performance: {performance}. Context: {context}. Write 2-3 encouraging, specific sentences.",
  TUTOR:
    "You are a patient tutor for {subject}. Answer the student's question clearly and simply, using examples. Question: {message}",
  RECOMMENDATION:
    "You are an academic advisor. Give study recommendations for {studentName} in {subject}. Weak areas: {weakAreas}. Goal: {goal}. Provide 3-5 actionable suggestions.",
  INSIGHT:
    "You are a school analyst. Summarize performance insights for {classLevel} {term}. Context data: {context}. Highlight strengths, weaknesses and recommended actions.",
};

const MOCK_RESPONSES: Record<AiFeature, string> = {
  LESSON_PLANNER: [
    "LESSON PLAN - Mock",
    "1. Objectives: Students will understand the key concepts of the topic.",
    "2. Starter (5 min): Quick review question to engage students.",
    "3. Main activity (25 min): Guided examples followed by group practice.",
    "4. Plenary (10 min): Students present findings; teacher clarifies.",
    "5. Assessment: Short quiz and homework task to check understanding.",
    "Note: Configure an AI API key in Settings to generate tailored plans.",
  ].join("\n"),
  QUESTION_GENERATOR: [
    "QUESTIONS - Mock",
    "1. Which of the following best describes the topic?",
    "   A) Definition A   B) Definition B   C) Definition C   D) Definition D (Correct)",
    "2. What is the most important step when solving this?",
    "   A) Step 1 (Correct)   B) Step 2   C) Step 3   D) Step 4",
    "Note: Configure an AI API key in Settings to generate custom questions.",
  ].join("\n"),
  REPORT_COMMENT:
    "[Mock comment] {studentName} has shown steady progress in {subject}. With continued practice and focus, {studentName} will reach their full potential.",
  TUTOR:
    "[Mock tutor] In {subject}: start with the basics, then build up step by step. For your question '{message}', review the examples in your textbook and try one practice problem. Configure an AI API key for live answers.",
  RECOMMENDATION:
    "[Mock recommendations] For {studentName} in {subject}: (1) practise weak areas weekly, (2) complete past questions, (3) attend extra classes, (4) ask the teacher for clarification, (5) set a clear study goal. Configure an AI API key for tailored advice.",
  INSIGHT:
    "[Mock insight] Overall performance is on track. Average is within expectations; focus on strengthening foundational topics and increasing practice frequency. Configure an AI API key for detailed insights.",
};

@Injectable()
export class AiService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // ---------------- Public feature methods ----------------

  async lessonPlanner(dto: LessonPlannerDto, actor: AuthPrincipal) {
    const template = await this.getTemplate(AiFeature.LESSON_PLANNER);
    const prompt = this.render(template, {
      subject: dto.subject,
      classLevel: dto.classLevel,
      topic: dto.topic,
      durationMinutes: String(dto.durationMinutes ?? 60),
      focus: dto.focus ?? "Standard classroom delivery",
    });
    const result = await this.callAi(AiFeature.LESSON_PLANNER, prompt, actor);
    return { plan: result.text, ...this.stripTokens(result) };
  }

  async questionGenerator(dto: QuestionGeneratorDto, actor: AuthPrincipal) {
    const template = await this.getTemplate(AiFeature.QUESTION_GENERATOR);
    const prompt = this.render(template, {
      subject: dto.subject,
      topic: dto.topic ?? dto.subject,
      type: dto.type ?? "MULTIPLE_CHOICE",
      difficulty: dto.difficulty ?? "MEDIUM",
      count: String(dto.count ?? 5),
    });
    const result = await this.callAi(
      AiFeature.QUESTION_GENERATOR,
      prompt,
      actor,
    );

    if (dto.saveToBank) {
      await this.saveQuestionsToBank(dto, result.text, actor);
    }
    return { questions: result.text, ...this.stripTokens(result) };
  }

  async reportComment(dto: ReportCommentDto, actor: AuthPrincipal) {
    const template = await this.getTemplate(AiFeature.REPORT_COMMENT);
    const prompt = this.render(template, {
      studentName: dto.studentName,
      subject: dto.subject,
      performance: dto.performance ?? "steady progress",
      context: dto.context ?? "consistent effort",
    });
    const result = await this.callAi(AiFeature.REPORT_COMMENT, prompt, actor);
    return { comment: result.text, ...this.stripTokens(result) };
  }

  async tutor(dto: TutorMessageDto, actor: AuthPrincipal) {
    const template = await this.getTemplate(AiFeature.TUTOR);
    const prompt = this.render(template, {
      subject: dto.subject,
      message: dto.message,
    });
    const history: ChatMessage[] = (dto.history ?? []).map((h) => ({
      role: h.role,
      content: h.content,
    }));
    history.push({ role: "user", content: prompt });
    const result = await this.callAi(
      AiFeature.TUTOR,
      undefined,
      actor,
      history,
    );
    return { answer: result.text, ...this.stripTokens(result) };
  }

  async recommendation(dto: RecommendationDto, actor: AuthPrincipal) {
    const template = await this.getTemplate(AiFeature.RECOMMENDATION);
    const prompt = this.render(template, {
      studentName: dto.studentName,
      subject: dto.subject,
      weakAreas: (dto.weakAreas ?? []).join(", ") || "general",
      goal: dto.goal ?? "improve performance",
    });
    const result = await this.callAi(AiFeature.RECOMMENDATION, prompt, actor);
    return { recommendations: result.text, ...this.stripTokens(result) };
  }

  async insight(dto: InsightDto, actor: AuthPrincipal) {
    const template = await this.getTemplate(AiFeature.INSIGHT);
    const prompt = this.render(template, {
      classLevel: dto.classLevel,
      term: dto.term ?? "current term",
      context: JSON.stringify(dto.context ?? {}),
    });
    const result = await this.callAi(AiFeature.INSIGHT, prompt, actor);
    return { insights: result.text, ...this.stripTokens(result) };
  }

  // ---------------- Templates ----------------

  async listTemplates() {
    const items = await this.prisma.scoped.aiPromptTemplate.findMany({
      where: this.tenantWhere({ deletedAt: null }),
      orderBy: [{ feature: "asc" }, { name: "asc" }],
    });
    return { items, meta: { total: items.length } };
  }

  async createTemplate(dto: CreatePromptTemplateDto) {
    return this.prisma.scoped.aiPromptTemplate.create({
      data: this.withTenant({
        feature: dto.feature,
        name: dto.name,
        prompt: dto.prompt,
        variables: dto.variables ?? [],
      } as Prisma.AiPromptTemplateUncheckedCreateInput),
    });
  }

  async updateTemplate(id: string, dto: UpdatePromptTemplateDto) {
    await this.getTemplateById(id);
    return this.prisma.scoped.aiPromptTemplate.update({
      where: { id },
      data: dto as Prisma.AiPromptTemplateUpdateInput,
    });
  }

  async removeTemplate(id: string): Promise<void> {
    await this.getTemplateById(id);
    await this.prisma.scoped.aiPromptTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------- Config & usage ----------------

  async getConfig() {
    const settings = await this.getSettings();
    const ai = (settings.aiConfig ?? {}) as Partial<AiConfig>;
    if (!ai.provider) return null;
    return {
      provider: ai.provider,
      baseUrl: ai.baseUrl,
      model: ai.model,
      monthlyLimit: ai.monthlyLimit,
      isActive: ai.isActive ?? false,
      hasApiKey: Boolean(ai.apiKey),
    };
  }

  async saveConfig(dto: AiConfigDto) {
    const settings = await this.getSettings();
    settings.aiConfig = {
      provider: dto.provider,
      apiKey: dto.apiKey,
      baseUrl: dto.baseUrl ?? "https://api.openai.com/v1",
      model: dto.model ?? "gpt-4o-mini",
      monthlyLimit: dto.monthlyLimit ?? 1000,
      isActive: dto.isActive ?? true,
    };
    await this.updateSettings(settings);
    return this.getConfig();
  }

  async usageStats() {
    const [logs, featureGroups] = await Promise.all([
      this.prisma.scoped.aiUsageLog.findMany({
        where: this.tenantWhere({}),
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { id: true, email: true } } },
      }),
      this.prisma.scoped.aiUsageLog.groupBy({
        by: ["feature"],
        where: this.tenantWhere({ status: "SUCCESS" }),
        _sum: { totalTokens: true },
        _count: true,
      }),
    ]);
    const month = await this.monthlyUsage();
    const total = await this.prisma.scoped.aiUsageLog.count({
      where: this.tenantWhere({}),
    });
    return {
      totalCalls: total,
      monthlyCalls: month.requests,
      monthlyTokens: month.tokens,
      byFeature: featureGroups.map((g) => ({
        feature: g.feature,
        calls: g._count,
        tokens: g._sum.totalTokens ?? 0,
      })),
      recentLogs: logs,
    };
  }

  async usageLogs(query: QueryUsageLogsDto) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.AiUsageLogWhereInput = {
      ...(query.feature ? { feature: query.feature } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.aiUsageLog.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "createdAt",
          "totalTokens",
        ]) as Prisma.AiUsageLogOrderByWithRelationInput,
        include: { user: { select: { id: true, email: true } } },
      }),
      this.prisma.scoped.aiUsageLog.count({ where: this.tenantWhere(where) }),
    ]);
    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  // ---------------- Internals ----------------

  private async callAi(
    feature: AiFeature,
    prompt: string | undefined,
    actor: AuthPrincipal,
    messages?: ChatMessage[],
  ): Promise<AiCallResult> {
    await this.assertUnderLimit();
    const config = await this.getAiConfig();
    const started = Date.now();

    try {
      if (config.mock) {
        const text = this.mockFor(feature, prompt);
        const latency = Date.now() - started;
        await this.logUsage(
          feature,
          actor.userId,
          null,
          0,
          0,
          latency,
          "SUCCESS",
          null,
        );
        return {
          text,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: latency,
          mock: true,
        };
      }

      const chat: ChatMessage[] = messages ?? [
        { role: "system", content: "You are a helpful education assistant." },
        { role: "user", content: prompt ?? "" },
      ];
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: chat,
          temperature: 0.7,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `AI request failed (${res.status}): ${body.slice(0, 300)}`,
        );
      }
      const data = (await res.json()) as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number };
      };
      const text = data.choices?.[0]?.message?.content ?? "";
      const latency = Date.now() - started;
      const promptTokens = data.usage?.prompt_tokens ?? 0;
      const completionTokens = data.usage?.completion_tokens ?? 0;
      await this.logUsage(
        feature,
        actor.userId,
        config.model,
        promptTokens,
        completionTokens,
        latency,
        "SUCCESS",
        null,
      );
      return {
        text,
        promptTokens,
        completionTokens,
        latencyMs: latency,
        mock: false,
      };
    } catch (err) {
      const latency = Date.now() - started;
      const message = err instanceof Error ? err.message : String(err);
      await this.logUsage(
        feature,
        actor.userId,
        null,
        0,
        0,
        latency,
        "ERROR",
        message,
      );
      throw new BadRequestException(`AI request failed: ${message}`);
    }
  }

  private async getAiConfig(): Promise<AiConfig & { mock: boolean }> {
    const settings = await this.getSettings();
    const ai = (settings.aiConfig ?? {}) as Partial<AiConfig>;
    if (!ai.apiKey || ai.isActive === false) {
      return {
        provider: ai.provider ?? "openai",
        apiKey: ai.apiKey ?? "",
        baseUrl: ai.baseUrl ?? "https://api.openai.com/v1",
        model: ai.model ?? "gpt-4o-mini",
        monthlyLimit: ai.monthlyLimit ?? 1000,
        isActive: ai.isActive ?? true,
        mock: true,
      };
    }
    return {
      provider: ai.provider ?? "openai",
      apiKey: ai.apiKey,
      baseUrl: ai.baseUrl ?? "https://api.openai.com/v1",
      model: ai.model ?? "gpt-4o-mini",
      monthlyLimit: ai.monthlyLimit ?? 1000,
      isActive: ai.isActive ?? true,
      mock: false,
    };
  }

  private async assertUnderLimit() {
    const config = await this.getAiConfig();
    const usage = await this.monthlyUsage();
    if (usage.requests >= config.monthlyLimit) {
      throw new BadRequestException(
        `Monthly AI usage limit reached (${usage.requests}/${config.monthlyLimit} requests). Contact your administrator.`,
      );
    }
  }

  private async monthlyUsage() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const agg = await this.prisma.scoped.aiUsageLog.aggregate({
      where: this.tenantWhere({ createdAt: { gte: start } }),
      _count: true,
      _sum: { totalTokens: true },
    });
    return {
      requests: agg._count,
      tokens: agg._sum.totalTokens ?? 0,
    };
  }

  private async logUsage(
    feature: AiFeature,
    userId: string | undefined,
    model: string | null,
    promptTokens: number,
    completionTokens: number,
    latencyMs: number,
    status: string,
    error: string | null,
  ) {
    await this.prisma.scoped.aiUsageLog.create({
      data: this.withTenant({
        userId,
        feature,
        model,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        latencyMs,
        status,
        error,
      } as Prisma.AiUsageLogUncheckedCreateInput),
    });
  }

  private async getTemplate(feature: AiFeature) {
    const template = await this.prisma.scoped.aiPromptTemplate.findFirst({
      where: this.tenantWhere({ feature, isActive: true, deletedAt: null }),
      orderBy: { isDefault: "desc" },
    });
    return template?.prompt ?? DEFAULT_TEMPLATES[feature];
  }

  private async getTemplateById(id: string) {
    const template = await this.prisma.scoped.aiPromptTemplate.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
    });
    if (!template) throw new ResourceNotFoundException("AiPromptTemplate", id);
    return template;
  }

  private render(template: string, vars: Record<string, string>): string {
    let out = template;
    for (const [key, value] of Object.entries(vars)) {
      out = out.replaceAll(`{${key}}`, value);
    }
    return out;
  }

  private mockFor(feature: AiFeature, _prompt: string | undefined): string {
    const base = MOCK_RESPONSES[feature];
    // Humanize remaining placeholders into readable mock text.
    return base.replace(/\{(\w+)\}/g, (_match, key: string) => {
      const pretty: Record<string, string> = {
        studentName: "the student",
        subject: "the subject",
        weakAreas: "the identified areas",
        goal: "the set goal",
        classLevel: "this class",
        term: "this term",
        context: "the provided data",
        message: "your question",
      };
      return pretty[key] ?? key;
    });
  }

  /** Tries to recover a substituted value from the rendered prompt. */
  private extractVariable(
    prompt: string | undefined,
    key: string,
  ): string | null {
    if (!prompt) return null;
    const patterns = [
      new RegExp(`for ${key}[: ]*([^.,\n]+)`, "i"),
      new RegExp(`in ${key}[: ]*([^.,\n]+)`, "i"),
      new RegExp(`on ${key}[: ]*([^.,\n]+)`, "i"),
      new RegExp(`${key}: ([^.,\n]+)`, "i"),
    ];
    for (const re of patterns) {
      const m = prompt.match(re);
      if (m) return m[1]!.trim();
    }
    return null;
  }

  private stripTokens(result: AiCallResult) {
    return {
      mock: result.mock,
      latencyMs: result.latencyMs,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    };
  }

  private async saveQuestionsToBank(
    dto: QuestionGeneratorDto,
    generated: string,
    actor: AuthPrincipal,
  ) {
    // Best-effort: create simple MCQ-style questions from the generated text.
    const lines = generated
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, dto.count ?? 5);
    for (const line of lines) {
      await this.prisma.scoped.question.create({
        data: this.withTenant({
          createdById: actor.userId,
          type: dto.type === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : "ESSAY",
          difficulty: "MEDIUM",
          body: line.replace(/^\d+[.)]\s*/, ""),
          options:
            dto.type === "MULTIPLE_CHOICE" ? this.mockMcqOptions() : null,
          correctAnswer:
            dto.type === "MULTIPLE_CHOICE" ? { optionId: "a" } : null,
          points: 1,
          status: "DRAFT",
        }) as Prisma.QuestionUncheckedCreateInput,
      });
    }
  }

  private mockMcqOptions() {
    return [
      { id: "a", text: "Option A", isCorrect: true },
      { id: "b", text: "Option B", isCorrect: false },
      { id: "c", text: "Option C", isCorrect: false },
      { id: "d", text: "Option D", isCorrect: false },
    ];
  }

  private async getSettings(): Promise<Record<string, unknown>> {
    const tenant = await this.prisma.scoped.tenant.findFirst({
      where: { id: this.tenantId() },
      select: { settings: true },
    });
    if (!tenant) throw new ResourceNotFoundException("Tenant", this.tenantId());
    return (tenant.settings ?? {}) as Record<string, unknown>;
  }

  private async updateSettings(settings: Record<string, unknown>) {
    await this.prisma.scoped.tenant.update({
      where: { id: this.tenantId() },
      data: { settings: settings as Prisma.InputJsonValue },
    });
  }
}
