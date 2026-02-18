import { readFileSync } from "fs";
import { createPrivateKey, createPublicKey, sign, randomBytes } from "crypto";

const SELFCLAW_API = "https://selfclaw.ai/api/selfclaw/v1";
const KEY_PATH = "/Users/zknexus/.openclaw/wallets/perkyjobs-ed25519";
const WALLET = "0x6B6dd693686db9a31c3db0C3d8f3eE89F398d6fe";

// Load Ed25519 key (raw base64 PKCS8 DER)
const keyB64 = readFileSync(KEY_PATH, "utf8").trim();
const keyDer = Buffer.from(keyB64, "base64");
const privateKey = createPrivateKey({ key: keyDer, format: "der", type: "pkcs8" });
const publicKey = createPublicKey(privateKey);
const pubKeyB64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");

console.log("Agent public key:", pubKeyB64);

function signRequest(body: Record<string, any>) {
  const timestamp = Date.now();
  const nonce = randomBytes(16).toString("hex");
  const challenge = JSON.stringify({ agentPublicKey: pubKeyB64, timestamp, nonce });
  const signature = sign(null, Buffer.from(challenge), privateKey).toString("hex");
  return { ...body, agentPublicKey: pubKeyB64, signature, timestamp, nonce };
}

async function apiPost(endpoint: string, body: Record<string, any> = {}) {
  const url = `${SELFCLAW_API}${endpoint}`;
  const signed = signRequest(body);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signed),
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    console.log(`POST ${endpoint} [${res.status}]:`, JSON.stringify(data, null, 2));
    return data;
  } catch {
    console.log(`POST ${endpoint} [${res.status}]: ${text.slice(0, 500)}`);
    return null;
  }
}

async function apiGet(endpoint: string) {
  const url = `${SELFCLAW_API}${endpoint}`;
  const res = await fetch(url);
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    console.log(`GET ${endpoint} [${res.status}]:`, JSON.stringify(data, null, 2));
    return data;
  } catch {
    console.log(`GET ${endpoint} [${res.status}]: ${text.slice(0, 500)}`);
    return null;
  }
}

async function main() {
  const pk = encodeURIComponent(pubKeyB64);

  // Step 1: Wallet (already registered)
  console.log("\n=== STEP 1: Register Wallet ===");
  await apiPost("/create-wallet", { walletAddress: WALLET, chain: "celo" });

  // Step 2: Request gas
  console.log("\n=== STEP 2: Request Gas ===");
  await apiPost("/request-gas", { walletAddress: WALLET, chain: "celo" });

  // Step 3: Register ERC-8004 identity
  console.log("\n=== STEP 3: Register ERC-8004 Identity ===");
  await apiPost("/register-erc8004", { chain: "celo" });

  // Step 4: Deploy PERKY token
  console.log("\n=== STEP 4: Deploy PERKY Token ===");
  const tokenResult = await apiPost("/deploy-token", {
    name: "PerkyJobs",
    symbol: "PERKY",
    initialSupply: "1000000",
  });

  if (tokenResult?.unsignedTx) {
    console.log("\n⚠️  Got unsigned TX — needs EVM wallet signature to broadcast.");
    console.log("Save this for signing:", JSON.stringify(tokenResult.unsignedTx));
  }

  // Step 5: Check sponsorship simulator  
  console.log("\n=== STEP 5: Sponsorship Simulator ===");
  await apiGet("/sponsorship-simulator?totalSupply=1000000&liquidityTokens=100000");

  // Step 6: Request SELFCLAW sponsorship
  console.log("\n=== STEP 6: Request SELFCLAW Sponsorship ===");
  await apiPost("/request-selfclaw-sponsorship", {});

  // Step 7: Check economics
  console.log("\n=== STEP 7: Agent Economics ===");
  await apiGet(`/agent/${pk}/economics`);

  // Step 8: List PerkyJobs as a service
  console.log("\n=== STEP 8: List Service ===");
  await apiPost("/services", {
    name: "PerkyJobs Marketplace",
    description: "AI-powered job marketplace where humans and AI agents compete on the same leaderboard. Jobs posted on X & Farcaster, matched and paid in USDT on Celo.",
    endpoint: "https://perkyjobs.xyz/api",
    pricing: { model: "per_request", amount: "0.00", currency: "USD" },
  });

  console.log("\n✅ Full SelfClaw economy integration complete!");
}

main().catch(console.error);
