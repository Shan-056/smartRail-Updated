import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, AuthError } from "@/middleware/auth";
import {
  getActiveOverrides,
  setCrowdOverride,
  clearCrowdOverride,
} from "@/services/crowdOverrideService";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    // Only operator and admin can view crowd override control panel
    requireRole(user, ["admin", "operator"]);

    const overrides = await getActiveOverrides();
    return NextResponse.json({
      success: true,
      overrides,
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
    // Both operator and admin can set manual crowd overrides
    requireRole(user, ["admin", "operator"]);

    const body = await req.json();
    if (!body.stationId || !body.level) {
      return NextResponse.json(
        { success: false, message: "stationId and level are required." },
        { status: 400 }
      );
    }

    const override = await setCrowdOverride({
      stationId: body.stationId,
      level: body.level,
      densityPercent: body.densityPercent,
      reason: body.reason,
      setBy: user.username,
    });

    return NextResponse.json({ success: true, override }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["admin", "operator"]);

    const url = new URL(req.url);
    const stationId = url.searchParams.get("stationId");

    if (!stationId) {
      return NextResponse.json(
        { success: false, message: "stationId parameter is required." },
        { status: 400 }
      );
    }

    await clearCrowdOverride(stationId);
    return NextResponse.json({ success: true, message: "Override cleared successfully." });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
