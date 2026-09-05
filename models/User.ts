import { Schema, model, models, type Document, type Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  username: string;
  password?: string;
  role: "admin" | "operator" | "device" | "passenger";
  email?: string;
  name?: string;
  googleId?: string;
  authProvider?: "local" | "google";
  resetPasswordTokenHash?: string;
  resetPasswordExpires?: Date;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String },
    role: { type: String, enum: ["admin", "operator", "device", "passenger"], default: "passenger" },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    name: { type: String, trim: true },
    googleId: { type: String, sparse: true, unique: true },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

export const User: Model<IUser> = models.User || model<IUser>("User", userSchema);
