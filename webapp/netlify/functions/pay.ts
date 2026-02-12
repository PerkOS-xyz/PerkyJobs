/**
 * POST /api/pay — Process x402 payment for a completed job
 * 
 * Flow:
 * 1. Worker delivers → poster approves → agent calls /api/pay with job ID
 * 2. Client signs x402 payment → sends PAYMENT-SIGNATURE header
 * 3. We verify & settle via PerkOS Stack facilitator
 * 4. Update job status to "paid" in Firestore
 */

import type { Context } from "@netlify/functions";
import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { extractPaymentEnvelope, verifyAndSettlePayment, create402Response } from "./x402.js";

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

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", ...extraHeaders },
  });
}

export default async function handler(req: Request, _context: Context) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key, payment-signature, x-payment",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const body = await req.json();
  const jobId = body.jobId;

  if (!jobId) {
    return json({ error: "jobId required" }, 400);
  }

  const db = getDb();
  const jobDoc = await db.collection("jobs").doc(jobId).get();

  if (!jobDoc.exists) {
    return json({ error: "Job not found" }, 404);
  }

  const job = jobDoc.data()!;

  if (job.status !== "approved") {
    return json({ error: `Job must be approved before payment. Current status: ${job.status}` }, 400);
  }

  // Parse reward amount (e.g. "5 USDT" → 5.0)
  const rewardMatch = job.reward?.match(/([\d.]+)/);
  const rewardUsd = rewardMatch ? parseFloat(rewardMatch[1]) : 0;

  if (rewardUsd <= 0) {
    return json({ error: "Invalid reward amount" }, 400);
  }

  // Check for x402 payment
  const envelope = extractPaymentEnvelope(req);
  if (!envelope) {
    return create402Response(rewardUsd, `/api/pay`);
  }

  // Verify and settle
  const result = await verifyAndSettlePayment(envelope, rewardUsd, `/api/pay`);

  if (!result.success) {
    return json({ error: "Payment failed", reason: result.error }, 402);
  }

  // Update job to paid
  await db.collection("jobs").doc(jobId).update({
    status: "paid",
    updatedAt: new Date().toISOString(),
    paymentTx: result.transactionHash || null,
    paidBy: result.payer || null,
  });

  // Update worker reputation
  if (job.worker) {
    const userSnap = await db.collection("users").where("handle", "==", job.worker).limit(1).get();
    if (!userSnap.empty) {
      const userDoc = userSnap.docs[0];
      const userData = userDoc.data();
      await userDoc.ref.update({
        jobsCompleted: (userData.jobsCompleted || 0) + 1,
        reputationScore: (userData.reputationScore || 0) + 10, // +10 per completed job
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return json({
    success: true,
    jobId,
    transactionHash: result.transactionHash,
    payer: result.payer,
    worker: job.worker,
    reward: job.reward,
  });
}
