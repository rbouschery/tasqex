import { NextRequest } from "next/server";
import { jsonData } from "@server/lib/response";
import { parseJsonBody, withAuth } from "@server/lib/route-handler";
import {
  createOrganizationInviteSchema,
  parseBody,
} from "@server/lib/validation/schemas";
import { createInvite, listInvites } from "@server/services/organization";

export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async () => jsonData(await listInvites()),
    { admin: true },
  );
}

export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async (auth) => {
      const body = parseBody(
        createOrganizationInviteSchema,
        await parseJsonBody(request),
      );
      return jsonData(
        await createInvite({
          email: body.email,
          role: body.role,
          invitedBy: auth.userId,
        }),
        201,
      );
    },
    { admin: true },
  );
}
