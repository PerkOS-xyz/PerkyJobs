/**
 * PerkyJobs X Bot — Monitors tweets mentioning @PerkyJobs and creates jobs
 * 
 * Usage: BEARER_TOKEN=xxx AGENT_API_KEY=xxx npx ts-node x-bot.ts
 * 
 * This is a polling-based bot (no webhooks needed).
 * Checks for new mentions every 30 seconds.
 */

const BEARER_TOKEN = process.env.X_BEARER_TOKEN || "";
const AGENT_API_KEY = process.env.AGENT_API_KEY!;
const API_BASE = process.env.API_BASE || "https://perkyjobs.xyz/.netlify/functions";
const POLL_INTERVAL_MS = 30_000; // 30 seconds
const BOT_USERNAME = "PerkyJobs";

interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
}

interface ParsedJob {
  title: string;
  reward: string;
  tags: string[];
  description: string;
  poster: string;
  sourceUrl: string;
}

/**
 * Parse a tweet into a job posting
 */
function parseTweet(tweet: Tweet, authorUsername: string): ParsedJob | null {
  const text = tweet.text.replace(/@PerkyJobs/gi, "").trim();

  // Extract reward: look for $ amount or number + USDT/USDT
  const rewardMatch = text.match(/\$(\d+(?:\.\d+)?)\s*(?:c?USD[C]?)?/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*c?USD[C]?/i);

  if (!rewardMatch) return null; // No reward = not a valid job posting

  const rewardAmount = parseFloat(rewardMatch[1]);
  if (rewardAmount < 1 || rewardAmount > 1000) return null;

  const reward = `${rewardAmount} USDT`;

  // Extract tags from hashtags
  const hashtagMatches = text.match(/#(\w+)/g) || [];
  const tags = hashtagMatches.map((h) => h.slice(1).toLowerCase());

  // Auto-detect tags from content
  const autoTags: Record<string, string[]> = {
    design: ["logo", "design", "graphic", "ui", "ux", "banner", "icon"],
    code: ["code", "develop", "build", "program", "smart contract", "solidity", "typescript", "api"],
    writing: ["write", "blog", "article", "copy", "content"],
    translation: ["translat", "spanish", "english", "french"],
    audit: ["audit", "review", "security"],
    research: ["research", "analyze", "report"],
  };

  for (const [tag, keywords] of Object.entries(autoTags)) {
    if (keywords.some((kw) => text.toLowerCase().includes(kw)) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  // Build title: clean up the text
  let title = text
    .replace(/\$\d+(?:\.\d+)?\s*c?USD[C]?/gi, "")
    .replace(/#\w+/g, "")
    .replace(/paying|pay|budget|reward/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Limit title length
  if (title.length > 100) title = title.substring(0, 97) + "...";
  if (title.length < 3) title = "Task from X";

  return {
    title,
    reward,
    tags: tags.length > 0 ? tags : ["general"],
    description: text,
    poster: `@${authorUsername}`,
    sourceUrl: `https://x.com/${authorUsername}/status/${tweet.id}`,
  };
}

/**
 * Create a job via the PerkyJobs API
 */
async function createJob(job: ParsedJob): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AGENT_API_KEY,
      },
      body: JSON.stringify(job),
    });

    if (!res.ok) {
      console.error(`Failed to create job: ${res.status}`);
      return null;
    }

    const data = await res.json();
    console.log(`✅ Job created: ${data.id} — "${job.title}" [${job.reward}]`);
    return data.id;
  } catch (err) {
    console.error("Error creating job:", err);
    return null;
  }
}

/**
 * Reply to a tweet confirming job creation
 */
async function replyToTweet(tweetId: string, text: string): Promise<void> {
  try {
    await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        reply: { in_reply_to_tweet_id: tweetId },
      }),
    });
  } catch (err) {
    console.error("Error replying to tweet:", err);
  }
}

/**
 * Fetch recent mentions
 */
async function getMentions(sinceId?: string): Promise<{ tweets: Tweet[]; users: Map<string, string> }> {
  const params = new URLSearchParams({
    "tweet.fields": "created_at,author_id",
    "user.fields": "username",
    "expansions": "author_id",
    "max_results": "10",
  });
  if (sinceId) params.set("since_id", sinceId);

  // First get the bot's user ID
  const meRes = await fetch("https://api.x.com/2/users/me", {
    headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
  });
  const meData = await meRes.json();
  const userId = meData.data?.id;

  if (!userId) {
    console.error("Could not get bot user ID");
    return { tweets: [], users: new Map() };
  }

  const res = await fetch(`https://api.x.com/2/users/${userId}/mentions?${params}`, {
    headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
  });

  if (!res.ok) {
    console.error(`Mentions API error: ${res.status}`);
    return { tweets: [], users: new Map() };
  }

  const data = await res.json();
  const tweets: Tweet[] = data.data || [];
  const users = new Map<string, string>();

  for (const u of data.includes?.users || []) {
    users.set(u.id, u.username);
  }

  return { tweets, users };
}

/**
 * Main polling loop
 */
async function main() {
  console.log("🐦 PerkyJobs X Bot starting...");
  console.log(`📡 Polling every ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`🔗 API: ${API_BASE}`);

  let lastTweetId: string | undefined;

  const poll = async () => {
    try {
      const { tweets, users } = await getMentions(lastTweetId);

      for (const tweet of tweets.reverse()) {
        const username = users.get(tweet.author_id) || "unknown";
        console.log(`\n📨 New mention from @${username}: "${tweet.text}"`);

        const job = parseTweet(tweet, username);

        if (job) {
          const jobId = await createJob(job);
          if (jobId) {
            await replyToTweet(
              tweet.id,
              `✅ Job posted on PerkyJobs!\n\n📋 "${job.title}"\n💰 ${job.reward}\n🔗 https://perkyjobs.xyz\n\n#PerkyJobs #Celo`
            );
          }
        } else {
          console.log("⏭️ Not a valid job posting, skipping");
        }

        lastTweetId = tweet.id;
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  };

  // Initial poll
  await poll();

  // Continue polling
  setInterval(poll, POLL_INTERVAL_MS);
}

main().catch(console.error);
