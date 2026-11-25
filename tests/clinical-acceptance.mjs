/**
 * Clinical checks against the rebuilt data and rules.
 * Run: node tests/clinical-acceptance.mjs
 * These do not certify every sentence on all 182 cards.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assessDrug, defaultProfile, malariaOptions, yfPlan } from "../js/clinical.js";
import { HAJJ } from "../js/reference.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const records = JSON.parse(readFileSync(join(root, "data/destinations.json"), "utf8"));
const html = readFileSync(join(root, "index.html"), "utf8");
const app = readFileSync(join(root, "js/app.js"), "utf8");
const clinical = readFileSync(join(root, "js/clinical.js"), "utf8");
const reference = readFileSync(join(root, "js/reference.js"), "utf8");
const by = Object.fromEntries(records.map((c) => [c.iso, c]));
const failures = [];
const check = (name, ok) => { if (!ok) failures.push(name); };

check("182 records", records.length === 182);
check("arabic names", records.every((c) => c.name_ar && c.name_ar.length > 1));
check("no fully unreviewed records", records.filter((c) => c.status === "unreviewed").length === 0);
check("eleven partial records", records.filter((c) => c.status === "partial").length === 11);
check("partial set", ["BTN", "TUR", "IRQ", "OMN", "SYR", "PSE", "HKG", "TTO", "PRI", "NCL", "PYF"].every((iso) => by[iso].status === "partial"));
check("171 cdc-page reads", records.filter((c) => c.status === "reviewed").length === 171);
check("reviewed pages have a read date", records.filter((c) => c.status === "reviewed").every((c) => c.checkedAt === "2026-11-24" && c.cdcUrl));

for (const iso of ["LKA", "CHN", "BLZ", "PRY", "TLS", "SUR"]) {
  check(iso + " malaria none", by[iso].malaria.band === "none");
  check(iso + " no routine drug", !(by[iso].malaria.drugs || []).length);
}
check("SUR who 2025", by.SUR.whoMalaria && by.SUR.whoMalaria.certified === "2025");
check("CHN who 2021", by.CHN.whoMalaria && by.CHN.whoMalaria.certified === "2021");
check("LKA who 2016", by.LKA.whoMalaria && by.LKA.whoMalaria.certified === "2016");
check("TLS who 2025", by.TLS.whoMalaria && by.TLS.whoMalaria.certified === "2025");
check("SAU not nationwide none", by.SAU.malaria.band !== "none" && /Asir and Jazan/.test(by.SAU.malaria.areas) && /Mecca/.test(by.SAU.malaria.areas));
check("SAU chloroquine resistance", by.SAU.malaria.chloroquineResistance === true);
check("IRN border drugs not chloroquine-only", by.IRN.malaria.chloroquineResistance === true && !by.IRN.malaria.drugs.includes("chloroquine") && /Sistan-Baluchestan/.test(by.IRN.malaria.prophylaxis));
check("THA not AP only and no mefloquine", !/ONLY/.test(by.THA.malaria.prophylaxis) && by.THA.malaria.mefloquineResistance === true && !by.THA.malaria.drugs.includes("mefloquine") && /Malaysia/.test(by.THA.malaria.areas));
check("KHM not exclusive AP", !/ONLY/.test(by.KHM.malaria.prophylaxis) && /primaquine/.test(by.KHM.malaria.prophylaxis));
check("NPL 2000 m and Kathmandu", /2,000/.test(by.NPL.malaria.areas) && /Kathmandu/.test(by.NPL.malaria.areas));
check("ZAF districts", /uMkhanyakude/.test(by.ZAF.malaria.prophylaxis) && /Kruger/.test(by.ZAF.malaria.prophylaxis));
check("PER entry not required", /not required/i.test(by.PER.yellowFever.entry));
check("NGA not all arrivals", !/all arriving/i.test(by.NGA.yellowFever.entry) && /recommended for all travelers/i.test(by.NGA.yellowFever.recommendation));
check("TZA generally not", /generally not recommended/i.test(by.TZA.yellowFever.recommendation));
check("RWA generally not", /generally not recommended/i.test(by.RWA.yellowFever.recommendation));
check("KEN has no 12-hour clause", !/12-hour/.test(by.KEN.yellowFever.entry) && /≥1 year/.test(by.KEN.yellowFever.entry));
check("ETH 12-hour stays on Ethiopia", /12-hour/.test(by.ETH.yellowFever.entry) && /Afar or Somali/.test(by.ETH.yellowFever.recommendation));
check("ETH Addis 2500", /2,500/.test(by.ETH.malaria.areas) && /Addis Ababa/.test(by.ETH.malaria.prophylaxis));
check("PAK all cities", /including all cities/.test(by.PAK.malaria.areas) && /2,500/.test(by.PAK.malaria.areas));
check("IDN Bali resorts no malaria and not the whole island", /resort areas of Bali/.test(by.IDN.malaria.areas) && /Ubud/.test(by.IDN.malaria.areas));
check("AUS JE localized", /Murray River/.test(by.AUS.vaccines.find((v) => v.id === "je").lead) && /Torres Strait/.test(by.AUS.vaccines.find((v) => v.id === "je").lead));
check("BOL cdc all arrivals", /all arriving travelers ≥1 year/.test(by.BOL.yellowFever.entry));
check("BOL conflict copy", /These sources differ/.test(clinical) && /يختلفان/.test(clinical));
check("IND not a rural-only claim", /Throughout the country/.test(by.IND.malaria.areas) && /Mumbai/.test(by.IND.malaria.areas));
check("PSE gap not a fake page", by.PSE.cdcUrl === null && /West Bank and Gaza/.test(by.PSE.gap));
check("no AP only order", !/atovaquone-proguanil only/i.test(JSON.stringify(records)));
check("no live-vaccine YF ban phrase", !app.includes("Live vaccines contraindicated: Yellow Fever") && !clinical.includes("Live vaccines contraindicated: Yellow Fever"));
check("no COVID by origin shortcut", !html.includes("COVID-19 by country of origin") && !app.includes("COVID-19 by country of origin"));
check("no May 2026 stamp", !/current as of May 2026/i.test(html + app));
check("no DEET threshold", !html.includes("DEET≥30") && !app.includes("DEET≥30"));
check("no standby azithromycin kit", !app.includes("Standby Azithromycin"));
check("rabies 0 and 7", app.includes("doses on days 0 and 7"));
check("disclaimer short EN", html.includes("Educational reference—not a prescription. Verify the traveler’s needs and current entry rules."));
check("disclaimer short AR", html.includes("مرجع تعليمي، لا يُعد وصفة طبية. تحقّق من احتياجات المسافر واشتراطات الدخول السارية."));
check("disclaimer expanded", html.includes("This map supports, but does not replace, an individualized pre-travel consultation."));
check("1447 not sold as 1448", reference.includes("1447H (2026)") && reference.includes("1448H/2027") && !reference.includes("edition: \"1448"));
check("hajj polio A", ["AFG", "PAK", "MOZ", "COD", "GIN"].every((iso) => HAJJ.polioA.includes(iso)));
check("egypt polio advice but not yf arrival", HAJJ.polioAdvice.includes("EGY") && !HAJJ.yfArrival.includes("EGY"));
check("ethiopia on yf and polio B", HAJJ.yfArrival.includes("ETH") && HAJJ.polioB.includes("ETH"));

const preg = { ...defaultProfile(), pregnant: true, age: "18to59y" };
const eth = malariaOptions(preg, by.ETH);
const doxy = eth.options.find((d) => d.id === "doxycycline");
const ap = eth.options.find((d) => d.id === "atovaquone-proguanil");
const taf = eth.options.find((d) => d.id === "tafenoquine");
const mef = eth.options.find((d) => d.id === "mefloquine");
check("pregnant ETH doxy avoid", doxy && doxy.state === "avoid");
check("pregnant ETH tafenoquine avoid", taf && taf.state === "avoid");
check("pregnant ETH AP not a plain option", ap && ap.state === "caution");
check("pregnant ETH mefloquine not auto-avoid", mef && mef.state !== "avoid");
const tha = malariaOptions(preg, by.THA);
check("pregnant THA mefloquine unlisted or avoid", !tha.options.some((d) => d.id === "mefloquine" && d.state === "option"));
const child = { ...defaultProfile(), age: "2to7y" };
check("child doxy avoid", assessDrug("doxycycline", child, by.ETH.malaria).state === "avoid");
const yfPreg = yfPlan(preg, by.ETH);
check("YF pregnancy is precaution text", yfPreg.blocks.some((b) => /precaution, not an absolute/.test(b.en)));
check("infant YF contraindication", yfPlan({ ...defaultProfile(), age: "under6m" }, by.ETH).blocks.some((b) => /under 6 months/.test(b.en)));

if (failures.length) {
  console.error("FAILED\n" + failures.map((f) => " - " + f).join("\n"));
  process.exit(1);
}
console.log(`clinical-acceptance: ${records.length} records, reviewed ${records.filter((c) => c.status === "reviewed").length}, partial ${records.filter((c) => c.status === "partial").length}, unreviewed 0`);
