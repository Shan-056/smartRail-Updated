import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const role =
      email?.includes("admin") || email?.includes("control")
        ? "admin"
        : "passenger";

    const user = {
      _id: "demo-commuter-1",
      name: role === "admin" ? "Operations Controller" : "Suburban Commuter",
      email: email || "passenger@smartrail.local",
      role,
    };

    const res = NextResponse.json({
      user,
      message: "Logged in successfully (Zero-Dependency Standalone Mode)",
    });

    res.cookies.set("auth_token", "standalone_demo_token", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });

    return res;
  } catch {
    return NextResponse.json({ message: "Login failed." }, { status: 400 });
  }
}
