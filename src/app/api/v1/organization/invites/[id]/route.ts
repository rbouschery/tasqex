import { NextRequest } from "next/server";
import { jsonData } from "@server/lib/response";
import { withAuth } from "@server/lib/route-handler";
import { revokeInvite } from "@server/services/organization";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withAuth(
    request,
    async () => jsonData(await revokeInvite(id)),
    { admin: true },
  );
}
