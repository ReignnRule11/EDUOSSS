import type { AuthPrincipal } from "@eduos/shared";
import {
  createParamDecorator,
  type ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";

/** Injects the authenticated principal into a handler parameter. */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthPrincipal | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthPrincipal }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("User context is not available");
    }
    return data ? user[data] : user;
  },
);
