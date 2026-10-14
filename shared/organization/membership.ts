export const USER_ROLES = ["admin", "member"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

export function normalizeMemberEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function memberRemovalError(input: {
  actorId: string;
  targetId: string;
  targetRole: UserRole;
  activeAdminCount: number;
}): string | null {
  if (input.actorId === input.targetId) {
    return "You can't remove yourself.";
  }
  if (input.targetRole === "admin" && input.activeAdminCount <= 1) {
    return "The last admin can't be removed.";
  }
  return null;
}

export function roleAfterInviteAccept(
  currentRole: UserRole,
  inviteRole: UserRole,
): UserRole {
  if (currentRole === "admin" || inviteRole === "admin") return "admin";
  return "member";
}

export function roleChangeError(input: {
  currentRole: UserRole;
  nextRole: UserRole;
  activeAdminCount: number;
}): string | null {
  if (
    input.currentRole === "admin" &&
    input.nextRole === "member" &&
    input.activeAdminCount <= 1
  ) {
    return "The last admin can't be changed to a member.";
  }
  return null;
}

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function inviteAcceptPath(token: string): string {
  return `/invite/${encodeURIComponent(token)}`;
}
