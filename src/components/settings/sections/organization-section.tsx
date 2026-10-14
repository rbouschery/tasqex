"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiFetch } from "@/lib/api-client";

type Organization = {
  id: string;
  name: string;
  created_at: string;
};

type Member = {
  id: string;
  username: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
};

type Invite = {
  id: string;
  email: string;
  role: "admin" | "member";
  accept_url: string;
  expires_at: string;
};

const organizationQueryKey = ["organization"] as const;
const membersQueryKey = ["organization", "members"] as const;
const invitesQueryKey = ["organization", "invites"] as const;

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
  toast.success("Invite link copied");
}

export function OrganizationSettingsSection() {
  const { user: me } = useCurrentUser();
  const queryClient = useQueryClient();
  const organizationQuery = useQuery({
    queryKey: organizationQueryKey,
    queryFn: () => apiFetch<Organization>("/api/v1/organization"),
  });
  const membersQuery = useQuery({
    queryKey: membersQueryKey,
    queryFn: () => apiFetch<Member[]>("/api/v1/users"),
  });
  const invitesQuery = useQuery({
    queryKey: invitesQueryKey,
    queryFn: () => apiFetch<Invite[]>("/api/v1/organization/invites"),
  });

  const organization = organizationQuery.data ?? null;
  const members = membersQuery.data ?? [];
  const invites = invitesQuery.data ?? [];
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const name = nameDraft ?? organization?.name ?? "";
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [savingName, setSavingName] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadError =
    organizationQuery.error ?? membersQuery.error ?? invitesQuery.error;
  const error =
    actionError ?? (loadError instanceof Error ? loadError.message : null);

  function refresh() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: organizationQueryKey }),
      queryClient.invalidateQueries({ queryKey: membersQueryKey }),
      queryClient.invalidateQueries({ queryKey: invitesQueryKey }),
    ]);
  }

  async function saveName() {
    setSavingName(true);
    setActionError(null);
    try {
      const updated = await apiFetch<Organization>("/api/v1/organization", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setNameDraft(null);
      queryClient.setQueryData(organizationQueryKey, updated);
      toast.success("Organization name saved");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save name");
    } finally {
      setSavingName(false);
    }
  }

  async function invite() {
    setInviting(true);
    setActionError(null);
    try {
      const created = await apiFetch<Invite>("/api/v1/organization/invites", {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      setEmail("");
      await refresh();
      await copyText(created.accept_url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not create invite");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(member: Member, nextRole: "admin" | "member") {
    if (member.role === nextRole) return;
    setActionError(null);
    try {
      await apiFetch(`/api/v1/users/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not change role");
    }
  }

  async function remove(member: Member) {
    if (!window.confirm(`Remove ${member.email} from the workspace?`)) return;
    setActionError(null);
    try {
      await apiFetch(`/api/v1/users/${member.id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not remove member");
    }
  }

  async function revoke(invite: Invite) {
    setActionError(null);
    try {
      await apiFetch(`/api/v1/organization/invites/${invite.id}`, {
        method: "DELETE",
      });
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not revoke invite");
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="organization-name">Name</Label>
            <Input
              id="organization-name"
              value={name}
              onChange={(event) => setNameDraft(event.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={() => void saveName()}
            disabled={savingName || !name.trim() || name.trim() === organization?.name}
          >
            {savingName ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{member.username}</p>
                <p className="truncate text-muted-foreground">{member.email}</p>
              </div>
              <Select
                value={member.role}
                onValueChange={(value) =>
                  void changeRole(member, value as "admin" | "member")
                }
              >
                <SelectTrigger className="w-full sm:w-36" aria-label={`${member.email} role`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="destructive"
                disabled={member.id === me?.id}
                onClick={() => void remove(member)}
              >
                Remove
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite</CardTitle>
          <CardDescription>
            Copy the link and send it yourself. Invites expire after 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as "admin" | "member")}
              >
                <SelectTrigger className="w-full sm:w-36" aria-label="Invite role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={() => void invite()}
              disabled={inviting || !email.trim()}
            >
              {inviting ? "Creating…" : "Create link"}
            </Button>
          </div>

          {invites.length > 0 && (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{invite.email}</p>
                    <p className="truncate text-muted-foreground">{invite.accept_url}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void copyText(invite.accept_url)}
                  >
                    Copy
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void revoke(invite)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
