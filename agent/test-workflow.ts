/**
 * Test the complete PerkyJobs workflow end-to-end
 */

const API_BASE = process.env.API_BASE || "https://perkyjobs.xyz/.netlify/functions";
const API_KEY = process.env.AGENT_API_KEY!;

async function api(path: string, method = "GET", body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function main() {
  console.log("🧪 PerkyJobs Workflow Test\n");

  // 1. Create poster
  console.log("1️⃣ Creating poster...");
  const poster = await api("/users", "POST", {
    handle: "@test_poster",
    walletAddress: "0xPOSTER",
    selfVerified: true,
  });
  console.log(`   ✅ Poster: ${poster.handle} (id: ${poster.id})\n`);

  // 2. Create worker
  console.log("2️⃣ Creating worker...");
  const worker = await api("/users", "POST", {
    handle: "@test_worker",
    walletAddress: "0xWORKER",
    selfVerified: false,
  });
  console.log(`   ✅ Worker: ${worker.handle} (id: ${worker.id})\n`);

  // 3. Create job
  console.log("3️⃣ Creating job...");
  const job = await api("/jobs", "POST", {
    title: "Write a smart contract tutorial",
    description: "Need a beginner-friendly Solidity tutorial for Celo",
    reward: "25 USDT",
    poster: "@test_poster",
    tags: ["writing", "solidity", "tutorial"],
  });
  console.log(`   ✅ Job: "${job.title}" [${job.status}] — ${job.reward} (id: ${job.id})\n`);

  // 4. Claim
  console.log("4️⃣ Worker claims job...");
  const claimed = await api(`/jobs?id=${job.id}&_method=PATCH`, "POST", {
    status: "claimed",
    worker: "@test_worker",
  });
  console.log(`   ✅ Status: ${claimed.status}, Worker: ${claimed.worker}\n`);

  // 5. Deliver
  console.log("5️⃣ Worker delivers...");
  const delivered = await api(`/jobs?id=${job.id}&_method=PATCH`, "POST", {
    status: "delivered",
    deliveryProof: "https://example.com/tutorial.md",
  });
  console.log(`   ✅ Status: ${delivered.status}, Proof: ${delivered.deliveryProof}\n`);

  // 6. Approve
  console.log("6️⃣ Poster approves...");
  const approved = await api(`/jobs?id=${job.id}&_method=PATCH`, "POST", {
    status: "approved",
  });
  console.log(`   ✅ Status: ${approved.status}\n`);

  // 7. Payment would happen here via x402
  console.log("7️⃣ Payment (x402) → skipped in test (needs wallet signature)\n");

  // 8. Mark as paid
  console.log("8️⃣ Mark as paid...");
  const paid = await api(`/jobs?id=${job.id}&_method=PATCH`, "POST", {
    status: "paid",
  });
  console.log(`   ✅ Status: ${paid.status}\n`);

  // 9. Check leaderboard
  console.log("9️⃣ Leaderboard...");
  const users = await api("/users");
  for (const u of users.users || []) {
    console.log(`   ${u.handle}: score=${u.reputationScore}, jobs=${u.jobsCompleted}, verified=${u.selfVerified}`);
  }

  // 10. List all jobs
  console.log("\n🔟 All Jobs...");
  const allJobs = await api("/jobs");
  for (const j of allJobs.jobs || []) {
    console.log(`   ${j.title} [${j.status}] ${j.reward} — by ${j.poster}`);
  }

  console.log("\n✅ Workflow test complete!");
}

main().catch(console.error);
