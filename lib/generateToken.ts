import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "smartrail-default-jwt-secret-key-2025";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

export function generateAuthCookie(userOrId: string | { _id?: string; id?: string; role?: string; username?: string; email?: string }) {
  const userId = typeof userOrId === "string" ? userOrId : (userOrId._id?.toString() || userOrId.id || "usr_demo");
  const role = typeof userOrId === "string" ? undefined : userOrId.role;
  const username = typeof userOrId === "string" ? undefined : userOrId.username;
  const email = typeof userOrId === "string" ? undefined : userOrId.email;

  const token = jwt.sign({ userId, role, username, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

  return {
    name: "token",
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 24 * 60 * 60,
      path: "/",
    },
  };
}
