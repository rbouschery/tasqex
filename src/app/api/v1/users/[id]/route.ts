import { NextRequest } from "next/server";
import { jsonData } from "@server/lib/response";
import { parseJsonBody, withAuth } from "@server/lib/route-handler";
import { parseBody, updateUserRoleSchema } from "@server/lib/validation/schemas";
import { removeMember, updateMemberRole } from "@server/services/organization";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withAuth(
    request,
    async () => {
      const body = parseBody(updateUserRoleSchema, await parseJsonBody(request));
      return jsonData(await updateMemberRole(id, body.role));
    },
    { admin: true },
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withAuth(
    request,
    async (auth) => jsonData(await removeMember(auth.userId, id)),
    { admin: true },
  );
}
