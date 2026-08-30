import { applyDecorators, type Type } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from "@nestjs/swagger";

import { PaginatedResultDto } from "../dto/paginated-result.dto";

/**
 * Documents a paginated list endpoint. Generates the OpenAPI schema for
 * { items: T[], meta: PaginationMeta }.
 */
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
): MethodDecorator => {
  return applyDecorators(
    ApiExtraModels(PaginatedResultDto, model),
    ApiOkResponse({
      description: `Paginated list of ${model.name} records`,
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResultDto) },
          {
            properties: {
              items: {
                type: "array",
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
};
