import { NextRequest } from "next/server";
import { jsonData } from "@server/lib/response";
import { parseJsonBody, withAuth } from "@server/lib/route-handler";
import { parseBody, updateOrganizationSchema } from "@server/lib/validation/schemas";
import {
  getOrganization,
  updateOrganizationName,
} from "@server/services/organization";

export async function GET(request: NextRequest) {
  return withAuth(request, async () => jsonData(await getOrganization()));
}

export async function PATCH(request: NextRequest) {
  return withAuth(
    request,
    async () => {
      const body = parseBody(updateOrganizationSchema, await parseJsonBody(request));
      return jsonData(await updateOrganizationName(body.name));
    },
    { admin: true },
  );
}
