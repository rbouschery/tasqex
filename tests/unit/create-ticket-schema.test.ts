import { describe, expect, it } from "vitest";
import {
  createTicketSchema,
  createTicketMcpInputSchema,
} from "@server/lib/validation/schemas";

describe("createTicketSchema", () => {
  it("accepts a task with an optional body and contact", () => {
    const parsed = createTicketSchema.parse({
      kind: "task",
      title: "Write the spec",
      body: "Cover invite links.",
      contact: { username: "ada" },
    });

    expect(parsed.kind).toBe("task");
    expect(parsed.body).toBe("Cover invite links.");
    expect(parsed.contact).toEqual({ username: "ada" });
  });

  it("rejects an empty title", () => {
    const result = createTicketSchema.safeParse({
      kind: "task",
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects conversation tickets", () => {
    const result = createTicketSchema.safeParse({
      kind: "conversation",
      title: "Check-in",
    });
    expect(result.success).toBe(false);
  });
});

describe("createTicketMcpInputSchema", () => {
  it("defaults kind to task", () => {
    const parsed = createTicketMcpInputSchema.parse({
      title: "Follow up",
    });
    expect(parsed.kind).toBe("task");
    expect(parsed.title).toBe("Follow up");
  });
});
