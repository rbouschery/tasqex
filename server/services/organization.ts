import { randomBytes } from "node:crypto";
import { createAdminClient } from "@server/lib/supabase-admin";
import { ApiError } from "@server/lib/errors";
import {
  INVITE_TTL_MS,
  inviteAcceptPath,
  isUserRole,
  memberRemovalError,
  normalizeMemberEmail,
  roleAfterInviteAccept,
  roleChangeError,
  type UserRole,
} from "@shared/organization/membership";

type OrganizationRow = {
  id: string;
  name: string;
  created_at: string;
};

type InviteRow = {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type MemberRow = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
};

export type OrganizationInvite = InviteRow & { accept_url: string };

function appBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

function acceptUrl(token: string): string {
  return `${appBaseUrl()}${inviteAcceptPath(token)}`;
}

function asRole(value: string): UserRole {
  if (!isUserRole(value)) {
    throw ApiError.internal("Unknown member role");
  }
  return value;
}

function presentInvite(row: InviteRow): OrganizationInvite {
  return { ...row, accept_url: acceptUrl(row.token) };
}

async function getOrganizationRow(): Promise<OrganizationRow> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("organizations")
    .select("id, name, created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw ApiError.internal(error.message);
  if (!data) {
    throw ApiError.internal("Organization is not bootstrapped");
  }
  return data as OrganizationRow;
}

export async function getOrganization() {
  return getOrganizationRow();
}

export async function updateOrganizationName(name: string) {
  const organization = await getOrganizationRow();
  const db = createAdminClient();
  const { data, error } = await db
    .from("organizations")
    .update({ name })
    .eq("id", organization.id)
    .select("id, name, created_at")
    .single();
  if (error || !data) throw ApiError.internal(error?.message ?? "Update failed");
  return data as OrganizationRow;
}

export async function listMembers() {
  const db = createAdminClient();
  const { data, error } = await db
    .from("users")
    .select("id, username, email, role, created_at")
    .eq("active", true)
    .order("username");
  if (error) throw ApiError.internal(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    role: asRole(row.role as string),
  }));
}

async function countActiveAdmins(db: ReturnType<typeof createAdminClient>) {
  const { count, error } = await db
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("active", true)
    .eq("role", "admin");
  if (error) throw ApiError.internal(error.message);
  return count ?? 0;
}

export async function removeMember(actorId: string, targetId: string) {
  const db = createAdminClient();
  const { data: target, error } = await db
    .from("users")
    .select("id, username, email, role, active, created_at")
    .eq("id", targetId)
    .maybeSingle();
  if (error) throw ApiError.internal(error.message);
  if (!target || !target.active) throw ApiError.notFound("Member not found");

  const member = target as MemberRow;
  const reason = memberRemovalError({
    actorId,
    targetId,
    targetRole: asRole(member.role),
    activeAdminCount: await countActiveAdmins(db),
  });
  if (reason) throw ApiError.badRequest(reason);

  const { error: updateError } = await db
    .from("users")
    .update({ active: false })
    .eq("id", targetId);
  if (updateError) throw ApiError.internal(updateError.message);

  const { error: keyError } = await db
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("created_by", targetId)
    .is("revoked_at", null);
  if (keyError) throw ApiError.internal(keyError.message);

  const { error: banError } = await db.auth.admin.updateUserById(targetId, {
    ban_duration: "876000h",
  });
  if (banError) throw ApiError.internal(banError.message);

  return { id: targetId, removed: true };
}

export async function updateMemberRole(targetId: string, role: UserRole) {
  const db = createAdminClient();
  const { data: target, error } = await db
    .from("users")
    .select("id, username, email, role, active, created_at")
    .eq("id", targetId)
    .maybeSingle();
  if (error) throw ApiError.internal(error.message);
  if (!target || !target.active) throw ApiError.notFound("Member not found");

  const member = { ...(target as MemberRow), role: asRole((target as MemberRow).role) };
  const reason = roleChangeError({
    currentRole: member.role,
    nextRole: role,
    activeAdminCount: await countActiveAdmins(db),
  });
  if (reason) throw ApiError.badRequest(reason);

  const { data, error: updateError } = await db
    .from("users")
    .update({ role })
    .eq("id", targetId)
    .select("id, username, email, role, created_at")
    .single();
  if (updateError || !data) {
    throw ApiError.internal(updateError?.message ?? "Role update failed");
  }
  return { ...data, role: asRole(data.role as string) };
}

async function loadInviteByToken(token: string): Promise<InviteRow | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("organization_invites")
    .select(
      "id, organization_id, email, role, token, invited_by, expires_at, accepted_at, revoked_at, created_at",
    )
    .eq("token", token)
    .maybeSingle();
  if (error) throw ApiError.internal(error.message);
  if (!data) return null;
  return { ...(data as InviteRow), role: asRole((data as InviteRow).role) };
}

function assertInvitePending(invite: InviteRow) {
  if (invite.revoked_at) throw ApiError.badRequest("This invite was revoked");
  if (invite.accepted_at) throw ApiError.badRequest("This invite was already accepted");
  if (Date.parse(invite.expires_at) <= Date.now()) {
    throw ApiError.badRequest("This invite has expired");
  }
}

export async function previewInvite(token: string) {
  const invite = await loadInviteByToken(token);
  if (!invite) throw ApiError.notFound("Invite not found");
  const organization = await getOrganizationRow();
  let state: "pending" | "accepted" | "revoked" | "expired" = "pending";
  if (invite.revoked_at) state = "revoked";
  else if (invite.accepted_at) state = "accepted";
  else if (Date.parse(invite.expires_at) <= Date.now()) state = "expired";
  return {
    email: invite.email,
    role: invite.role,
    state,
    expires_at: invite.expires_at,
    organization_name: organization.name,
  };
}

