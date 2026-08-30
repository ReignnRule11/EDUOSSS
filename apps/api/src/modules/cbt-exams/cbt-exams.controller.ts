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

import { CbtExamsService } from "./cbt-exams.service";
import {
  AddExamQuestionsDto,
  CreateExamDto,
  QueryExamsDto,
  RandomizeExamDto,
  ReorderExamQuestionsDto,
  UpdateExamDto,
} from "./dto/exam.dto";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("CBT Exams")
@ApiBearerAuth()
@Controller("exams")
export class CbtExamsController {
  constructor(private readonly examsService: CbtExamsService) {}

  @Post()
  @Permissions(Permission.EXAM_WRITE)
  @ApiOperation({ summary: "Create an exam" })
  @Audited({ action: AuditAction.CREATE, resource: "exam" })
  create(@Body() dto: CreateExamDto, @CurrentUser() actor: AuthPrincipal) {
    return this.examsService.create(actor, dto);
  }

  @Get()
  @Permissions(Permission.EXAM_READ)
  @ApiOperation({ summary: "List exams with pagination and filters" })
  @Cacheable({ ttl: 30 })
  findAll(@Query() query: QueryExamsDto) {
    return this.examsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.EXAM_READ)
  @ApiOperation({ summary: "Get an exam by id" })
  findOne(@Param("id") id: string) {
    return this.examsService.findOne(id, false);
  }

  @Patch(":id")
  @Permissions(Permission.EXAM_WRITE)
  @ApiOperation({ summary: "Update an exam" })
  @Audited({ action: AuditAction.UPDATE, resource: "exam" })
  update(@Param("id") id: string, @Body() dto: UpdateExamDto) {
    return this.examsService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.EXAM_DELETE)
  @ApiOperation({ summary: "Soft-delete an exam" })
  @Audited({ action: AuditAction.DELETE, resource: "exam" })
  remove(@Param("id") id: string) {
    return this.examsService.remove(id);
  }

  @Post(":id/publish")
  @Permissions(Permission.EXAM_WRITE)
  @ApiOperation({ summary: "Publish an exam (requires >= 1 active question)" })
  @Audited({ action: AuditAction.UPDATE, resource: "exam" })
  publish(@Param("id") id: string) {
    return this.examsService.publish(id);
  }

  @Get(":id/questions")
  @Permissions(Permission.EXAM_READ)
  @ApiOperation({ summary: "List questions of an exam in order" })
  questions(@Param("id") id: string) {
    return this.examsService.findOne(id, true);
  }

  @Post(":id/questions")
  @Permissions(Permission.EXAM_WRITE)
  @ApiOperation({ summary: "Add questions to an exam" })
  @Audited({ action: AuditAction.UPDATE, resource: "exam" })
  addQuestions(@Param("id") id: string, @Body() dto: AddExamQuestionsDto) {
    return this.examsService.addQuestions(id, dto);
  }

  @Delete(":id/questions/:questionId")
  @Permissions(Permission.EXAM_WRITE)
  @ApiOperation({ summary: "Remove a question from an exam" })
  @Audited({ action: AuditAction.UPDATE, resource: "exam" })
  removeQuestion(
    @Param("id") id: string,
    @Param("questionId") questionId: string,
  ) {
    return this.examsService.removeQuestion(id, questionId);
  }

  @Patch(":id/questions/reorder")
  @Permissions(Permission.EXAM_WRITE)
  @ApiOperation({ summary: "Reorder exam questions" })
  @Audited({ action: AuditAction.UPDATE, resource: "exam" })
  reorder(@Param("id") id: string, @Body() dto: ReorderExamQuestionsDto) {
    return this.examsService.reorderQuestions(id, dto);
  }

  @Post(":id/questions/randomize")
  @Permissions(Permission.EXAM_WRITE)
  @ApiOperation({
    summary: "Replace exam questions with a random pick from the bank",
  })
  @Audited({ action: AuditAction.UPDATE, resource: "exam" })
  randomize(@Param("id") id: string, @Body() dto: RandomizeExamDto) {
    return this.examsService.randomize(id, dto);
  }
}
