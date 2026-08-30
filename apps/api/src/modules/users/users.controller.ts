import type { AuthPrincipal, AuditAction } from "@eduos/shared";
import { Permission } from "@eduos/shared";
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

import { CreateUserDto } from "./dto/create-user.dto";
import { QueryUsersDto } from "./dto/query-users.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions(Permission.USER_WRITE)
  @ApiOperation({ summary: "Create a user within the current tenant" })
  @Audited({ action: "CREATE" as AuditAction, resource: "user" })
  create(@CurrentUser() actor: AuthPrincipal, @Body() dto: CreateUserDto) {
    return this.usersService.create(actor, dto);
  }

  @Get()
  @Permissions(Permission.USER_READ)
  @ApiOperation({
    summary: "List tenant users with pagination, search and filters",
  })
  @Cacheable({ ttl: 30 })
  @ApiPaginatedResponse(CreateUserDto)
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.USER_READ)
  @ApiOperation({ summary: "Get a user by id" })
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.USER_WRITE)
  @ApiOperation({ summary: "Update a user" })
  @Audited({ action: "UPDATE" as AuditAction, resource: "user" })
  update(
    @CurrentUser() actor: AuthPrincipal,
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(actor, id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.USER_DELETE)
  @ApiOperation({ summary: "Deactivate a user" })
  @Audited({ action: "DELETE" as AuditAction, resource: "user" })
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }

  @Post(":id/unlock")
  @Permissions(Permission.USER_WRITE)
  @ApiOperation({
    summary: "Unlock a locked account and clear failed attempts",
  })
  @Audited({ action: "UPDATE" as AuditAction, resource: "user" })
  unlock(@Param("id") id: string) {
    return this.usersService.unlock(id);
  }
}
