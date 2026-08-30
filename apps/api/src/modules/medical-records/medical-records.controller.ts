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

import { CreateMedicalRecordDto } from "./dto/create-medical-record.dto";
import { QueryMedicalRecordsDto } from "./dto/query-medical-records.dto";
import { UpdateMedicalRecordDto } from "./dto/update-medical-record.dto";
import { MedicalRecordsService } from "./medical-records.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Medical Records")
@ApiBearerAuth()
@Controller("medical-records")
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @Permissions(Permission.MEDICAL_WRITE)
  @ApiOperation({ summary: "Create a medical record for a student" })
  @Audited({ action: AuditAction.CREATE, resource: "medical-record" })
  create(
    @Body() dto: CreateMedicalRecordDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.medicalRecordsService.create(dto, userId);
  }

  @Get()
  @Permissions(Permission.MEDICAL_READ)
  @ApiOperation({ summary: "List medical records with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateMedicalRecordDto)
  findAll(@Query() query: QueryMedicalRecordsDto) {
    return this.medicalRecordsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.MEDICAL_READ)
  @ApiOperation({ summary: "Get a medical record by id" })
  findOne(@Param("id") id: string) {
    return this.medicalRecordsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.MEDICAL_WRITE)
  @ApiOperation({ summary: "Update a medical record" })
  @Audited({ action: AuditAction.UPDATE, resource: "medical-record" })
  update(@Param("id") id: string, @Body() dto: UpdateMedicalRecordDto) {
    return this.medicalRecordsService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.MEDICAL_DELETE)
  @ApiOperation({ summary: "Delete a medical record (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "medical-record" })
  remove(@Param("id") id: string) {
    return this.medicalRecordsService.remove(id);
  }
}