export async function listInvites() {
  const organization = await getOrganizationRow();
  const db = createAdminClient();
  const { data, error } = await db
    .from("organization_invites")
    .select(
      "id, organization_id, email, role, token, invited_by, expires_at, accepted_at, revoked_at, created_at",
    )
    .eq("organization_id", organization.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) throw ApiError.internal(error.message);
  return (data ?? [])
    .map((row) => ({ ...(row as InviteRow), role: asRole((row as InviteRow).role) }))
    .filter((row) => Date.parse(row.expires_at) > Date.now())
    .map(presentInvite);
}

async function findUserByEmail(email: string): Promise<MemberRow | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("users")
    .select("id, username, email, role, active, created_at")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw ApiError.internal(error.message);
  if (!data) return null;
  return { ...(data as MemberRow), role: asRole((data as MemberRow).role) };
}

export async function createInvite(input: {
  email: string;
  role: UserRole;
  invitedBy: string;
}) {
  const email = normalizeMemberEmail(input.email);
  const existingUser = await findUserByEmail(email);
  if (existingUser?.active) {
    throw ApiError.conflict("That email already belongs to a member");
  }

  const organization = await getOrganizationRow();
  const db = createAdminClient();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  const { data: pending, error: pendingError } = await db
    .from("organization_invites")
    .select(
      "id, organization_id, email, role, token, invited_by, expires_at, accepted_at, revoked_at, created_at",
    )
    .eq("organization_id", organization.id)
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle();
  if (pendingError) throw ApiError.internal(pendingError.message);

  if (pending) {
    const current = pending as InviteRow;
    const stillValid = Date.parse(current.expires_at) > Date.now();
    const token = stillValid ? current.token : randomBytes(32).toString("base64url");
    const { data, error } = await db
      .from("organization_invites")
      .update({
        role: input.role,
        expires_at: expiresAt,
        invited_by: input.invitedBy,
        token,
      })
      .eq("id", current.id)
      .select(
        "id, organization_id, email, role, token, invited_by, expires_at, accepted_at, revoked_at, created_at",
      )
      .single();
    if (error || !data) throw ApiError.internal(error?.message ?? "Invite update failed");
    return presentInvite({ ...(data as InviteRow), role: asRole((data as InviteRow).role) });
  }

  const token = randomBytes(32).toString("base64url");
  const { data, error } = await db
    .from("organization_invites")
    .insert({
      organization_id: organization.id,
      email,
      role: input.role,
      token,
      invited_by: input.invitedBy,
      expires_at: expiresAt,
    })
    .select(
      "id, organization_id, email, role, token, invited_by, expires_at, accepted_at, revoked_at, created_at",
    )
    .single();
  if (error || !data) throw ApiError.internal(error?.message ?? "Invite create failed");
  return presentInvite({ ...(data as InviteRow), role: asRole((data as InviteRow).role) });
}

export async function revokeInvite(inviteId: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("organization_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Invite not found");
  return { id: inviteId, revoked: true };
}

async function markInviteAccepted(invite: InviteRow, user: MemberRow) {
  const db = createAdminClient();
  const nextRole = roleAfterInviteAccept(user.role, invite.role);
  const { error: userError } = await db
    .from("users")
    .update({ active: true, role: nextRole })
    .eq("id", user.id);
  if (userError) throw ApiError.internal(userError.message);

  const { error: banError } = await db.auth.admin.updateUserById(user.id, {
    ban_duration: "none",
  });
  if (banError) throw ApiError.internal(banError.message);

  const { error: inviteError } = await db
    .from("organization_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);
  if (inviteError) throw ApiError.internal(inviteError.message);

  return { user_id: user.id, role: nextRole };
}

export async function acceptInvite(input: { token: string; userId: string }) {
  const invite = await loadInviteByToken(input.token);
  if (!invite) throw ApiError.notFound("Invite not found");
  assertInvitePending(invite);

  const db = createAdminClient();
  const { data, error } = await db
    .from("users")
    .select("id, username, email, role, active, created_at")
    .eq("id", input.userId)
    .single();
  if (error || !data) throw ApiError.notFound("User not found");
  const user = { ...(data as MemberRow), role: asRole((data as MemberRow).role) };
  if (normalizeMemberEmail(user.email) !== invite.email) {
    throw ApiError.forbidden("Sign in with the invited email address");
  }
  return markInviteAccepted(invite, user);
}

export async function createAccountFromInvite(input: {
  token: string;
  password: string;
  username?: string;
}) {
  const invite = await loadInviteByToken(input.token);
  if (!invite) throw ApiError.notFound("Invite not found");
  assertInvitePending(invite);

  const existing = await findUserByEmail(invite.email);
  if (existing?.active) {
    throw ApiError.conflict("Sign in to accept this invite");
  }

  const db = createAdminClient();
  if (existing) {
    const { error } = await db.auth.admin.updateUserById(existing.id, {
      password: input.password,
      ban_duration: "none",
    });
    if (error) throw ApiError.internal(error.message);
    await markInviteAccepted(invite, existing);
    return { email: invite.email };
  }

  const username = input.username?.trim() || invite.email.split("@")[0] || "Member";
  const { data, error } = await db.auth.admin.createUser({
    email: invite.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error || !data.user) {
    throw ApiError.badRequest(error?.message ?? "Could not create account");
  }

  const created = await findUserByEmail(invite.email);
  if (!created) throw ApiError.internal("Invited account was not created");
  await markInviteAccepted(invite, created);
  return { email: invite.email };
}
