import { Permission } from "@eduos/shared";
import type { AuthPrincipal } from "@eduos/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { SendPushDto, SubscribeDto } from "./dto/push.dto";
import { PushService } from "./push.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Push Notifications")
@ApiBearerAuth()
@Controller("push")
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post("subscribe")
  @Permissions(Permission.PUSH_SUBSCRIBE)
  @ApiOperation({ summary: "Register a push subscription for the user" })
  subscribe(@Body() dto: SubscribeDto, @CurrentUser() actor: AuthPrincipal) {
    return this.pushService.subscribe(actor, dto);
  }

  @Get("subscriptions")
  @Permissions(Permission.PUSH_SUBSCRIBE)
  @ApiOperation({ summary: "List my push subscriptions" })
  listMy(@CurrentUser() actor: AuthPrincipal) {
    return this.pushService.listMySubscriptions(actor);
  }

  @Delete("unsubscribe")
  @Permissions(Permission.PUSH_SUBSCRIBE)
  @ApiOperation({ summary: "Remove a push subscription by endpoint" })
  unsubscribe(
    @Query("endpoint") endpoint: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.pushService.unsubscribe(actor, endpoint);
  }

  @Post("send")
  @Permissions(Permission.PUSH_SEND)
  @ApiOperation({ summary: "Send a push notification to subscribed devices" })
  send(@Body() dto: SendPushDto, @CurrentUser() actor: AuthPrincipal) {
    return this.pushService.send(dto, actor);
  }

  @Get("config")
  @Permissions(Permission.PUSH_SEND)
  @ApiOperation({ summary: "Get push configuration (VAPID public key)" })
  getConfig() {
    return this.pushService.getConfig();
  }

  @Patch("config")
  @Permissions(Permission.PUSH_SEND)
  @ApiOperation({ summary: "Save VAPID push configuration" })
  saveConfig(
    @Body()
    config: {
      publicKey: string;
      privateKey: string;
      subject: string;
    },
  ) {
    return this.pushService.saveConfig(config);
  }
}
