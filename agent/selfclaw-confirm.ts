import { readFileSync } from "fs";
import { createPrivateKey, createPublicKey, sign, randomBytes } from "crypto";

const SELFCLAW_API = "https://selfclaw.ai/api/selfclaw/v1";
const KEY_PATH = "/Users/zknexus/.openclaw/wallets/perkyjobs-ed25519";

const keyB64 = readFileSync(KEY_PATH, "utf8").trim();
const keyDer = Buffer.from(keyB64, "base64");
const privateKey = createPrivateKey({ key: keyDer, format: "der", type: "pkcs8" });
const publicKey = createPublicKey(privateKey);
const pubKeyB64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");

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

const TOKEN_ADDRESS = "0x67aa5e5326c42eb0900c8a5d64e198fa6f305861";
const ERC8004_TX = "0xf8c78a4a145a4100e0db63f74a18d639f162a700e08641fac3d4c1773ea824c8";
const TOKEN_TX = "0x311bef202294052c58309f5cf325675394fba87b69093e487014f7c7980e0923";

async function main() {
  // Step 1: Confirm ERC-8004 registration
  console.log("=== Confirm ERC-8004 Identity ===");
  await apiPost("/confirm-erc8004", { txHash: ERC8004_TX });

  // Step 2: Register token
  console.log("\n=== Register Token ===");
  await apiPost("/register-token", { tokenAddress: TOKEN_ADDRESS, txHash: TOKEN_TX });

  // Step 3: Request SELFCLAW sponsorship (10% of supply = 100k tokens for liquidity)
  console.log("\n=== Request SELFCLAW Sponsorship ===");
  await apiPost("/request-selfclaw-sponsorship", {
    tokenAddress: TOKEN_ADDRESS,
    tokenAmount: "100000",
  });

  // Step 4: Check final agent status
  console.log("\n=== Final Agent Status ===");
  const pk = encodeURIComponent(pubKeyB64);
  const res = await fetch(`${SELFCLAW_API}/agent/${pk}`);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
