/**
 * x402 Payment helpers for PerkyJobs
 * Uses PerkOS Stack facilitator at stack.perkos.xyz
 */

const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://stack.perkos.xyz";
const PAY_TO = process.env.PAY_TO_ADDRESS || "";

// USDT addresses per network
const USDT_ADDRESSES: Record<string, string> = {
  celo: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  "celo-sepolia": "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  avalanche: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
};

// CAIP-2 network identifiers
const CAIP2: Record<string, string> = {
  celo: "eip155:42220",
  "celo-sepolia": "eip155:44787",
  base: "eip155:8453",
  avalanche: "eip155:43114",
};

export function getPaymentRequirements(priceUsd: number, endpoint: string) {
  const network = process.env.PAYMENT_NETWORK || "celo";
  const priceAtomicUnits = Math.round(priceUsd * 1_000_000).toString(); // USDT 6 decimals

  return {
    x402Version: 2,
    accepts: [{
      scheme: "exact",
      network: CAIP2[network] || CAIP2.celo,
      maxAmountRequired: priceAtomicUnits,
      resource: `https://perkyjobs.xyz${endpoint}`,
      description: `PerkyJobs payment for ${endpoint}`,
      mimeType: "application/json",
      payTo: PAY_TO,
      maxTimeoutSeconds: 30,
      asset: USDT_ADDRESSES[network] || USDT_ADDRESSES.celo,
      extra: {
        name: network === "celo" || network === "celo-sepolia" ? "USDT" : "USD Coin",
        version: "2",
        networkName: network,
      },
    }],
    defaultNetwork: network,
  };
}

export function create402Response(priceUsd: number, endpoint: string): Response {
  const requirements = getPaymentRequirements(priceUsd, endpoint);
  const header = Buffer.from(JSON.stringify(requirements)).toString("base64");

  return new Response(
    JSON.stringify({ error: "Payment Required", message: "Include PAYMENT-SIGNATURE header" }),
    {
      status: 402,
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-REQUIRED": header,
      },
    }
  );
}

export function extractPaymentEnvelope(req: Request) {
  const header = req.headers.get("payment-signature") || req.headers.get("x-payment");
  if (!header) return null;

  try {
    try {
      return JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
    } catch {
      return JSON.parse(header);
    }
  } catch {
    return null;
  }
}

export async function verifyAndSettlePayment(envelope: any, priceUsd: number, endpoint: string) {
  const network = process.env.PAYMENT_NETWORK || "celo";
  const priceAtomicUnits = Math.round(priceUsd * 1_000_000).toString();

  // Verify
  const verifyRes = await fetch(`${FACILITATOR_URL}/api/v2/x402/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      x402Version: 2,
      paymentRequirements: {
        scheme: "exact",
        network: CAIP2[network],
        maxAmountRequired: priceAtomicUnits,
        resource: `https://perkyjobs.xyz${endpoint}`,
        description: `PerkyJobs payment`,
        mimeType: "application/json",
        payTo: PAY_TO,
        maxTimeoutSeconds: 30,
        asset: USDT_ADDRESSES[network] || USDT_ADDRESSES.celo,
        extra: { name: "USDT", version: "2" },
      },
      paymentPayload: {
        x402Version: 2,
        network: CAIP2[network],
        scheme: "exact",
        payload: envelope.payload || envelope,
      },
    }),
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    return { success: false, error: err.invalidReason || "Verification failed" };
  }

  const verifyResult = await verifyRes.json();
  if (!verifyResult.isValid) {
    return { success: false, error: verifyResult.invalidReason || "Invalid payment" };
  }

  // Settle
  const settleRes = await fetch(`${FACILITATOR_URL}/api/v2/x402/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      x402Version: 2,
      paymentPayload: {
        x402Version: 2,
        network: CAIP2[network],
        scheme: "exact",
        payload: envelope.payload || envelope,
      },
      paymentRequirements: {
        scheme: "exact",
        network: CAIP2[network],
        maxAmountRequired: priceAtomicUnits,
        resource: `https://perkyjobs.xyz${endpoint}`,
        payTo: PAY_TO,
        maxTimeoutSeconds: 30,
        asset: USDT_ADDRESSES[network] || USDT_ADDRESSES.celo,
        extra: { name: "USDT", version: "2" },
      },
    }),
  });

  const settleResult = await settleRes.json().catch(() => ({}));

  if (!settleResult.success) {
    return { success: false, error: settleResult.errorReason || "Settlement failed" };
  }

  return {
    success: true,
    payer: verifyResult.payer,
    transactionHash: settleResult.transaction || settleResult.transactionHash,
  };
}
