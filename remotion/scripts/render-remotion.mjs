import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const frameRange = process.env.FRAME_RANGE
  ? process.env.FRAME_RANGE.split("-").map(Number)
  : null;
const outFile = process.env.OUT_FILE || "/mnt/documents/clienteling-demo-launch.mp4";

console.log("[render] bundling…");
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

console.log("[render] launching browser…");
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

console.log("[render] selecting composition…");
const composition = await selectComposition({
  serveUrl: bundled,
  id: "main",
  puppeteerInstance: browser,
});

console.log(`[render] rendering → ${outFile}${frameRange ? ` frames ${frameRange[0]}-${frameRange[1]}` : ""}`);
const start = Date.now();
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: outFile,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 2,
  frameRange: frameRange ?? undefined,
  onProgress: ({ progress }) => {
    if (Math.round(progress * 100) % 5 === 0) {
      process.stdout.write(`\r[render] ${Math.round(progress * 100)}%`);
    }
  },
});
console.log(`\n[render] done in ${((Date.now() - start) / 1000).toFixed(1)}s`);

await browser.close({ silent: false });