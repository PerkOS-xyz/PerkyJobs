/**
 * PerkyJobs Agent — SelfClaw Setup
 * 
 * Handles the full verification + onboarding flow:
 * 1. Start verification → get QR for human
 * 2. Sign challenge → prove key ownership
 * 3. Poll until human scans QR
 * 4. Create wallet → register EVM address
 * 5. Request gas → 1 CELO free
 * 6. Register ERC-8004 → on-chain identity
 * 7. Register services → list in marketplace
 */

import { createPrivateKey, sign as cryptoSign, randomBytes } from "crypto";

const SELFCLAW_API = "https://selfclaw.ai/api/selfclaw/v1";
const PUBLIC_KEY = "MCowBQYDK2VwAyEAh4AuZQKsM38AS+ibNvqxt7zfgQwskKTLpfsidhaBDeY=";

// Load private key
import { readFileSync } from "fs";
const PRIVATE_KEY_B64 = readFileSync("/Users/zknexus/.openclaw/wallets/perkyjobs-ed25519", "utf-8").trim();
const privateKeyDer = Buffer.from(PRIVATE_KEY_B64, "base64");
const privateKey = createPrivateKey({ key: privateKeyDer, format: "der", type: "pkcs8" });

// Agent's EVM wallet (same deployer wallet)
const WALLET_ADDRESS = "0x6B6dd693686db9a31c3db0C3d8f3eE89F398d6fe";

function signMessage(message: string): string {
  const sig = cryptoSign(null, Buffer.from(message), privateKey);
  return sig.toString("hex");
}

function authPayload(extra: Record<string, unknown> = {}) {
  const timestamp = Date.now();
  const nonce = randomBytes(16).toString("hex");
  const message = JSON.stringify({ agentPublicKey: PUBLIC_KEY, timestamp, nonce });
  const signature = signMessage(message);
  return { agentPublicKey: PUBLIC_KEY, signature, timestamp, nonce, ...extra };
}

async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${SELFCLAW_API}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function step1_startVerification() {
  console.log("\n🔐 Step 1: Starting verification...");
  const res = await api("/start-verification", "POST", {
    agentPublicKey: PUBLIC_KEY,
    agentName: "PerkyJobs",
  });

  if (!res.success) {
    console.log("   Already verified or error:", res.message || res.error);
    return null;
  }

  console.log("   ✅ Session:", res.sessionId);
  return res;
}

async function step2_signChallenge(sessionId: string, challenge: string) {
  console.log("\n✍️  Step 2: Signing challenge...");
  const signature = cryptoSign(null, Buffer.from(challenge), privateKey).toString("base64");

  const res = await api("/sign-challenge", "POST", { sessionId, signature });
  console.log("   ✅", res.message);
  return res;
}

async function step3_pollVerification(sessionId: string) {
  console.log("\n📱 Step 3: Waiting for QR scan...");
  console.log("   👉 Human must scan QR code with Self App");
  console.log("   👉 Or visit https://selfclaw.ai/verify and enter the public key:");
  console.log(`   ${PUBLIC_KEY}`);
  console.log("");

  for (let i = 0; i < 60; i++) { // 5 minutes max
    const res = await api(`/verification-status/${sessionId}`);

    if (res.status === "verified") {
      console.log("   🎉 VERIFIED! humanId:", res.humanId);
      return res;
    }

    if (res.status === "expired") {
      console.log("   ❌ Session expired. Run again.");
      return null;
    }

    process.stdout.write(`   ⏳ Polling... (${i * 5}s)\r`);
    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log("   ⏰ Timeout waiting for verification");
  return null;
}

async function step4_createWallet() {
  console.log("\n💳 Step 4: Registering wallet...");
  const res = await api("/create-wallet", "POST", authPayload({ walletAddress: WALLET_ADDRESS }));

  if (res.success) {
    console.log("   ✅ Wallet registered:", res.address);
  } else {
    console.log("   ℹ️ ", res.message || res.error);
  }
  return res;
}

async function step5_requestGas() {
  console.log("\n⛽ Step 5: Requesting gas (1 CELO)...");
  const res = await api("/request-gas", "POST", authPayload());

  if (res.success) {
    console.log("   ✅ Gas received! Tx:", res.txHash);
  } else {
    console.log("   ℹ️ ", res.message || res.error);
  }
  return res;
}

async function step6_registerERC8004() {
  console.log("\n🆔 Step 6: Registering ERC-8004 on-chain identity...");
  const res = await api("/register-erc8004", "POST", authPayload());

  if (res.success) {
    console.log("   ✅ ERC-8004 identity minted!");
    console.log("   Token ID:", res.tokenId);
    console.log("   Tx:", res.txHash);
  } else {
    console.log("   ℹ️ ", res.message || res.error);
  }
  return res;
}

async function step7_registerServices() {
  console.log("\n📋 Step 7: Registering services...");
  const res = await api("/services", "POST", authPayload({
    services: [
      {
        name: "Job Marketplace",
        description: "AI-powered job marketplace on Celo. Post tasks on X, get matched with workers, pay in cUSD.",
        endpoint: "https://perkyjobs.xyz",
        pricing: "Free to browse, x402 payments for jobs",
        currency: "cUSD",
      },
      {
        name: "Reputation Scoring",
        description: "On-chain soulbound reputation NFTs (ERC-8004). Earn points by completing jobs.",
        endpoint: "https://perkyjobs.xyz/.netlify/functions/users",
        pricing: "Free",
      },
    ],
  }));

  if (res.success) {
    console.log("   ✅ Services registered!");
  } else {
    console.log("   ℹ️ ", res.message || res.error);
  }
  return res;
}

async function checkStatus() {
  console.log("\n🔍 Checking current status...");
  const res = await api(`/agent?publicKey=${encodeURIComponent(PUBLIC_KEY)}`);

  if (res.verified) {
    console.log("   ✅ Agent is VERIFIED");
    console.log("   humanId:", res.humanId);
    console.log("   name:", res.agentName);
    console.log("   swarm:", res.swarm);
    return true;
  }

  console.log("   ❌ Not verified yet");
  return false;
}

async function main() {
  console.log("🐦💼 PerkyJobs Agent — SelfClaw Setup");
  console.log("=====================================\n");
  console.log("Public Key:", PUBLIC_KEY);
  console.log("Wallet:", WALLET_ADDRESS);

  // Check if already verified
  const alreadyVerified = await checkStatus();

  if (alreadyVerified) {
    console.log("\n🎉 Already verified! Running post-verification steps...\n");
    await step4_createWallet();
    await step5_requestGas();
    await step6_registerERC8004();
    await step7_registerServices();
    console.log("\n✅ Setup complete!");
    return;
  }

  // Full verification flow
  const verif = await step1_startVerification();
  if (!verif) {
    // Try post-verification steps anyway
    await step4_createWallet();
    await step5_requestGas();
    await step6_registerERC8004();
    await step7_registerServices();
    return;
  }

  await step2_signChallenge(verif.sessionId, verif.challenge);

  const result = await step3_pollVerification(verif.sessionId);
  if (!result) return;

  // Post-verification
  await step4_createWallet();
  await step5_requestGas();
  await step6_registerERC8004();
  await step7_registerServices();

  console.log("\n🎉 PerkyJobs Agent is fully set up on SelfClaw!");
  console.log("   🌐 https://perkyjobs.xyz");
  console.log("   📜 ERC-8004 identity on Celo");
  console.log("   🛡️ Verified human-backed agent");
}

main().catch(console.error);
