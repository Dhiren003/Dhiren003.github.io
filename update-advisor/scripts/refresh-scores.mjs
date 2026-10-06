/**
 * Free alternative to Cloudflare Worker:
 * Runs on GitHub Actions (schedule or manual).
 * Reads base JSON, optionally scores Reddit/YouTube/MacRumors,
 * writes compatibility.json for GitHub Pages to serve.
 *
 * Env (optional, set as GitHub Actions secrets):
 *   REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, YOUTUBE_API_KEY
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const BASE_PATH = process.env.BASE_JSON || "compatibility.base.json";
const OUT_PATH = process.env.OUT_JSON || "compatibility.json";

const POS = [
  "stable", "smooth", "recommend", "worth it", "no issues", "fixed", "great",
  "love", "safe to update", "works well", "update now", "improved",
];
const NEG = [
  "bug", "issue", "problem", "brick", "boot loop", "battery drain", "crash",
  "revert", "broken", "wait", "don't update", "do not update", "regret",
];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function countKeywords(text, words) {
  const t = (text || "").toLowerCase();
  let n = 0;
  for (const w of words) {
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const m = t.match(re);
    if (m) n += m.length;
  }
  return n;
}

function weightedAverage(items) {
  let w = 0, s = 0;
  for (const it of items) {
    const weight = Number(it.weight) || 0;
    const score = clamp(Number(it.score) || 0, 0, 100);
    w += weight;
    s += weight * score;
  }
  return w ? Math.round(s / w) : 70;
}

function labelForScore(score, osName) {
  if (score >= 80) return `Safe to update for most ${osName} users`;
  if (score >= 65) return `Reasonably safe — short wait optional on older devices`;
  if (score >= 50) return `Mixed signals — wait a few more days if unsure`;
  return `Elevated early-release risk — prefer waiting for a point release`;
}

function daysSince(iso) {
  if (!iso) return 14;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 14;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function historicalScore(days) {
  if (days <= 2) return 45;
  if (days <= 5) return 55;
  if (days <= 10) return 65;
  if (days <= 20) return 75;
  return 85;
}

async function scoreMacRumors(kind) {
  const url =
    kind === "android"
      ? "https://www.macrumors.com/"
      : "https://www.macrumors.com/roundup/ios-27/";
  const res = await fetch(url, {
    headers: { "User-Agent": "UpdateAdvisor-GHActions/1.0", Accept: "text/html" },
  });
  if (!res.ok) throw new Error("macrumors " + res.status);
  const html = (await res.text()).slice(0, 100000);
  const pos = countKeywords(html, POS);
  const neg = countKeywords(html, NEG);
  const total = pos + neg || 1;
  const score = clamp(Math.round(50 + (pos / total) * 40 - Math.min(neg, 15)), 45, 92);
  return { score, note: `MacRumors keyword scan (pos=${pos}, neg=${neg}).`, pos, neg };
}

async function redditToken() {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) throw new Error("no_reddit_creds");
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + basic,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "UpdateAdvisor/1.0 by github-actions",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("reddit_token " + res.status);
  const data = await res.json();
  if (!data.access_token) throw new Error("reddit_token_missing");
  return data.access_token;
}

async function scoreReddit(sub, queries) {
  const token = await redditToken();
  let pos = 0, neg = 0, samples = 0;
  for (const q of queries.slice(0, 2)) {
    const url =
      `https://oauth.reddit.com/r/${sub}/search?q=${encodeURIComponent(q)}&restrict_sr=1&sort=new&t=week&limit=25`;
    const res = await fetch(url, {
      headers: {
        Authorization: "Bearer " + token,
        "User-Agent": "UpdateAdvisor/1.0 by github-actions",
      },
    });
    if (!res.ok) continue;
    const data = await res.json();
    for (const p of data?.data?.children || []) {
      const text = `${p.data?.title || ""} ${p.data?.selftext || ""}`;
      samples++;
      pos += countKeywords(text, POS);
      neg += countKeywords(text, NEG);
    }
  }
  const total = pos + neg || 1;
  const score = clamp(Math.round(48 + (pos / total) * 42 - Math.min(neg, 12)), 40, 90);
  return {
    score,
    note: `r/${sub} last-week sample (n≈${samples}, pos=${pos}, neg=${neg}).`,
    samples,
    pos,
    neg,
  };
}

async function scoreYouTube(query) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("no_youtube_key");
  const publishedAfter = new Date(Date.now() - 21 * 86400000).toISOString();
  const url =
    "https://www.googleapis.com/youtube/v3/search?" +
    new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      order: "relevance",
      publishedAfter,
      maxResults: "10",
      key,
    });
  const res = await fetch(url);
  if (!res.ok) throw new Error("youtube " + res.status);
  const data = await res.json();
  const items = data.items || [];
  let pos = 0, neg = 0;
  for (const it of items) {
    const text = `${it.snippet?.title || ""} ${it.snippet?.description || ""}`;
    pos += countKeywords(text, POS);
    neg += countKeywords(text, NEG);
  }
  const total = pos + neg || 1;
  const score = clamp(Math.round(55 + (pos / total) * 35 - Math.min(neg, 10)), 45, 92);
  return {
    score,
    note: `YouTube “${query}” (videos=${items.length}, pos=${pos}, neg=${neg}).`,
    videos: items.length,
    pos,
    neg,
  };
}

function applyProbability(platform, breakdown, extra) {
  const overall = weightedAverage(breakdown);
  platform.updateProbability = {
    overallScore: overall,
    label: labelForScore(overall, platform.osName || "OS"),
    breakdown,
    adviceByTier: extra.adviceByTier || platform.updateProbability?.adviceByTier || {},
  };
  platform.communitySentiment = {
    ...(platform.communitySentiment || {}),
    label: extra.sentimentLabel || labelForScore(overall, platform.osName || "OS"),
    score: overall >= 75 ? "good" : overall >= 55 ? "mixed" : "cautious",
    summary: extra.sentimentSummary || platform.communitySentiment?.summary,
    sourceNote:
      "Refreshed by GitHub Actions (MacRumors + optional Reddit/YouTube). " +
      (platform.communitySentiment?.sourceNote || ""),
  };
}

async function buildIos(feed, errors) {
  const breakdown = [];
  breakdown.push({
    source: "Apple official",
    weight: 25,
    score: 90,
    note: "Stable major / point release published on Apple channels.",
  });

  try {
    const mr = await scoreMacRumors("ios");
    breakdown.push({ source: "MacRumors / forums", weight: 20, score: mr.score, note: mr.note });
  } catch (e) {
    errors.push("macrumors-ios: " + e.message);
    breakdown.push({
      source: "MacRumors / forums",
      weight: 20,
      score: 70,
      note: "Live fetch failed — neutral default.",
    });
  }

  try {
    const rd = await scoreReddit("ios", ["iOS 27", "should I update iOS"]);
    breakdown.push({ source: "Reddit r/ios", weight: 20, score: rd.score, note: rd.note });
  } catch (e) {
    errors.push("reddit-ios: " + e.message);
    breakdown.push({
      source: "Reddit r/ios",
      weight: 20,
      score: 65,
      note: "Reddit unavailable — set REDDIT_CLIENT_ID/SECRET secrets for live data.",
    });
  }

  try {
    const yt = await scoreYouTube("iOS 27 should you update");
    breakdown.push({ source: "YouTube reviewers", weight: 20, score: yt.score, note: yt.note });
  } catch (e) {
    errors.push("youtube-ios: " + e.message);
    breakdown.push({
      source: "YouTube reviewers",
      weight: 20,
      score: 75,
      note: "YouTube unavailable — set YOUTUBE_API_KEY secret for live data.",
    });
  }

  breakdown.push({
    source: "Historical pattern",
    weight: 15,
    score: historicalScore(daysSince(feed.ios?.channels?.stable?.releaseDate)),
    note: "Major .0 week is riskiest; risk falls after first point release.",
  });

  const overall = weightedAverage(breakdown);
  applyProbability(feed.ios, breakdown, {
    adviceByTier: feed.ios.updateProbability?.adviceByTier,
    sentimentLabel: labelForScore(overall, "iOS"),
    sentimentSummary:
      overall >= 80
        ? "iOS signals are strong — most sources lean toward updating on supported hardware."
        : overall >= 65
          ? "iOS signals are mostly positive with some caution on older devices."
          : "iOS signals are mixed — waiting a few days remains reasonable.",
  });
}

async function buildAndroid(feed, errors) {
  const breakdown = [];
  breakdown.push({
    source: "Google / Pixel",
    weight: 30,
    score: 88,
    note: "Android stable + QPR cadence on Pixel is the reference track.",
  });

  try {
    const mr = await scoreMacRumors("android");
    breakdown.push({ source: "Press / forums", weight: 20, score: mr.score, note: mr.note });
  } catch (e) {
    errors.push("macrumors-android: " + e.message);
    breakdown.push({ source: "Press / forums", weight: 20, score: 70, note: "Live fetch failed — neutral default." });
  }

  try {
    const rd = await scoreReddit("Android", ["Android 17", "One UI 9 update"]);
    breakdown.push({ source: "Reddit r/Android", weight: 15, score: rd.score, note: rd.note });
  } catch (e) {
    errors.push("reddit-android: " + e.message);
    breakdown.push({
      source: "Reddit r/Android",
      weight: 15,
      score: 70,
      note: "Reddit unavailable — set secrets for live data.",
    });
  }

  try {
    const yt = await scoreYouTube("Android 17 should you update");
    breakdown.push({ source: "YouTube reviewers", weight: 15, score: yt.score, note: yt.note });
  } catch (e) {
    errors.push("youtube-android: " + e.message);
    breakdown.push({
      source: "YouTube reviewers",
      weight: 15,
      score: 72,
      note: "YouTube unavailable — set YOUTUBE_API_KEY for live data.",
    });
  }

  breakdown.push({
    source: "Security bulletin cadence",
    weight: 10,
    score: 80,
    note: "Monthly security patches are high value on Android.",
  });
  breakdown.push({
    source: "Historical OEM lag",
    weight: 10,
    score: 55,
    note: "First OEM skin drops sometimes need a hotfix week.",
  });

  const overall = weightedAverage(breakdown);
  applyProbability(feed.android, breakdown, {
    adviceByTier: feed.android.updateProbability?.adviceByTier,
    sentimentLabel: labelForScore(overall, "Android"),
    sentimentSummary:
      overall >= 80
        ? "Android signals are strong on Pixel / recent flagships."
        : overall >= 65
          ? "Mostly positive; OEM rollouts can lag — wait a few days on brand-new skins."
          : "Mixed — prioritise security patches if the major version is early on your OEM.",
  });
}

async function main() {
  const feed = JSON.parse(readFileSync(BASE_PATH, "utf8"));
  const errors = [];

  if (!feed.ios || !feed.android) {
    console.error("Base JSON must contain ios and android keys");
    process.exit(1);
  }

  await buildIos(feed, errors);
  await buildAndroid(feed, errors);

  feed.generatedAt = new Date().toISOString().slice(0, 10);
  feed.refreshedAt = new Date().toISOString();
  feed.refreshMeta = {
    runner: "github-actions",
    errors,
    hash: createHash("sha256").update(JSON.stringify(feed.updateProbability || {})).digest("hex").slice(0, 12),
  };

  writeFileSync(OUT_PATH, JSON.stringify(feed, null, 2) + "\n");
  console.log("Wrote", OUT_PATH);
  console.log("iOS score:", feed.ios.updateProbability?.overallScore);
  console.log("Android score:", feed.android.updateProbability?.overallScore);
  if (errors.length) console.log("Soft errors:", errors);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
