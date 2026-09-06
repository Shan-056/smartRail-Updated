import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, AuthError } from "@/middleware/auth";
import { listAlerts, createAlert } from "@/services/alertService";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const stationId = url.searchParams.get("stationId") || undefined;
    const activeOnly = url.searchParams.get("activeOnly") === "true";

    const alerts = await listAlerts({ stationId, activeOnly });
    return NextResponse.json({ success: true, alerts });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch alerts." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    // Only operator and admin can create alerts
    requireRole(user, ["admin", "operator"]);

    const body = await req.json();
    if (!body.stationId || !body.message) {
      return NextResponse.json(
        { success: false, message: "stationId and message are required." },
        { status: 400 }
      );
    }

    const alert = await createAlert({
      stationId: body.stationId,
      message: body.message,
      severity: body.severity || "warning",
      createdBy: user.username,
    });

    return NextResponse.json({ success: true, alert }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
