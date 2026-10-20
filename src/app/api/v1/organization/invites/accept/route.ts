import { NextRequest } from "next/server";
import { jsonData } from "@server/lib/response";
import { parseJsonBody, withAuth } from "@server/lib/route-handler";
import {
  acceptOrganizationInviteSchema,
  parseBody,
} from "@server/lib/validation/schemas";
import { acceptInvite } from "@server/services/organization";

export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    const body = parseBody(
      acceptOrganizationInviteSchema,
      await parseJsonBody(request),
    );
    return jsonData(await acceptInvite({ token: body.token, userId: auth.userId }));
  });
}
