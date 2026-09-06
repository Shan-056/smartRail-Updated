// ============================================================
// scripts/seed.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// A one-time helper script you run manually (npm run seed) to
// fill an empty database with a small set of realistic test
// data — a few stations, a route, a train, and two login
// accounts (an admin and a device account) — so the rest of the
// team can start testing immediately without hand-creating data.
// ============================================================

import { connectToDatabase } from "../lib/mongodb";
import { User } from "../models/User";
import { Station } from "../models/Station";
import { Route } from "../models/Route";
import { Train } from "../models/Train";

async function seed() {
  const db = await connectToDatabase();
  if (!db) {
    console.error("❌ Seeding failed: MONGO_URI is not configured or database is unreachable.");
    process.exit(1);
  }

  console.log("🌱 Clearing old test data...");
  await Promise.all([User.deleteMany({}), Station.deleteMany({}), Route.deleteMany({}), Train.deleteMany({})]);

  console.log("🌱 Creating login accounts...");
  // Passwords are plain text here ONLY because the User model's
  // pre-save hook automatically hashes them before saving.
  await User.create([
    { username: "admin", password: "admin123", role: "admin" },
    { username: "device01", password: "device123", role: "device" },
  ]);

  console.log("🌱 Creating stations (Western Line sample)...");
  const stations = await Station.create([
    { code: "CCG", name: "Churchgate", line: "Western", location: { lat: 18.9322, lng: 72.8264 }, capacity: 8000 },
    { code: "BA", name: "Bandra", line: "Western", location: { lat: 19.0596, lng: 72.8295 }, capacity: 6000 },
    { code: "AS", name: "Andheri", line: "Western", location: { lat: 19.1197, lng: 72.8468 }, capacity: 9000 },
    { code: "BVI", name: "Borivali", line: "Western", location: { lat: 19.2307, lng: 72.8567 }, capacity: 7000 },
  ]);

  console.log("🌱 Creating a sample route...");
  const route = await Route.create({
    name: "Churchgate - Borivali Fast",
    line: "Western",
    category: "Fast",
    stops: stations.map((s, i) => ({ station: s._id, sequence: i + 1, avgTravelTimeMin: 8 })),
  });

  console.log("🌱 Creating a sample train...");
  await Train.create({
    trainNumber: "WR-1001",
    line: "Western",
    route: route._id,
    direction: "Up",
    currentStation: stations[0]._id,
    nextStation: stations[1]._id,
    status: "running",
    occupancyPercent: 40,
  });

  console.log("✅ Seed complete. Test accounts:");
  console.log("   admin / admin123   (role: admin)");
  console.log("   device01 / device123  (role: device)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
