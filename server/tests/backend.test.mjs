process.env.MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tatito_health_test";
process.env.JWT_SECRET = "test-secret-tatito";
process.env.BACKEND_TEST = "1";

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../models/User.js";
import { seedAll } from "../seed/seedData.js";

let server;
let base;

async function connect() {
  const { connectDb, disconnectDb } = await import("../config/db.js");
  return { connectDb, disconnectDb };
}

async function api(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

before(async () => {
  const { connectDb } = await connect();
  await connectDb(process.env.MONGO_URI);
  await mongoose.connection.dropDatabase();
  await seedAll();

  const { createApp } = await import("../app.js");
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  const port = server.address().port;
  base = `http://127.0.0.1:${port}/api`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  const { disconnectDb } = await connect();
  await disconnectDb();
});

// ---------- AUTH ----------
test("user payload exposes status and wallet metadata without leaking passwordHash", () => {
  const user = new User({
    name: "Wallet User",
    email: "wallet@test.io",
    mobile: "9000000000",
    role: "patient",
    status: "active",
    walletBalance: 175,
    walletTransactions: [
      { type: "credit", amount: 175, reason: "Demo top-up" },
    ],
    familyMembers: [{ name: "Father", relation: "Father" }],
    addresses: [{ label: "Home", city: "Bengaluru" }],
  });
  user.passwordHash = "hashed-value";

  const payload = user.safe();
  assert.equal(payload.status, "active");
  assert.equal(payload.walletBalance, 175);
  assert.equal(payload.walletTransactions.length, 1);
  assert.equal(payload.passwordHash, undefined);
});

test("GET /api/health is alive", async () => {
  const { status, data } = await api("/health");
  assert.equal(status, 200);
  assert.equal(data.ok, true);
});

test("register a patient returns a token + patient role", async () => {
  const { status, data } = await api("/auth/register", {
    method: "POST",
    body: {
      name: "Aarav Patient",
      email: "aarav@test.io",
      password: "Password1",
      role: "patient",
      mobile: "9999999999",
    },
  });
  assert.equal(status, 201);
  assert.ok(data.token);
  assert.equal(data.user.role, "patient");
  assert.equal(data.user.name, "Aarav Patient");
});

test("duplicate email registration returns 409", async () => {
  const { status } = await api("/auth/register", {
    method: "POST",
    body: {
      name: "Aarav Patient",
      email: "aarav@test.io",
      password: "Password1",
      role: "patient",
    },
  });
  assert.equal(status, 409);
});

test("register a doctor linked to an existing unclaimed profile (d2)", async () => {
  const { status, data } = await api("/auth/register", {
    method: "POST",
    body: {
      name: "Dr. Elias Morgan",
      email: "elias@test.io",
      password: "Password1",
      role: "doctor",
      doctorId: "d2",
    },
  });
  assert.equal(status, 201);
  assert.equal(data.user.role, "doctor");
  assert.equal(data.user.doctorId, "d2");
});

test("invalid role rejected with 400", async () => {
  const { status } = await api("/auth/register", {
    method: "POST",
    body: {
      name: "X",
      email: "x@test.io",
      password: "Password1",
      role: "admin",
    },
  });
  assert.equal(status, 400);
});

test("register a new doctor profile when no doctorId given", async () => {
  const { status, data } = await api("/auth/register", {
    method: "POST",
    body: {
      name: "Dr. Neo Doc",
      email: "neo@test.io",
      password: "Password1",
      role: "doctor",
      specialty: "Neurology",
      city: "Pune",
    },
  });
  assert.equal(status, 201);
  assert.equal(data.user.role, "doctor");
  assert.ok(data.user.doctorId.startsWith("doc-"));
  const { data: doc } = await api(`/doctors/${data.user.doctorId}`, {
    token: data.token,
  });
  assert.equal(doc.specialty, "Neurology");
  assert.equal(doc.name, "Dr. Neo Doc");
});

test("login patient + doctor succeed", async () => {
  const p = await api("/auth/login", {
    method: "POST",
    body: { email: "aarav@test.io", password: "Password1" },
  });
  assert.equal(p.status, 200);
  assert.ok(p.data.token);
  const d = await api("/auth/login", {
    method: "POST",
    body: { email: "elias@test.io", password: "Password1" },
  });
  assert.equal(d.status, 200);
  assert.ok(d.data.token);
});

test("login payload always carries the REAL role (UI toggle cannot change role)", async () => {
  const p = await api("/auth/login", {
    method: "POST",
    body: { email: "aarav@test.io", password: "Password1" },
  });
  assert.equal(p.data.user.role, "patient");
  const d = await api("/auth/login", {
    method: "POST",
    body: { email: "elias@test.io", password: "Password1" },
  });
  assert.equal(d.data.user.role, "doctor");
  assert.equal(d.data.user.doctorId, "d2");
});

test("invalid login credentials return 401", async () => {
  const bad = await api("/auth/login", {
    method: "POST",
    body: { email: "aarav@test.io", password: "wrongpass" },
  });
  assert.equal(bad.status, 401);
  const missing = await api("/auth/login", {
    method: "POST",
    body: { email: "nobody@test.io", password: "Password1" },
  });
  assert.equal(missing.status, 401);
});

test("protected /auth/me without token returns 401", async () => {
  const { status } = await api("/auth/me");
  assert.equal(status, 401);
});

test("/auth/me with token returns safe user (email, role, no hash)", async () => {
  const p = await api("/auth/login", {
    method: "POST",
    body: { email: "aarav@test.io", password: "Password1" },
  });
  const { status, data } = await api("/auth/me", { token: p.data.token });
  assert.equal(status, 200);
  assert.equal(data.user.email, "aarav@test.io");
  assert.equal(data.user.role, "patient");
  assert.equal(data.user.passwordHash, undefined);
});

test("garbage token returns 401", async () => {
  const { status } = await api("/auth/me", { token: "not-a-token" });
  assert.equal(status, 401);
});

// ---------- DOCTOR OWNERSHIP / CRUD ----------
test("doctor can read own profile with fee", async () => {
  const d = await api("/auth/login", {
    method: "POST",
    body: { email: "elias@test.io", password: "Password1" },
  });
  const { status, data } = await api("/doctors/d2", { token: d.data.token });
  assert.equal(status, 200);
  assert.equal(data.id, "d2");
  assert.equal(data.fee, 550);
  assert.equal(data.specialty, "Cardiology");
});

test("doctor can update own profile (fee + offer + name fields)", async () => {
  const d = await api("/auth/login", {
    method: "POST",
    body: { email: "elias@test.io", password: "Password1" },
  });
  const { status, data } = await api("/doctors/d2", {
    method: "PUT",
    token: d.data.token,
    body: {
      fee: 699,
      offerText: "Get 5% off on first consult",
      next: "Today, 8:00 PM",
      location: "St. Clement Heart Institute, Mumbai",
    },
  });
  assert.equal(status, 200);
  assert.equal(data.fee, 699);
  assert.equal(data.offerText, "Get 5% off on first consult");
  assert.equal(data.next, "Today, 8:00 PM");
});

test("PATCH supports partial updates", async () => {
  const d = await api("/auth/login", {
    method: "POST",
    body: { email: "elias@test.io", password: "Password1" },
  });
  const { status, data } = await api("/doctors/d2", {
    method: "PATCH",
    token: d.data.token,
    body: { fee: 750 },
  });
  assert.equal(status, 200);
  assert.equal(data.fee, 750);
});

test("doctor CANNOT update another doctor profile (d1 vs doctor owning d2)", async () => {
  const d = await api("/auth/login", {
    method: "POST",
    body: { email: "elias@test.io", password: "Password1" },
  });
  const { status } = await api("/doctors/d1", {
    method: "PUT",
    token: d.data.token,
    body: { fee: 1 },
  });
  assert.equal(status, 403);
});

test("patient cannot update any doctor profile", async () => {
  const p = await api("/auth/login", {
    method: "POST",
    body: { email: "aarav@test.io", password: "Password1" },
  });
  const { status } = await api("/doctors/d1", {
    method: "PATCH",
    token: p.data.token,
    body: { fee: 1 },
  });
  assert.equal(status, 403);
});

test("unauthenticated profile update returns 401", async () => {
  const { status } = await api("/doctors/d1", {
    method: "PUT",
    body: { fee: 1 },
  });
  assert.equal(status, 401);
});

test("invalid fee rejected with 400", async () => {
  const d = await api("/auth/login", {
    method: "POST",
    body: { email: "elias@test.io", password: "Password1" },
  });
  const { status } = await api("/doctors/d2", {
    method: "PATCH",
    token: d.data.token,
    body: { fee: -5 },
  });
  assert.equal(status, 400);
});

test("doctor-owned DELETE works only for the owner", async () => {
  const d = await api("/auth/login", {
    method: "POST",
    body: { email: "elias@test.io", password: "Password1" },
  });
  const delD1 = await api("/doctors/d1", {
    method: "DELETE",
    token: d.data.token,
  });
  assert.equal(delD1.status, 403);
  const delOwn = await api("/doctors/d2", {
    method: "DELETE",
    token: d.data.token,
  });
  assert.equal(delOwn.status, 204);
  const gone = await api("/doctors/d2");
  assert.equal(gone.status, 404);
});

// ---------- PRICE EXPOSURE ----------
test("public doctor list does NOT expose fee", async () => {
  const { status, data } = await api("/doctors");
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 10);
  assert.ok(data.every((d) => !("fee" in d)));
});

