import { describe, expect, it } from "vitest";
import {
  inviteAcceptPath,
  isUserRole,
  memberRemovalError,
  normalizeMemberEmail,
  roleAfterInviteAccept,
  roleChangeError,
} from "@shared/organization/membership";

describe("organization membership", () => {
  it("normalizes invite emails", () => {
    expect(normalizeMemberEmail("  Ada@Example.com ")).toBe("ada@example.com");
  });

  it("recognizes admin and member roles", () => {
    expect(isUserRole("admin")).toBe(true);
    expect(isUserRole("member")).toBe(true);
    expect(isUserRole("agent")).toBe(false);
  });

  it("keeps an existing admin when they accept a member invite", () => {
    expect(roleAfterInviteAccept("admin", "member")).toBe("admin");
    expect(roleAfterInviteAccept("member", "admin")).toBe("admin");
    expect(roleAfterInviteAccept("member", "member")).toBe("member");
  });

  it("blocks removing yourself and the last admin", () => {
    expect(
      memberRemovalError({
        actorId: "user-1",
        targetId: "user-1",
        targetRole: "member",
        activeAdminCount: 2,
      }),
    ).toMatch(/yourself/);
    expect(
      memberRemovalError({
        actorId: "user-1",
        targetId: "user-2",
        targetRole: "admin",
        activeAdminCount: 1,
      }),
    ).toMatch(/last admin/);
    expect(
      memberRemovalError({
        actorId: "user-1",
        targetId: "user-2",
        targetRole: "member",
        activeAdminCount: 1,
      }),
    ).toBeNull();
  });

  it("blocks demoting the last admin", () => {
    expect(
      roleChangeError({
        currentRole: "admin",
        nextRole: "member",
        activeAdminCount: 1,
      }),
    ).toMatch(/last admin/);
    expect(
      roleChangeError({
        currentRole: "admin",
        nextRole: "member",
        activeAdminCount: 2,
      }),
    ).toBeNull();
  });

  it("builds an invite accept path", () => {
    expect(inviteAcceptPath("abc")).toBe("/invite/abc");
  });
});
