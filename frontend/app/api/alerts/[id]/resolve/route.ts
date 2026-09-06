import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, AuthError } from "@/middleware/auth";
import { resolveAlert } from "@/services/alertService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    // Both operator and admin can acknowledge and resolve alerts
    requireRole(user, ["admin", "operator"]);

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, message: "Alert id required." }, { status: 400 });
    }

    const updated = await resolveAlert(id, user.username);
    if (!updated) {
      return NextResponse.json({ success: false, message: "Alert not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, alert: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