test("public single doctor does NOT expose fee", async () => {
  const { status, data } = await api("/doctors/d1");
  assert.equal(status, 200);
  assert.equal("fee" in data, false);
});

test("authenticated (logged-in) request exposes fee", async () => {
  const p = await api("/auth/login", {
    method: "POST",
    body: { email: "aarav@test.io", password: "Password1" },
  });
  const { status, data } = await api("/doctors", { token: p.data.token });
  assert.equal(status, 200);
  assert.ok(data.every((d) => typeof d.fee === "number"));
  const d1 = data.find((d) => d.id === "d1");
  assert.equal(d1.fee, 400);
});

test("unknown doctor returns 404", async () => {
  const { status } = await api("/doctors/d99999");
  assert.equal(status, 404);
});

// ---------- REVIEWS ----------
test("reviews GET returns seeded sample reviews labelled demo", async () => {
  const { status, data } = await api("/doctors/d1/reviews");
  assert.equal(status, 200);
  assert.equal(data.doctorId, "d1");
  assert.equal(data.reviews.length, 4);
  assert.equal(data.isDemo, true);
  assert.equal(
    data.reviews.every((r) => r.isDemo === true),
    true,
  );
  assert.ok(data.reviews.every((r) => r.patientName));
  assert.ok(data.reviews.every((r) => typeof r.rating === "number"));
});

