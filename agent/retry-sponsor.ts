import { readFileSync } from "fs";
import { createPrivateKey, createPublicKey, sign, randomBytes } from "crypto";

const SELFCLAW_API = "https://selfclaw.ai/api/selfclaw/v1";
const ed25519B64 = readFileSync("/Users/zknexus/.openclaw/wallets/perkyjobs-ed25519", "utf8").trim();
const ed25519Der = Buffer.from(ed25519B64, "base64");
const ed25519Key = createPrivateKey({ key: ed25519Der, format: "der", type: "pkcs8" });
const ed25519Pub = createPublicKey(ed25519Key);
const pubKeyB64 = ed25519Pub.export({ type: "spki", format: "der" }).toString("base64");

const timestamp = Date.now();
const nonce = randomBytes(16).toString("hex");
const challenge = JSON.stringify({ agentPublicKey: pubKeyB64, timestamp, nonce });
const signature = sign(null, Buffer.from(challenge), ed25519Key).toString("hex");

const body = {
  agentPublicKey: pubKeyB64,
  signature, timestamp, nonce,
  tokenAddress: "0x67aa5e5326c42eb0900c8a5d64e198fa6f305861",
  tokenAmount: "100000",
  transferTxHash: "0x15dfc4802959593051b7f5b60367276b12a3d47ae7d633e7a7fc7ca9860448c7"
};

fetch(SELFCLAW_API + "/request-selfclaw-sponsorship", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
}).then(r => r.text()).then(t => console.log(t)).catch(e => console.error(e));
