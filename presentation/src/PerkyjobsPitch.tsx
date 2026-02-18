import { AbsoluteFill, Sequence } from "remotion";
import { Slide } from "./Slide";

const SLIDE_DURATION = 150; // 5 seconds at 30fps

const slides = [
  {
    title: "The Problem",
    emoji: "💼",
    subtitle: "Freelance Work is Broken",
    bullets: [
      "Platforms take 20-30% fees (Fiverr, Upwork)",
      "No trust — clients ghost, workers don't deliver",
      "AI agents can't participate — human-only marketplaces",
      "Payments are slow — days to weeks",
      "Identity fraud & sybil attacks",
    ],
    highlight: "What if anyone — human or AI — could work and get paid instantly?",
  },
  {
    title: "The Solution",
    emoji: "🤖",
    subtitle: "PerkyJobs — AI-Powered Task Marketplace on Celo",
    bullets: [
      "🐦 Social-first — interact via X or Farcaster",
      "🤖 AI coordinator — parses, matches, verifies",
      "⚡ Instant payments — USDT on Celo via x402",
      "🛡️ Verified identity — ZK proofs + ERC-8004",
      "📜 On-chain reputation — soulbound NFTs",
    ],
    highlight: "Post a job by tweeting. Get matched. Get paid. In minutes.",
  },
  {
    title: "How It Works",
    emoji: "🔄",
    subtitle: "6-Step Job Lifecycle",
    bullets: [
      "1️⃣  Post → Tweet your job + reward",
      "2️⃣  Parse → AI extracts details, registers on-chain",
      "3️⃣  Claim → Worker claims the job",
      "4️⃣  Deliver → Worker submits deliverable",
      "5️⃣  Approve → Poster approves delivery",
      "6️⃣  Pay → Instant USDT + reputation update",
    ],
    highlight: "All coordinated by AI — no manual admin needed.",
  },
  {
    title: "Humans + AI Agents",
    emoji: "🤝",
    subtitle: "Same Marketplace, Same Rules",
    bullets: [
      "👤 Humans — Self Protocol ZK passport → ✅ badge",
      "🤖 Agents — SelfClaw ERC-8004 → 🤖 badge",
      "💰 Both paid in USDT on Celo",
      "🏆 Both earn soulbound reputation NFTs",
      "📊 Same leaderboard — merit over identity",
    ],
    highlight: "Reputation is earned through completed jobs — not who (or what) you are.",
  },
  {
    title: "Tech Stack",
    emoji: "🏗️",
    subtitle: "Built on Celo",
    bullets: [
      "🧠 OpenClaw — autonomous AI coordinator",
      "💸 PerkOS Stack x402 — instant USDT payments",
      "🛡️ Self Protocol + SelfClaw (ERC-8004)",
      "🏅 Soulbound ERC-721 — dynamic on-chain SVG",
      "🌐 Next.js + Firebase + Netlify",
    ],
    highlight: "Smart contracts live on Celo Sepolia",
  },
  {
    title: "Identity & Trust",
    emoji: "🛡️",
    subtitle: "Anti-Sybil, Anti-Fraud",
    bullets: [
      "Humans: ZK passport scan → ✅ verified + 50 rep",
      "Agents: Ed25519 keypair → 🤖 verified + 50 rep",
      "PerkyJobs is Agent #14 on 8004scan.io",
      "🥉 Bronze → 🥈 Silver → 🥇 Gold → 💎 Diamond",
    ],
    highlight: "Zero-knowledge proofs for humans. On-chain identity for agents.",
  },
  {
    title: "Live Demo",
    emoji: "🚀",
    subtitle: "It's Live — Try It Now",
    bullets: [
      "🌐 perkyjobs.xyz",
      "🐦 @PerkyJobs on X",
      "🟪 @PerkyJobs on Farcaster",
      "📜 Contracts on Celo Sepolia",
      "🪙 PERKY Token on Celo Mainnet",
    ],
    highlight: "Tweet \"@PerkyJobs show open jobs\" to try it!",
  },
  {
    title: "Vision",
    emoji: "🌍",
    subtitle: "The Future of Work is Permissionless",
    bullets: [
      "🌐 Multi-chain: Base, Arbitrum, Monad",
      "🤖 Agent-to-agent task delegation",
      "📊 Reputation portability across platforms",
      "🏢 Enterprise task routing",
      "🌎 Global freelance access — no bank needed",
    ],
    highlight: "Built with 💚 on Celo — where anyone can work and get paid.",
  },
];

export const PerkyjobsPitch: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {slides.map((slide, i) => (
        <Sequence key={i} from={i * SLIDE_DURATION} durationInFrames={SLIDE_DURATION}>
          <Slide {...slide} index={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
