import { NextRequest } from "next/server";
import { jsonData } from "@server/lib/response";
import { parseJsonBody, withPublic } from "@server/lib/route-handler";
import {
  parseBody,
  redeemOrganizationInviteSchema,
} from "@server/lib/validation/schemas";
import { createAccountFromInvite } from "@server/services/organization";

export async function POST(request: NextRequest) {
  return withPublic(async () => {
    const body = parseBody(
      redeemOrganizationInviteSchema,
      await parseJsonBody(request),
    );
    return jsonData(await createAccountFromInvite(body), 201);
  });
}
