import fs from "fs";
import path from "path";
import fetch from "node-fetch"; // Node <18; skip if using Node 18+
import dotenv from "dotenv";

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("Error: GITHUB_TOKEN not set in .env");
  process.exit(1);
}

const API_BASE = "https://api.github.com/repos/QuestPackageManager/bsqmods/contents/mods";
const RAW_BASE = "https://raw.githubusercontent.com/QuestPackageManager/bsqmods/main/mods";

// Cache settings
const CACHE_DIR = "scripts/cache";
const CACHE_FILE = path.join(CACHE_DIR, "bsqmods.json");
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${GITHUB_TOKEN}`
    }
  });

  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchRawJSON(url) {
  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${GITHUB_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function main() {
  // Check cache first
  if (fs.existsSync(CACHE_FILE)) {
    const { timestamp, data } = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    if (Date.now() - timestamp < CACHE_TTL) {
      console.log("Using cached index");
      fs.mkdirSync(path.join("public", "mods"), { recursive: true });
      fs.writeFileSync(path.join("public", "mods", "index.json"), JSON.stringify(data, null, 2));
      return;
    }
  }

  const index = {};
  console.log("Fetching version folders from BSQMods...");

  let versions;
  try {
    versions = await fetchJSON(API_BASE);
  } catch (err) {
    console.error("Error fetching versions:", err);
    return;
  }

  if (!Array.isArray(versions)) {
    console.error("Versions response is not an array:", versions);
    return;
  }

  for (const versionDir of versions) {
    if (versionDir.type !== "dir") continue;

    const version = versionDir.name;
    index[version] = [];
    console.log(`Processing version: ${version}`);

    let files;
    try {
      files = await fetchJSON(versionDir.url);
    } catch (err) {
      console.warn(`Skipping version ${version}: ${err}`);
      continue;
    }

    if (!Array.isArray(files)) {
      console.warn(`Skipping version ${version}: folder contents not an array`);
      continue;
    }

    // Fetch all mods in parallel
    const modPromises = files
      .filter(f => f.type === "file" && f.name.endsWith(".json"))
      .map(async file => {
        const rawURL = `${RAW_BASE}/${version}/${file.name}`;
        try {
          const mod = await fetchRawJSON(rawURL);
          console.log(`  - Added mod: ${mod.name}`);
          return mod;
        } catch (err) {
          console.warn(`  Failed to fetch mod ${file.name}: ${err}`);
          return null;
        }
      });

    const mods = await Promise.all(modPromises);
    index[version] = mods.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Sort versions
  const sortedIndex = Object.keys(index)
    .sort()
    .reduce((acc, v) => {
      acc[v] = index[v];
      return acc;
    }, {});

  // Write to public/mods/index.json
  const outPath = path.join("public", "mods", "index.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(sortedIndex, null, 2));

  // Update cache
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), data: sortedIndex }, null, 2));

  console.log("✔ index.json generated successfully!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
