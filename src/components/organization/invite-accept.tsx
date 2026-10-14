"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";

type InvitePreview = {
  email: string;
  role: "admin" | "member";
  state: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  organization_name: string;
};

export function InviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void apiFetch<InvitePreview>(
      `/api/v1/organization/invites/preview?token=${encodeURIComponent(token)}`,
    )
      .then(setPreview)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Invite not found");
      });
  }, [token]);

  async function redeem() {
    setPending(true);
    setError(null);
    try {
      const result = await apiFetch<{ email: string }>(
        "/api/v1/organization/invites/redeem",
        {
          method: "POST",
          body: JSON.stringify({
            token,
            password,
            username: username.trim() || undefined,
          }),
        },
      );
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      });
      if (signInError) {
        router.push("/login");
        return;
      }
      router.push("/board");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invite");
      setPending(false);
    }
  }

  const blocked =
    preview && preview.state !== "pending"
      ? preview.state === "accepted"
        ? "This invite was already accepted. Sign in to continue."
        : preview.state === "revoked"
          ? "This invite was revoked."
          : "This invite has expired."
      : null;

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {preview ? `Join ${preview.organization_name}` : "Invite"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {blocked && (
            <Alert>
              <AlertDescription>{blocked}</AlertDescription>
            </Alert>
          )}
          {preview?.state === "pending" && (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void redeem();
              }}
            >
              <p className="text-muted-foreground">
                {preview.email} · {preview.role}
              </p>
              <div className="space-y-2">
                <Label htmlFor="invite-username">Name</Label>
                <Input
                  id="invite-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-password">Password</Label>
                <Input
                  id="invite-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Joining…" : "Join workspace"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
