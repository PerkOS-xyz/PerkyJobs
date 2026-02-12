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
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export default async function handler(req: Request, _context: Context) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      },
    });
  }

  const db = getDb();
  const url = new URL(req.url);
  const jobId = url.searchParams.get("id");
  // Method override: POST with ?_method=PATCH acts as PATCH
  const method = (url.searchParams.get("_method") || req.method).toUpperCase();

  // GET — list or single
  if (method === "GET") {
    if (jobId) {
      const doc = await db.collection("jobs").doc(jobId).get();
      if (!doc.exists) return json({ error: "Not found" }, 404);
      return json({ id: doc.id, ...doc.data() });
    }
    const status = url.searchParams.get("status");
    let q = db.collection("jobs").orderBy("createdAt", "desc").limit(50);
    if (status) q = q.where("status", "==", status);
    const snap = await q.get();
    return json({ jobs: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }

  // Auth check for write ops
  const apiKey = req.headers.get("x-api-key") || url.searchParams.get("api_key");
  if (apiKey !== AGENT_API_KEY) {
    return json({ error: "Unauthorized" }, 401);
  }

  // POST — create job (no jobId)
  if (method === "POST" && !jobId) {
    const body = await req.json();
    if (!body.title || !body.reward || !body.poster) {
      return json({ error: "title, reward, and poster required" }, 400);
    }
    const now = new Date().toISOString();
    const job = {
      title: body.title,
      description: body.description || "",
      reward: body.reward,
      poster: body.poster,
      posterAddress: body.posterAddress || null,
      worker: null,
      workerAddress: null,
      status: "open",
      tags: body.tags || [],
      sourceUrl: body.sourceUrl || null,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection("jobs").add(job);
    return json({ id: ref.id, ...job }, 201);
  }

  // PATCH/PUT or POST with jobId — update job
  if ((method === "PATCH" || method === "PUT" || (method === "POST" && jobId))) {
    if (!jobId) return json({ error: "Job ID required" }, 400);
    const body = await req.json();

    const doc = db.collection("jobs").doc(jobId);
    const snap = await doc.get();
    if (!snap.exists) return json({ error: "Not found" }, 404);
    const current = snap.data()!;

    // Cancel claim — only poster can cancel, only if claimed (not yet delivered)
    if (body.status === "open" && current.status === "claimed") {
      if (body.cancelledBy && body.cancelledBy !== current.poster) {
        return json({ error: "Only the job poster can cancel a claim" }, 403);
      }
      const update = {
        status: "open",
        worker: null,
        workerAddress: null,
        updatedAt: new Date().toISOString(),
      };
      await doc.update(update);
      return json({ id: jobId, ...current, ...update });
    }

    const allowed = ["status", "worker", "workerAddress", "deliveryProof"];
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const k of allowed) {
      if (k in body) update[k] = body[k];
    }
    await doc.update(update);
    return json({ id: jobId, ...current, ...update });
  }

  return json({ error: "Method not allowed" }, 405);
}
