import { AuditAction, Permission } from "@eduos/shared";
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

import { CreateTimetableSlotDto } from "./dto/create-timetable-slot.dto";
import { QueryTimetableSlotsDto } from "./dto/query-timetable-slots.dto";
import { UpdateTimetableSlotDto } from "./dto/update-timetable-slot.dto";
import { TimetableService } from "./timetable.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Timetable")
@ApiBearerAuth()
@Controller("timetable")
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post()
  @Permissions(Permission.TIMETABLE_WRITE)
  @ApiOperation({ summary: "Create a timetable slot" })
  @Audited({ action: AuditAction.CREATE, resource: "timetable-slot" })
  create(@Body() dto: CreateTimetableSlotDto) {
    return this.timetableService.create(dto);
  }

  @Get()
  @Permissions(Permission.TIMETABLE_READ)
  @ApiOperation({
    summary: "List timetable slots with pagination and filters",
  })
  @Cacheable({ ttl: 30 })
  @ApiPaginatedResponse(CreateTimetableSlotDto)
  findAll(@Query() query: QueryTimetableSlotsDto) {
    return this.timetableService.findAll(query);
  }

  @Get("classes/:classGroupId")
  @Permissions(Permission.TIMETABLE_READ)
  @ApiOperation({
    summary: "Get the weekly timetable grid for a class",
  })
  getClassTimetable(
    @Param("classGroupId") classGroupId: string,
    @Query("termId") termId?: string,
  ) {
    return this.timetableService.getClassTimetable(classGroupId, termId);
  }

  @Get(":id")
  @Permissions(Permission.TIMETABLE_READ)
  @ApiOperation({ summary: "Get a timetable slot by id" })
  findOne(@Param("id") id: string) {
    return this.timetableService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.TIMETABLE_WRITE)
  @ApiOperation({ summary: "Update a timetable slot" })
  @Audited({ action: AuditAction.UPDATE, resource: "timetable-slot" })
  update(@Param("id") id: string, @Body() dto: UpdateTimetableSlotDto) {
    return this.timetableService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.TIMETABLE_DELETE)
  @ApiOperation({ summary: "Deactivate a timetable slot" })
  @Audited({ action: AuditAction.DELETE, resource: "timetable-slot" })
  remove(@Param("id") id: string) {
    return this.timetableService.remove(id);
  }
}
