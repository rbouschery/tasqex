import { describe, expect, it } from "vitest";
import { OPERATION_CATALOG } from "@tasqex/api-spec";
import {
  buildOpenApiDocument,
  countOpenApiOperations,
} from "../../scripts/openapi/build-document.js";
import {
  REQUEST_BODY_BY_OPERATION,
  listOperationsWithRequestBodies,
} from "../../scripts/openapi/request-schemas.js";

describe("OpenAPI generation", () => {
  it("documents every catalog operation", () => {
    const document = buildOpenApiDocument();
    expect(countOpenApiOperations(document)).toBe(OPERATION_CATALOG.length);
  });

  it("includes bearer auth and shared error envelope", () => {
    const document = buildOpenApiDocument();
    expect(document.components.securitySchemes.bearerAuth).toBeDefined();
    expect(document.components.schemas.ApiError).toBeDefined();
  });

  it("uses a server variable for the deployment hostname", () => {
    const document = buildOpenApiDocument();

    expect(document.servers[0]).toMatchObject({
      url: "https://{instanceHost}/api/v1",
      variables: {
        instanceHost: {
          default: "your-instance.com",
        },
      },
    });
  });

  it("maps mutating operations with JSON bodies to request schemas", () => {
    const jsonBodies = listOperationsWithRequestBodies().filter((name) => {
      const kind = REQUEST_BODY_BY_OPERATION[name]?.kind;
      return kind === "json" || kind === "optional-json";
    });

    const document = buildOpenApiDocument();
    for (const operationName of jsonBodies) {
      expect(
        document.components.schemas[`${operationName}Request`],
        operationName,
      ).toBeDefined();
    }
  });

  it("documents custom field group filter on list endpoint", () => {
    const document = buildOpenApiDocument();
    const parameters = document.paths["/custom-fields"]?.get?.parameters ?? [];
    const groupParam = parameters.find((param) => param.name === "group");

    expect(groupParam).toMatchObject({
      in: "query",
      schema: { enum: ["ticket", "contact"] },
    });
    expect(groupParam?.description).toContain("ticket");
  });

  it("adds readable tag metadata for API reference grouping", () => {
    const document = buildOpenApiDocument();
    const ticketsTag = document.tags.find((tag) => tag.name === "tickets");

    expect(ticketsTag).toMatchObject({
      name: "tickets",
      description: expect.stringContaining("Tasks"),
      "x-displayName": "Tasks",
    });
  });
});
