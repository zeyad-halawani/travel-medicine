/**
 * Browser regression. Run: node tests/ui-regression.mjs
 * Chrome is required. Firefox is attempted when present.
 */
import { createServer } from "http";
import { readFileSync, statSync, mkdirSync } from "fs";
import { dirname, join, extname } from "path";
import { fileURLToPath } from "url";

const puppeteerMod = await import("puppeteer-core").catch(async () => {
  return import("/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js");
});
const puppeteer = puppeteerMod.default || puppeteerMod;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chrome = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";
const shots = "/opt/cursor/artifacts";
mkdirSync(shots, { recursive: true });
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const fail = [];
const check = (name, ok, extra) => {
  if (!ok) fail.push(name + (extra ? " " + extra : ""));
  else process.stdout.write("ok  " + name + "\n");
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split("?")[0]);
  const rel = path === "/" ? "/index.html" : path.replace(/^\/travel-medicine/, "") || "/index.html";
  const file = join(root, rel);
  if (!file.startsWith(root)) {
    res.writeHead(403); res.end("no"); return;
  }
  try {
    const body = readFileSync(file);
    statSync(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("no");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

async function launch(executablePath) {
  return puppeteer.launch({
    executablePath,
    headless: "new",
    protocolTimeout: 30000,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

const browser = await launch(chrome);

async function open(url, width, height) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0", timeout: 20000 });
  await page.waitForSelector("#map path", { timeout: 10000 });
  return { page, errors };
}

const widths = [360, 390, 768, 1280];
for (const w of widths) {
  const { page, errors } = await open(base + "/", w, w < 500 ? 740 : 900);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("no horizontal overflow " + w, overflow <= 2, String(overflow));
  check("no page error " + w, errors.length === 0, errors.join(";"));
  await page.close();
}

{
  const { page, errors } = await open(base + "/?stops=SAU.2026-12-01.2026-12-10.umrah.0&lang=ar&age=18to59y&p=preg", 390, 844);
  const state = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    h3: document.querySelector("#dest-SAU h3")?.textContent || "",
    disc: document.querySelector("#discDetails").hidden,
    preg: document.querySelector("#pregnant").checked,
  }));
  check("arabic rtl", state.lang === "ar" && state.dir === "rtl", state.lang);
  check("shared url loads Saudi", /السعود|Saudi/.test(state.h3), state.h3);
  check("disclaimer starts compact", state.disc === true);
  check("pregnancy from url", state.preg === true);
  await page.click("#discToggle");
  check("disclaimer expands", await page.$eval("#discToggle", (el) => el.getAttribute("aria-expanded")) === "true");
  await page.click("#discDismiss");
  check("reopen remains", await page.$eval("#discReopen", (el) => el.hidden) === false);
  check("country remains after dismiss", (await page.$("#dest-SAU")) !== null);
  await page.click("#discReopen");
  check("banner returns", await page.$eval("#safetyBanner", (el) => el.hidden) === false);
  await page.screenshot({ path: join(shots, "mobile-ar-umrah.png"), fullPage: true });
  check("mobile ar shot", true);
  check("no error ar mobile", errors.length === 0, errors.join(";"));
  await page.close();
}

{
  const { page, errors } = await open(base + "/", 1280, 900);
  await page.type("#q", "إثيوبيا");
  await page.waitForSelector("#searchList li");
  await page.click("#searchList li");
  await page.type("#q", "kenya");
  await page.waitForSelector("#searchList li");
  await page.keyboard.press("Enter");
  const names = await page.$$eval("#stops article strong", (els) => els.map((el) => el.textContent));
  check("arabic search adds Ethiopia", names.some((n) => /Ethiopia|إثيوبيا/.test(n)), names.join(","));
  check("keyboard search adds Kenya", names.some((n) => /Kenya|كينيا/.test(n)), names.join(","));
  await page.$eval("#stop-ETH input[data-field=arrive]", (el) => { el.value = "2026-12-20"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.click(".tab[data-tab=vax]");
  await page.waitForSelector(".task");
  const vax = await page.$eval("#planBody", (el) => el.innerText);
  check("timeline mentions yellow fever", /Yellow fever/i.test(vax), vax.slice(0, 180));
  await page.click("#pregnant");
  await page.click(".tab[data-tab=mal]");
  await page.waitForSelector(".drug.avoid");
  const avoided = await page.$$eval(".drug.avoid strong", (els) => els.map((el) => el.textContent));
  check("pregnancy avoids doxycycline", avoided.some((n) => /Doxycycline/.test(n)), avoided.join(","));
  await page.click(".tab[data-tab=check]");
  check("checklist fever", /Fever during/.test(await page.$eval("#planBody", (el) => el.innerText)));
  await page.click(".tab[data-tab=hand]");
  const hand = await page.$eval("#planBody", (el) => el.innerText);
  check("handout both languages", /Draft counseling aid/.test(hand) && /ورقة المسافر/.test(hand));
  await page.screenshot({ path: join(shots, "desktop-en-itinerary.png"), fullPage: true });
  await page.emulateMediaType("print");
  await page.screenshot({ path: join(shots, "print-handout.png"), fullPage: true });
  check("no error desktop flow", errors.length === 0, errors.join(";"));
  await page.close();
}

{
  const { page, errors } = await open(base + "/?stops=ETH.2026-12-01.2026-12-08.tourism.1~SAU.2026-12-09.2026-12-20.hajj.0&lang=en&from=ETH", 1280, 900);
  await page.click(".tab[data-tab=check]");
  const text = await page.$eval("#planBody", (el) => el.innerText);
  check("hajj edition visible", /1447H/.test(text) && /1448H\/2027/.test(text));
  check("ethiopia origin yf and polio tables", /older than 9 months/.test(text) && /Table B/.test(text));
  check("no error hajj", errors.length === 0, errors.join(";"));
  await page.screenshot({ path: join(shots, "desktop-en-hajj.png"), fullPage: true });
  await page.close();
}

await browser.close();

let firefox = "";
for (const candidate of ["/usr/bin/firefox", "/usr/bin/firefox-esr"]) {
  try { statSync(candidate); firefox = candidate; } catch { /* absent */ }
}
if (firefox) {
  const fox = await launch(firefox);
  const page = await fox.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(base + "/", { waitUntil: "networkidle0", timeout: 20000 });
  await page.waitForSelector("#map path", { timeout: 10000 });
  check("firefox loads map", (await page.$$("#map path")).length > 100);
  check("firefox no page error", errors.length === 0, errors.join(";"));
  await page.screenshot({ path: join(shots, "firefox-desktop.png") });
  await fox.close();
} else {
  console.log("firefox not installed; chrome-only UI run");
}

server.close();
if (fail.length) {
  console.error("FAILED\n" + fail.map((f) => " - " + f).join("\n"));
  process.exit(1);
}
console.log("ui-regression passed");
