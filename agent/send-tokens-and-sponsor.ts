import { createWalletClient, createPublicClient, http, defineChain, parseAbi, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { createPrivateKey, createPublicKey, sign, randomBytes } from "crypto";

const celo = defineChain({
  id: 42220,
  name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://forno.celo.org"] } },
});

const keyHex = readFileSync("/Users/zknexus/.openclaw/wallets/alice", "utf8").trim();
const account = privateKeyToAccount(keyHex.startsWith("0x") ? keyHex as `0x${string}` : `0x${keyHex}`);

const publicClient = createPublicClient({ chain: celo, transport: http() });
const walletClient = createWalletClient({ account, chain: celo, transport: http() });

const TOKEN = "0x67aa5e5326c42eb0900c8a5d64e198fa6f305861" as `0x${string}`;
const SPONSOR_WALLET = "0x5451bC61a58FfD5B6684a7EA1E2Ef0FDbd4ccBE6" as `0x${string}`;
const AMOUNT = parseUnits("100000", 18); // 100k PERKY (10% of supply)

const erc20Abi = parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]);

// Ed25519 for SelfClaw API
const SELFCLAW_API = "https://selfclaw.ai/api/selfclaw/v1";
const ed25519B64 = readFileSync("/Users/zknexus/.openclaw/wallets/perkyjobs-ed25519", "utf8").trim();
const ed25519Der = Buffer.from(ed25519B64, "base64");
const ed25519Key = createPrivateKey({ key: ed25519Der, format: "der", type: "pkcs8" });
const ed25519Pub = createPublicKey(ed25519Key);
const pubKeyB64 = ed25519Pub.export({ type: "spki", format: "der" }).toString("base64");

function signRequest(body: Record<string, any>) {
  const timestamp = Date.now();
  const nonce = randomBytes(16).toString("hex");
  const challenge = JSON.stringify({ agentPublicKey: pubKeyB64, timestamp, nonce });
  const signature = sign(null, Buffer.from(challenge), ed25519Key).toString("hex");
  return { ...body, agentPublicKey: pubKeyB64, signature, timestamp, nonce };
}

async function main() {
  // Step 1: Send 100k PERKY to sponsor wallet
  console.log("=== Sending 100k PERKY to sponsor wallet ===");
  const hash = await walletClient.writeContract({
    address: TOKEN,
    abi: erc20Abi,
    functionName: "transfer",
    args: [SPONSOR_WALLET, AMOUNT],
  });
  console.log("Transfer TX:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Status:", receipt.status);

  // Step 2: Request sponsorship
  console.log("\n=== Requesting SELFCLAW Sponsorship ===");
  const signed = signRequest({ tokenAddress: TOKEN, tokenAmount: "100000" });
  const res = await fetch(`${SELFCLAW_API}/request-selfclaw-sponsorship`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signed),
  });
  const data = await res.json();
  console.log("Sponsorship:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