test("unauthenticated review submission returns 401", async () => {
  const { status } = await api("/doctors/d1/reviews", {
    method: "POST",
    body: { rating: 5, comment: "Great doctor!" },
  });
  assert.equal(status, 401);
});

test("doctor role cannot submit reviews (403)", async () => {
  const d = await api("/auth/login", {
    method: "POST",
    body: { email: "elias@test.io", password: "Password1" },
  });
  const { status } = await api("/doctors/d1/reviews", {
    method: "POST",
    token: d.data.token,
    body: { rating: 5, comment: "Nice." },
  });
  assert.equal(status, 403);
});

test("rating validation: 0 and 6 rejected (400)", async () => {
  const p = await api("/auth/login", {
    method: "POST",
    body: { email: "aarav@test.io", password: "Password1" },
  });
  const zero = await api("/doctors/d1/reviews", {
    method: "POST",
    token: p.data.token,
    body: { rating: 0, comment: "ok" },
  });
  assert.equal(zero.status, 400);
  const six = await api("/doctors/d1/reviews", {
    method: "POST",
    token: p.data.token,
    body: { rating: 6, comment: "ok" },
  });
  assert.equal(six.status, 400);
});

test("comment validation: too short/long rejected (400)", async () => {
  const p = await api("/auth/login", {
    method: "POST",
    body: { email: "aarav@test.io", password: "Password1" },
  });
  const short = await api("/doctors/d1/reviews", {
    method: "POST",
    token: p.data.token,
    body: { rating: 5, comment: "" },
  });
  assert.equal(short.status, 400);
  const long = await api("/doctors/d1/reviews", {
    method: "POST",
    token: p.data.token,
    body: { rating: 5, comment: "x".repeat(1400) },
  });
  assert.equal(long.status, 400);
});

