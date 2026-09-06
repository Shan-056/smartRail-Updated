import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, AuthError } from "@/middleware/auth";
import { deleteCamera } from "@/services/cameraService";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    // ONLY admin can delete camera connections
    requireRole(user, ["admin"]);

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, message: "Camera id required." }, { status: 400 });
    }

    await deleteCamera(id);
    return NextResponse.json({ success: true, message: "Camera deleted successfully." });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
