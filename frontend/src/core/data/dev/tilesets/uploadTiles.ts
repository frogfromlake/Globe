import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import pLimit from "p-limit";
import retry from "async-retry";
import https from "https";
import cliProgress from "cli-progress";

// Resolve __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.upload
dotenv.config({ path: path.resolve(__dirname, ".env.upload") });

const API_KEY = process.env.BUNNY_STORAGE_API_KEY;
const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const STORAGE_REGION = process.env.BUNNY_STORAGE_REGION;

if (!API_KEY || !STORAGE_ZONE || !STORAGE_REGION) {
  console.error("❌ Missing required env vars");
  process.exit(1);
}

// Local tile directories to upload
const UPLOAD_DIRS = [
  {
    label: "📦 KTX2 tiles",
    dir: path.resolve(__dirname, "tiles"),
  },
];

// Optional custom CA certificate (e.g. Zscaler)
const caCertPath = path.resolve(process.env.HOME || "~", "zscaler-ca.pem");
const httpsAgent = fs.existsSync(caCertPath)
  ? new https.Agent({
      keepAlive: true,
      ca: fs.readFileSync(caCertPath),
    })
  : new https.Agent({ keepAlive: true });

function walkDir(currentPath: string): string[] {
  const files: string[] = [];
  for (const name of fs.readdirSync(currentPath)) {
    if (name.startsWith(".")) continue;
    const fullPath = path.join(currentPath, name);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function uploadFile(filePath: string, relativePath: string) {
  const url = `https://${STORAGE_REGION}/${STORAGE_ZONE}/${relativePath}`;
  const headers = {
    AccessKey: API_KEY,
    "Content-Type": "application/octet-stream",
  };

  await retry(
    async () => {
      const stream = fs.createReadStream(filePath);
      await axios.put(url, stream, { headers, httpsAgent });
    },
    {
      retries: 5,
      minTimeout: 500,
      maxTimeout: 5000,
      factor: 2,
      onRetry: (err: any, attempt: number) => {
        console.warn(`🔁 Retry ${attempt} for ${relativePath}: ${err.message}`);
      },
    }
  );
}

async function uploadDirectory(label: string, localDir: string) {
  console.log(`\n📂 Uploading ${label} from: ${localDir}`);
  const allFiles = walkDir(localDir);

  const limit = pLimit(20);
  const progressBar = new cliProgress.SingleBar(
    {
      format: `${label} |{bar}| {value}/{total} files`,
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );

  progressBar.start(allFiles.length, 0);

  const tasks = allFiles.map((filePath) => {
    const relativePath = path.relative(localDir, filePath).replace(/\\/g, "/");
    return limit(async () => {
      await uploadFile(filePath, relativePath);
      progressBar.increment();
    });
  });

  await Promise.all(tasks);
  progressBar.stop();
  console.log(`✅ Finished uploading: ${label}`);
}

// Main
(async () => {
  for (const { label, dir } of UPLOAD_DIRS) {
    await uploadDirectory(label, dir);
  }
  console.log("\n🚀 All tilesets uploaded to Bunny CDN.");
})();
