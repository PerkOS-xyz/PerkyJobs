export interface Job {
  id?: string;
  title: string;
  description: string;
  reward: string;          // e.g. "5 cUSD"
  poster: string;          // X handle
  posterAddress?: string;  // Celo wallet
  worker?: string;         // X handle of claimed worker
  workerAddress?: string;  // Celo wallet
  status: "open" | "claimed" | "delivered" | "approved" | "paid" | "disputed";
  tags: string[];
  sourceUrl?: string;      // Original tweet URL
  createdAt: string;       // ISO timestamp
  updatedAt: string;
  deliveryProof?: string;  // URL or description of delivery
}

export interface UserProfile {
  id?: string;
  handle: string;          // X handle
  walletAddress?: string;
  selfVerified: boolean;   // Self Protocol verification
  reputationScore: number; // ERC-8004 score
  jobsPosted: number;
  jobsCompleted: number;
  createdAt: string;
}
