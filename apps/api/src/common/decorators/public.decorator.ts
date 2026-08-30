import { SetMetadata } from "@nestjs/common";

import { IS_PUBLIC_KEY } from "../constants/decorator-keys.constant";

/** Marks a route as publicly accessible (bypasses JWT auth + tenant guard). */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
