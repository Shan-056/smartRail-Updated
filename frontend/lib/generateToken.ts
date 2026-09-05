import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "smartrail-default-jwt-secret-key-2025";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

export function generateAuthCookie(userId: string) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

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