test("logged-in patient can submit a review persisted to MongoDB", async () => {
  const p = await api("/auth/login", {
    method: "POST",
    body: { email: "aarav@test.io", password: "Password1" },
  });
  const { status, data } = await api("/doctors/d1/reviews", {
    method: "POST",
    token: p.data.token,
    body: { rating: 5, comment: "Aarav says: extremely helpful consultation." },
  });
  assert.equal(status, 201);
  assert.ok(data.review.id);
  assert.ok(data.review.createdAt);
  // patient identity comes from the token, never from the body
  assert.equal(data.review.patientName, "Aarav Patient");
  assert.equal(data.review.moderationStatus, "pending");
});

test("pending patient review stays out of public doctor review lists", async () => {
  const d1 = await api("/doctors/d1/reviews");
  const d3 = await api("/doctors/d3/reviews");
  const found = d1.data.reviews.some((r) =>
    r.comment.includes("extremely helpful"),
  );
  assert.equal(found, false);
  assert.equal(
    d3.data.reviews.some((r) => r.comment.includes("extremely helpful")),
    false,
  );
});

test("a patient review does not affect ratings until admin approval", async () => {
  const { data } = await api("/doctors/d1/reviews");
  assert.equal(data.isDemo, true);
  assert.equal(data.userCount, 0);
  assert.equal(data.count, 4);
  assert.equal(data.reviews.every((r) => r.isDemo), true);
});

test("patient booking reserves a live slot and creates pending payment records", async () => {
  const now = new Date();
  const daysToMonday = ((8 - now.getUTCDay()) % 7) || 7;
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMonday));
  const date = target.toISOString().slice(0, 10);
  await mongoose.connection.db.collection("care_schedules").insertOne({
    _id: "test-booking-schedule",
    doctor_id: "d1",
    weekday: 0,
    start_time: "09:00",
    end_time: "10:00",
    duration_minutes: 30,
    is_working: true,
  });
  const slots = await api(`/doctors/d1/availability?date=${date}`);
  assert.equal(slots.status, 200);
  assert.ok(slots.data.results.length);

  const patient = await api("/auth/login", {
    method: "POST",
    body: { email: "aarav@test.io", password: "Password1" },
  });
  const booked = await api("/doctors/d1/appointments", {
    method: "POST",
    token: patient.data.token,
    body: { slot_id: slots.data.results[0].id, consultation_type: "Video" },
  });
  assert.equal(booked.status, 201);
  assert.equal(booked.data.appointment.payment_status, "pending");
  assert.equal(booked.data.payment.status, "pending");

  const duplicate = await api("/doctors/d1/appointments", {
    method: "POST",
    token: patient.data.token,
    body: { slot_id: slots.data.results[0].id, consultation_type: "Video" },
  });
  assert.equal(duplicate.status, 409);
});
