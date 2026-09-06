import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, AuthError } from "@/middleware/auth";
import { listCameras, addCamera } from "@/services/cameraService";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    // Only operator and admin can access camera connections
    requireRole(user, ["admin", "operator"]);

    const data = await listCameras();
    return NextResponse.json({
      success: true,
      role: user.role,
      ...data,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    // ONLY admin can add camera connections
    requireRole(user, ["admin"]);

    const body = await req.json();
    if (!body.stationId || !body.label) {
      return NextResponse.json(
        { success: false, message: "stationId and label are required." },
        { status: 400 }
      );
    }

    const camera = await addCamera({
      stationId: body.stationId,
      stationName: body.stationName,
      label: body.label,
      addedBy: user.username,
    });

    return NextResponse.json({ success: true, camera }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
