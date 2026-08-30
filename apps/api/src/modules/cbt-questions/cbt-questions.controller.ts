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

import { CbtQuestionsService } from "./cbt-questions.service";
import {
  CreateQuestionCategoryDto,
  CreateQuestionDto,
  QueryQuestionsDto,
  UpdateQuestionCategoryDto,
  UpdateQuestionDto,
} from "./dto/question.dto";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("CBT Question Categories")
@ApiBearerAuth()
@Controller("question-categories")
export class CbtQuestionCategoriesController {
  constructor(private readonly questionsService: CbtQuestionsService) {}

  @Post()
  @Permissions(Permission.QUESTION_WRITE)
  @ApiOperation({ summary: "Create a question category" })
  @Audited({ action: AuditAction.CREATE, resource: "question_category" })
  create(@Body() dto: CreateQuestionCategoryDto) {
    return this.questionsService.createCategory(dto);
  }

  @Get()
  @Permissions(Permission.QUESTION_READ)
  @ApiOperation({ summary: "List question categories" })
  @Cacheable({ ttl: 30 })
  list() {
    return this.questionsService.listCategories();
  }

  @Patch(":id")
  @Permissions(Permission.QUESTION_WRITE)
  @ApiOperation({ summary: "Update a question category" })
  @Audited({ action: AuditAction.UPDATE, resource: "question_category" })
  update(@Param("id") id: string, @Body() dto: UpdateQuestionCategoryDto) {
    return this.questionsService.updateCategory(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.QUESTION_DELETE)
  @ApiOperation({ summary: "Remove a question category" })
  @Audited({ action: AuditAction.DELETE, resource: "question_category" })
  remove(@Param("id") id: string) {
    return this.questionsService.removeCategory(id);
  }
}

@ApiTags("CBT Question Bank")
@ApiBearerAuth()
@Controller("questions")
export class CbtQuestionsController {
  constructor(private readonly questionsService: CbtQuestionsService) {}

  @Post()
  @Permissions(Permission.QUESTION_WRITE)
  @ApiOperation({ summary: "Create a question in the bank" })
  @Audited({ action: AuditAction.CREATE, resource: "question" })
  create(@Body() dto: CreateQuestionDto, @CurrentUser() actor: AuthPrincipal) {
    return this.questionsService.create(actor, dto);
  }

  @Get()
  @Permissions(Permission.QUESTION_READ)
  @ApiOperation({ summary: "List/filter questions with pagination" })
  @Cacheable({ ttl: 30 })
  findAll(@Query() query: QueryQuestionsDto) {
    return this.questionsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.QUESTION_READ)
  @ApiOperation({ summary: "Get a question by id" })
  findOne(@Param("id") id: string) {
    return this.questionsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.QUESTION_WRITE)
  @ApiOperation({ summary: "Update a question" })
  @Audited({ action: AuditAction.UPDATE, resource: "question" })
  update(@Param("id") id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.QUESTION_DELETE)
  @ApiOperation({ summary: "Soft-delete a question" })
  @Audited({ action: AuditAction.DELETE, resource: "question" })
  remove(@Param("id") id: string) {
    return this.questionsService.remove(id);
  }
}
