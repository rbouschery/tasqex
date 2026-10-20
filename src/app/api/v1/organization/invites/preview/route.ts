import { NextRequest } from "next/server";
import { ApiError } from "@server/lib/errors";
import { jsonData } from "@server/lib/response";
import { withPublic } from "@server/lib/route-handler";
import { previewInvite } from "@server/services/organization";

export async function GET(request: NextRequest) {
  return withPublic(async () => {
    const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
    if (!token) throw ApiError.badRequest("Invite token is required");
    return jsonData(await previewInvite(token));
  });
}
