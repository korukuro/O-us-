const PLATFORMS = [
  { host: "leetcode.com", name: "LeetCode", seg: "problems" },
  { host: "geeksforgeeks.org", name: "GfG", seg: "problems" },
  { host: "codeforces.com", name: "Codeforces", seg: null },
  { host: "interviewbit.com", name: "InterviewBit", seg: null },
  { host: "hackerrank.com", name: "HackerRank", seg: "challenges" },
];

const SMALL = ["of", "the", "a", "in", "to", "and"];

function titleCase(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => (SMALL.includes(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

export function parseProblemUrl(raw) {
  try {
    const u = new URL(raw.trim());
    const p = PLATFORMS.find((x) => u.hostname.includes(x.host));
    const parts = u.pathname.split("/").filter(Boolean);

    let slug = parts[parts.length - 1] || "";
    if (p?.seg) {
      const i = parts.indexOf(p.seg);
      if (i >= 0 && parts[i + 1]) slug = parts[i + 1];
    }
    slug = slug.replace(/\.(html?|php)$/, "");
    if (!slug) return null;

    return {
      slug,
      title: titleCase(slug),
      platform: p?.name || u.hostname.replace("www.", ""),
    };
  } catch {
    return null; // not a valid URL
  }
}