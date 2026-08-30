import { Permission } from "@eduos/shared";
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

import { AiService } from "./ai.service";
import {
  AiConfigDto,
  CreatePromptTemplateDto,
  InsightDto,
  LessonPlannerDto,
  QuestionGeneratorDto,
  QueryUsageLogsDto,
  RecommendationDto,
  ReportCommentDto,
  TutorMessageDto,
  UpdatePromptTemplateDto,
} from "./dto/ai.dto";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("AI Services")
@ApiBearerAuth()
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("lesson-planner")
  @Permissions(Permission.AI_USE)
  @ApiOperation({ summary: "Generate a lesson plan" })
  lessonPlanner(
    @Body() dto: LessonPlannerDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.aiService.lessonPlanner(dto, actor);
  }

  @Post("question-generator")
  @Permissions(Permission.AI_USE)
  @ApiOperation({ summary: "Generate practice questions" })
  questionGenerator(
    @Body() dto: QuestionGeneratorDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.aiService.questionGenerator(dto, actor);
  }

  @Post("report-comment")
  @Permissions(Permission.AI_USE)
  @ApiOperation({ summary: "Generate a report card comment" })
  reportComment(
    @Body() dto: ReportCommentDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.aiService.reportComment(dto, actor);
  }

  @Post("tutor")
  @Permissions(Permission.AI_USE)
  @ApiOperation({ summary: "Ask the AI tutor a question" })
  tutor(@Body() dto: TutorMessageDto, @CurrentUser() actor: AuthPrincipal) {
    return this.aiService.tutor(dto, actor);
  }

  @Post("recommendations")
  @Permissions(Permission.AI_USE)
  @ApiOperation({ summary: "Generate student study recommendations" })
  recommendation(
    @Body() dto: RecommendationDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.aiService.recommendation(dto, actor);
  }

  @Post("insights")
  @Permissions(Permission.AI_USE)
  @ApiOperation({ summary: "Generate performance insights" })
  insight(@Body() dto: InsightDto, @CurrentUser() actor: AuthPrincipal) {
    return this.aiService.insight(dto, actor);
  }

  @Get("templates")
  @Permissions(Permission.AI_READ)
  @ApiOperation({ summary: "List prompt templates" })
  @Cacheable({ ttl: 30 })
  listTemplates() {
    return this.aiService.listTemplates();
  }

  @Post("templates")
  @Permissions(Permission.AI_WRITE)
  @ApiOperation({ summary: "Create a prompt template" })
  createTemplate(@Body() dto: CreatePromptTemplateDto) {
    return this.aiService.createTemplate(dto);
  }

  @Patch("templates/:id")
  @Permissions(Permission.AI_WRITE)
  @ApiOperation({ summary: "Update a prompt template" })
  updateTemplate(
    @Param("id") id: string,
    @Body() dto: UpdatePromptTemplateDto,
  ) {
    return this.aiService.updateTemplate(id, dto);
  }

  @Delete("templates/:id")
  @Permissions(Permission.AI_WRITE)
  @ApiOperation({ summary: "Delete a prompt template" })
  removeTemplate(@Param("id") id: string) {
    return this.aiService.removeTemplate(id);
  }

  @Get("config")
  @Permissions(Permission.AI_READ)
  @ApiOperation({ summary: "Get AI configuration (key masked)" })
  getConfig() {
    return this.aiService.getConfig();
  }

  @Patch("config")
  @Permissions(Permission.AI_WRITE)
  @ApiOperation({ summary: "Save AI provider configuration" })
  saveConfig(@Body() dto: AiConfigDto) {
    return this.aiService.saveConfig(dto);
  }

  @Get("usage")
  @Permissions(Permission.AI_READ)
  @ApiOperation({ summary: "AI usage statistics" })
  @Cacheable({ ttl: 15 })
  usage() {
    return this.aiService.usageStats();
  }

  @Get("usage/logs")
  @Permissions(Permission.AI_READ)
  @ApiOperation({ summary: "AI usage logs" })
  usageLogs(@Query() query: QueryUsageLogsDto) {
    return this.aiService.usageLogs(query);
  }
}
