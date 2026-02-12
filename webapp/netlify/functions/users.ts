import type { Context } from "@netlify/functions";
import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getDb() {
  if (getApps().length === 0) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (sa) {
      initializeApp({ credential: cert(JSON.parse(sa) as ServiceAccount) });
    } else {
      initializeApp({ projectId: "perky-jobs" });
    }
  }
  return getFirestore();
}

const AGENT_API_KEY = process.env.AGENT_API_KEY!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export default async function handler(req: Request, _context: Context) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      },
    });
  }

  const db = getDb();
  const url = new URL(req.url);

  // GET — list or by handle
  if (req.method === "GET") {
    const handle = url.searchParams.get("handle");
    if (handle) {
      const snap = await db.collection("users").where("handle", "==", handle).limit(1).get();
      if (snap.empty) return json({ error: "User not found" }, 404);
      const doc = snap.docs[0];
      return json({ id: doc.id, ...doc.data() });
    }
    const snap = await db.collection("users").orderBy("reputationScore", "desc").limit(20).get();
    return json({ users: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }

  // Auth for writes
  const apiKey = req.headers.get("x-api-key") || url.searchParams.get("api_key");
  if (apiKey !== AGENT_API_KEY) {
    return json({ error: "Unauthorized" }, 401);
  }

  // POST — create/update user
  if (req.method === "POST") {
    const body = await req.json();
    if (!body.handle) return json({ error: "handle required" }, 400);

    const existing = await db.collection("users").where("handle", "==", body.handle).limit(1).get();
    const now = new Date().toISOString();

    if (!existing.empty) {
      const doc = existing.docs[0];
      await doc.ref.update({ ...body, updatedAt: now });
      return json({ id: doc.id, ...doc.data(), ...body });
    }

    const user = {
      handle: body.handle,
      walletAddress: body.walletAddress || null,
      selfVerified: body.selfVerified || false,
      reputationScore: body.reputationScore || 0,
      jobsPosted: 0,
      jobsCompleted: 0,
      createdAt: now,
    };
    const ref = await db.collection("users").add(user);
    return json({ id: ref.id, ...user }, 201);
  }

  return json({ error: "Method not allowed" }, 405);
}
