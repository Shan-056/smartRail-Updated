import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, AuthError } from "@/middleware/auth";
import { deleteAlert } from "@/services/alertService";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    // ONLY admin can permanently delete alerts (Operator gets 403 Forbidden)
    requireRole(user, ["admin"]);

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, message: "Alert id required." }, { status: 400 });
    }

    await deleteAlert(id);
    return NextResponse.json({ success: true, message: "Alert permanently deleted." });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
