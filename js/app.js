import { I18N, AGES } from "./i18n.js";
import { ACCESS, EXTRA_ORIGINS, HAJJ, SOURCES, STANDING } from "./reference.js";
import {
  boliviaConflict,
  checklist,
  defaultProfile,
  hajjMatch,
  jeSchedule,
  malariaOptions,
  noticesFor,
  profileAlerts,
  rabiesSchedule,
  todayIso,
  vaccineTasks,
  whoMalariaText,
  yfPlan,
} from "./clinical.js";

const $ = (sel) => document.querySelector(sel);
const langOf = () => document.documentElement.lang === "ar" ? "ar" : "en";
const t = (key) => I18N[langOf()][key] || key;

const state = {
  stops: [],
  profile: defaultProfile(),
  origin: "",
  focus: "",
  drug: {},
  je: false,
  rabies: false,
  records: [],
  byIso: {},
  world: null,
};

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

const ISO2 = {
  NGA: "NG", KEN: "KE", TZA: "TZ", ETH: "ET", COD: "CD", GHA: "GH", ZAF: "ZA", TUN: "TN", MAR: "MA", EGY: "EG",
  UGA: "UG", SEN: "SN", CIV: "CI", ZMB: "ZM", ZWE: "ZW", BWA: "BW", MOZ: "MZ", RWA: "RW", IND: "IN", NPL: "NP",
  PAK: "PK", LKA: "LK", BGD: "BD", BTN: "BT", THA: "TH", VNM: "VN", IDN: "ID", PHL: "PH", KHM: "KH", MMR: "MM",
  LAO: "LA", MYS: "MY", CHN: "CN", JPN: "JP", KOR: "KR", BRA: "BR", PER: "PE", COL: "CO", BOL: "BO", ECU: "EC",
  ARG: "AR", CHL: "CL", VEN: "VE", MEX: "MX", CRI: "CR", PAN: "PA", GTM: "GT", CUB: "CU", DOM: "DO", HTI: "HT",
  JAM: "JM", SAU: "SA", ARE: "AE", YEM: "YE", JOR: "JO", IRN: "IR", TUR: "TR", IRQ: "IQ", GBR: "GB", FRA: "FR",
  DEU: "DE", ITA: "IT", ESP: "ES", USA: "US", CAN: "CA", AUS: "AU", NZL: "NZ", RUS: "RU", PNG: "PG", FJI: "FJ",
  PRT: "PT", IRL: "IE", NLD: "NL", BEL: "BE", LUX: "LU", CHE: "CH", AUT: "AT", DNK: "DK", NOR: "NO", SWE: "SE",
  FIN: "FI", ISL: "IS", GRC: "GR", MLT: "MT", CYP: "CY", POL: "PL", CZE: "CZ", SVK: "SK", HUN: "HU", ROU: "RO",
  BGR: "BG", HRV: "HR", SVN: "SI", SRB: "RS", BIH: "BA", MNE: "ME", MKD: "MK", ALB: "AL", UKR: "UA", BLR: "BY",
  LTU: "LT", LVA: "LV", EST: "EE", MDA: "MD", GEO: "GE", ARM: "AM", AZE: "AZ", KAZ: "KZ", UZB: "UZ", TKM: "TM",
  KGZ: "KG", TJK: "TJ", AFG: "AF", MNG: "MN", KWT: "KW", QAT: "QA", BHR: "BH", OMN: "OM", LBN: "LB", SYR: "SY",
  ISR: "IL", PSE: "PS", MLI: "ML", NER: "NE", BFA: "BF", TCD: "TD", SDN: "SD", SSD: "SS", CMR: "CM", CAF: "CF",
  GIN: "GN", SLE: "SL", LBR: "LR", TGO: "TG", BEN: "BJ", GAB: "GA", COG: "CG", AGO: "AO", MWI: "MW", BDI: "BI",
  GMB: "GM", GNB: "GW", MRT: "MR", SOM: "SO", ERI: "ER", DJI: "DJ", NAM: "NA", MDG: "MG", LSO: "LS", SWZ: "SZ",
  MUS: "MU", SYC: "SC", CPV: "CV", COM: "KM", DZA: "DZ", LBY: "LY", MDV: "MV", BRN: "BN", SGP: "SG", TLS: "TL",
  TWN: "TW", HKG: "HK", PRK: "KP", NIC: "NI", HND: "HN", SLV: "SV", BLZ: "BZ", PRY: "PY", URY: "UY", GUY: "GY",
  SUR: "SR", TTO: "TT", BRB: "BB", BHS: "BS", PRI: "PR", SLB: "SB", VUT: "VU", WSM: "WS", TON: "TO", NCL: "NC",
  PYF: "PF", KIR: "KI"
};

function flagEmoji(iso) {
  const iso2 = ISO2[iso];
  if (!iso2) return "🌐";
  return [...iso2].map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))).join("");
}

const TOPIC_CHIP = {
  je: ["Japanese encephalitis", "التهاب الدماغ الياباني"],
  rabies: ["Rabies", "السعار"],
  dengue: ["Dengue", "ضنك"],
  schisto: ["Schistosomiasis", "بلهارسيا"],
  cholera: ["Cholera", "كوليرا"],
  chik: ["Chikungunya", "شيكونغونيا"],
  typhoid: ["Typhoid", "تيفوئيد"],
  men: ["Meningococcal", "مكورات سحائية"],
  polio: ["Polio", "شلل الأطفال"],
  tbe: ["Tick-borne encephalitis", "التهاب الدماغ المنقول بالقراد"]
};

const BAND_AR = { present: "مناطق مذكورة", limited: "محدودة", none: "بلا وقاية روتينية", unknown: "غير محسومة" };

function showStep(n) {
  state.step = n;
  for (let i = 1; i <= 3; i += 1) {
    const panel = document.getElementById(`panel${i}`);
    const btn = document.getElementById(`stepBtn${i}`);
    if (!panel || !btn) return;
    const on = i === n;
    panel.hidden = !on;
    btn.classList.toggle("is-on", on);
    btn.classList.toggle("is-done", i < n);
    btn.setAttribute("aria-current", on ? "step" : "false");
  }
  const bar = document.getElementById("progressBar");
  const meter = document.getElementById("progress");
  if (bar) bar.style.width = `${(n / 3) * 100}%`;
  if (meter) meter.setAttribute("aria-valuenow", String(n));
}

function applyTheme(theme) {
  if (theme === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  const btn = document.getElementById("themeToggle");
  if (btn) {
    const dark = theme === "dark";
    btn.setAttribute("aria-pressed", String(dark));
    btn.textContent = dark ? t("light") : t("dark");
  }
  try { localStorage.setItem("tm-theme", theme); } catch { /* private mode */ }
}

function norm(s) {
  return String(s || "").toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ً-ْ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameOf(rec) {
  return langOf() === "ar" ? (rec.name_ar || rec.name) : rec.name;
}

function statusLabel(status) {
  if (status === "reviewed") return t("reviewed");
  if (status === "partial") return t("partial");
  return t("unreviewed");
}

function save() {
  const data = {
    stops: state.stops,
    profile: state.profile,
    origin: state.origin,
    focus: state.focus,
    drug: state.drug,
    je: state.je,
    rabies: state.rabies,
    lang: langOf(),
  };
  sessionStorage.setItem("tm-consult-v1", JSON.stringify(data));
}

function readProfile() {
  const p = state.profile;
  p.age = $("#age").value;
  p.pregnant = $("#pregnant").checked;
  p.planningPregnancy = $("#planning").checked;
  p.breastfeedingUnder5kg = $("#breast").checked;
  p.immune = $("#immune").value;
  p.seizure = $("#seizure").checked;
  p.psych = $("#psych").checked;
  p.conduction = $("#conduction").checked;
  p.g6pd = $("#g6pd").value;
  p.psoriasis = $("#psoriasis").checked;
  p.renal = $("#renal").checked;
  p.liver = $("#liver").checked;
  p.priorYf = $("#priorYf").checked;
  p.priorMen = $("#priorMen").checked;
  p.menDate = $("#menDate").value;
  p.menType = $("#menType").value;
  p.priorHepa = $("#priorHepa").checked;
  p.priorTyphoid = $("#priorTyphoid").checked;
  p.priorRabies = $("#priorRabies").checked;
  p.priorMmr = $("#priorMmr").checked;
  state.origin = $("#origin").value;
  state.je = $("#jeOpt").checked;
  state.rabies = $("#rabiesOpt").checked;
}

function writeProfile() {
  const p = state.profile;
  $("#age").value = p.age;
  $("#pregnant").checked = p.pregnant;
  $("#planning").checked = p.planningPregnancy;
  $("#breast").checked = p.breastfeedingUnder5kg;
  $("#immune").value = p.immune;
  $("#seizure").checked = p.seizure;
  $("#psych").checked = p.psych;
  $("#conduction").checked = p.conduction;
  $("#g6pd").value = p.g6pd;
  $("#psoriasis").checked = p.psoriasis;
  $("#renal").checked = p.renal;
  $("#liver").checked = p.liver;
  $("#priorYf").checked = p.priorYf;
  $("#priorMen").checked = p.priorMen;
  $("#menDate").value = p.menDate || "";
  $("#menType").value = p.menType || "unknown";
  $("#priorHepa").checked = p.priorHepa;
  $("#priorTyphoid").checked = p.priorTyphoid;
  $("#priorRabies").checked = p.priorRabies;
  $("#priorMmr").checked = p.priorMmr;
  $("#origin").value = state.origin || "";
  $("#jeOpt").checked = state.je;
  $("#rabiesOpt").checked = state.rabies;
}

function applyLang(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.title = I18N[lang].title;
  $("#langEn").setAttribute("aria-pressed", String(lang === "en"));
  $("#langAr").setAttribute("aria-pressed", String(lang === "ar"));
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = I18N[lang][key] || "";
  });
  $("#q").placeholder = I18N[lang].search;
  $("#age").innerHTML = AGES.map(([id, en, ar]) => `<option value="${id}">${esc(lang === "ar" ? ar : en)}</option>`).join("");
  fillOrigin();
  writeProfile();
  renderStops();
  renderPlan();
  paintMap();
  applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  save();
}

function fillOrigin() {
  const lang = langOf();
  const extras = EXTRA_ORIGINS.filter((e) => !state.byIso[e.iso]);
  const rows = [...state.records, ...extras.map((e) => ({ ...e, name_ar: e.name_ar, aliases: [] }))];
  rows.sort((a, b) => nameOf(a).localeCompare(nameOf(b), lang));
  const current = state.origin;
  $("#origin").innerHTML = `<option value="">${esc(t("originNone"))}</option>` + rows.map((r) => `<option value="${esc(r.iso)}">${esc(nameOf(r))}</option>`).join("");
  $("#origin").value = current;
}

function addStop(iso) {
  if (!state.byIso[iso]) return;
  if (state.stops.some((s) => s.iso === iso)) {
    state.focus = iso;
  } else {
    state.stops.push({ iso, arrive: "", leave: "", purpose: "tourism", ascent: false });
    state.focus = iso;
  }
  $("#q").value = "";
  $("#searchList").hidden = true;
  renderStops();
  renderPlan();
  paintMap();
  save();
  const card = document.getElementById(`stop-${iso}`);
  if (card) card.querySelector("input")?.focus();
}

function renderStops() {
  const host = $("#stops");
  if (!state.stops.length) {
    host.innerHTML = `<p class="muted">${esc(t("empty"))}</p>`;
    return;
  }
  host.innerHTML = state.stops.map((s) => {
    const rec = state.byIso[s.iso];
    return `<article class="stop ${state.focus === s.iso ? "is-focus" : ""}" id="stop-${esc(s.iso)}">
      <header><strong><span class="flag" aria-hidden="true">${flagEmoji(s.iso)}</span> ${esc(nameOf(rec))}</strong><button type="button" data-remove="${esc(s.iso)}">${esc(t("remove"))}</button></header>
      <label>${esc(t("arrive"))}<input type="date" data-field="arrive" data-iso="${esc(s.iso)}" value="${esc(s.arrive)}"></label>
      <label>${esc(t("leave"))}<input type="date" data-field="leave" data-iso="${esc(s.iso)}" value="${esc(s.leave)}"></label>
      <label>${esc(t("purpose"))}<select data-field="purpose" data-iso="${esc(s.iso)}">
        ${["tourism", "vfr", "work", "hajj", "umrah"].map((p) => `<option value="${p}" ${s.purpose === p ? "selected" : ""}>${esc(t(p))}</option>`).join("")}
      </select></label>
      <label class="check"><input type="checkbox" data-field="ascent" data-iso="${esc(s.iso)}" ${s.ascent ? "checked" : ""}> ${esc(t("ascent"))}</label>
    </article>`;
  }).join("");
}

function quoteBlock(en, ar) {
  return `<blockquote><p lang="en">${esc(en)}</p><p lang="ar" dir="rtl">${esc(ar || en)}</p></blockquote>`;
}

function sourceLine(rec) {
  const bits = [];
  if (rec.checkedAt) bits.push(langOf() === "ar" ? `قُرئ في ${rec.checkedAt}` : `Read ${rec.checkedAt}`);
  if (rec.pageReviewed) bits.push(langOf() === "ar" ? `آخر مراجعة للصفحة: ${rec.pageReviewed}` : `Page last reviewed: ${rec.pageReviewed}`);
  if (rec.malaria?.sectionUpdated) bits.push(langOf() === "ar" ? `قسم الملاريا: ${rec.malaria.sectionUpdated}` : `Malaria section: ${rec.malaria.sectionUpdated}`);
  if (rec.yellowFever?.sectionUpdated) bits.push(langOf() === "ar" ? `قسم الحمى الصفراء: ${rec.yellowFever.sectionUpdated}` : `Yellow fever section: ${rec.yellowFever.sectionUpdated}`);
  return bits.join(" · ");
}

function destinationCard(rec) {
  const who = whoMalariaText(rec.whoMalaria);
  const notices = noticesFor(rec.iso);
  const yf = yfPlan(state.profile, rec);
  const mal = malariaOptions(state.profile, rec);
  let malariaBody = "";
  if (rec.malaria?.tablePresent) {
    malariaBody = quoteBlock(
      `CDC transmission areas: ${rec.malaria.areas || "—"}. Resistance named: ${rec.malaria.resistance || "—"}. Prophylaxis line: ${rec.malaria.prophylaxis || "—"}. These are options for the areas in that line, not a prescription and not a countrywide order.`,
      `مناطق الانتقال حسب CDC: ${rec.malaria.areas || "—"}. المقاومة المذكورة: ${rec.malaria.resistance || "—"}. سطر الوقاية: ${rec.malaria.prophylaxis || "—"}. هذه خيارات للمناطق المذكورة في السطر، وليست وصفة ولا أمرًا لكل البلد.`
    );
  } else if (who) {
    malariaBody = quoteBlock(
      `${who.en} No malaria prophylaxis table was present on the CDC destination page read ${ACCESS}. A generic packing-list sentence on CDC pages is not used.`,
      `${who.ar} لم يوجد جدول وقاية من الملاريا في صفحة CDC المقروءة ${ACCESS}. لا تُستخدم جملة قائمة الأمتعة العامة في صفحات CDC.`
    );
  } else if (rec.gap) {
    malariaBody = quoteBlock(rec.gap, "لا توجد صفحة وجهة مستقلة لفلسطين في قائمة CDC المقروءة في 24 نوفمبر 2026. تنبيه شلل الأطفال العالمي يسمي الضفة الغربية وغزة. بقية البنود لم تُراجع.");
  } else {
    malariaBody = quoteBlock(
      "Malaria was not established from the CDC table or the WHO malaria-free list. Verify before counseling. Do not start prophylaxis from this card.",
      "لم تُحسم الملاريا من جدول CDC ولا من قائمة WHO للخلو من الملاريا. تحقق قبل المشورة. لا تبدأ وقاية دوائية من هذه البطاقة."
    );
  }
  const vaccines = (rec.vaccines || []).map((v) => `<li><strong>${esc(v.name)}</strong> — ${esc(v.lead)}</li>`).join("");
  const noticeHtml = notices.map((n) => `<li><a href="${esc(n.url)}">${esc(langOf() === "ar" ? n.ar : n.en)}</a></li>`).join("");
  let yfHtml = "";
  if (rec.yellowFever) {
    yfHtml = quoteBlock(
      `CDC recommendation: ${rec.yellowFever.recommendation || "—"}. Entry certificate, as CDC states it: ${rec.yellowFever.entry || "—"}. Recommendation and certificate are separate. Direct-from-United-States wording is CDC’s; confirm the actual origin.`,
      `توصية CDC: ${rec.yellowFever.recommendation || "—"}. شهادة الدخول كما تذكرها CDC: ${rec.yellowFever.entry || "—"}. التوصية والشهادة مسألتان. عبارة القدوم المباشر من الولايات المتحدة صياغة CDC؛ تأكد من بلد القدوم الفعلي.`
    );
  }
  if (rec.iso === "BOL") {
    const b = boliviaConflict();
    yfHtml += `<div class="verify">${quoteBlock(b.en, b.ar)}</div>`;
  }
  const flags = yf.blocks.map((b) => `<p class="flag-note">${esc(langOf() === "ar" ? b.ar : b.en)}</p>`).join("");
  const ar = langOf() === "ar";
  const chipBits = [];
  const band = rec.malaria?.band || "unknown";
  chipBits.push(`<span class="chip mal-${esc(band)}">${esc(ar ? `ملاريا · ${BAND_AR[band] || band}` : `Malaria · ${band}`)}</span>`);
  if (rec.yellowFever?.recommendation) chipBits.push(`<span class="chip yf">${esc(ar ? "حمى صفراء" : "Yellow fever")}</span>`);
  for (const topic of rec.topics || []) {
    const pair = TOPIC_CHIP[topic];
    if (pair) chipBits.push(`<span class="chip ${esc(topic)}">${esc(ar ? pair[1] : pair[0])}</span>`);
  }
  if (notices.length) chipBits.push(`<span class="chip notice">${esc(ar ? "تنبيه" : "Notice")}</span>`);
  const open = state.focus === rec.iso ? " open" : "";
  return `<article class="dest" id="dest-${esc(rec.iso)}">
    <header>
      <span class="flag" aria-hidden="true">${flagEmoji(rec.iso)}</span>
      <div><h3>${esc(nameOf(rec))}</h3>
      <p class="meta">${esc(sourceLine(rec))}${rec.cdcUrl ? ` · <a href="${esc(rec.cdcUrl)}">CDC</a>` : ""}</p></div>
      <span class="badge ${esc(rec.status)}">${esc(statusLabel(rec.status))}</span>
    </header>
    <div class="chips">${chipBits.join("")}</div>
    ${rec.gap ? `<p class="flag-note">${esc(rec.gap)}</p>` : ""}
    ${flags}
    <details${open}>
      <summary>${esc(t("detailsSummary"))}</summary>
      <h4>${ar ? "الملاريا" : "Malaria"}</h4>
      ${malariaBody}
      <p class="meta">${esc(mal.status === "verify" ? t("verify") : mal.status)}</p>
      <h4>${ar ? "الحمى الصفراء" : "Yellow fever"}</h4>
      ${yfHtml || `<p class="muted">${esc(t("verify"))}</p>`}
      ${vaccines ? `<h4>${ar ? "لقاحات مذكورة في الصفحة" : "Vaccines named on the page"}</h4><ul>${vaccines}</ul>` : ""}
      ${noticeHtml ? `<h4>${ar ? "تنبيهات بتاريخها" : "Dated notices"}</h4><ul>${noticeHtml}</ul>` : ""}
    </details>
  </article>`;
}

function renderPlan() {
  const host = $("#planBody");
  const tab = document.querySelector(".tab[aria-selected='true']")?.dataset.tab || "brief";
  if (!state.stops.length) {
    host.innerHTML = `<p class="muted">${esc(t("empty"))}</p>`;
    $("#printSheet").innerHTML = "";
    return;
  }
  const today = todayIso();
  if (tab === "brief") {
    host.innerHTML = state.stops.map((s) => destinationCard(state.byIso[s.iso])).join("")
      + profileAlerts(state.profile).map((a) => `<p class="flag">${esc(langOf() === "ar" ? a.ar : a.en)}</p>`).join("")
      + `<p class="meta"><a href="${esc(STANDING.dengue.url)}">${esc(langOf() === "ar" ? STANDING.dengue.ar : STANDING.dengue.en)}</a></p>`;
  } else if (tab === "vax") {
    host.innerHTML = renderTimeline(today);
  } else if (tab === "mal") {
    host.innerHTML = renderMalaria();
  } else if (tab === "check") {
    host.innerHTML = renderCheck();
  } else {
    host.innerHTML = `<p class="muted">${langOf() === "ar" ? "الورقة ثنائية اللغة في المعاينة أدناه، وتظهر عند الطباعة." : "The bilingual sheet is below and is what printing uses."}</p>` + handoutHtml();
  }
  $("#printSheet").innerHTML = handoutHtml();
}

function renderTimeline(today) {
  const tasks = vaccineTasks(state.profile, state.stops, state.byIso, today);
  const first = state.stops.map((s) => s.arrive).filter(Boolean).sort()[0] || "";
  let extra = "";
  if (state.je) {
    const je = jeSchedule(state.profile, first, today);
    extra += `<article class="task"><h3>${langOf() === "ar" ? "التهاب الدماغ الياباني — IXIARO" : "Japanese encephalitis — IXIARO"}</h3><p>${esc(langOf() === "ar" ? je.ar : je.en)}</p><p class="meta">${esc(SOURCES.je.title)} · ${esc(SOURCES.je.dated)}</p></article>`;
  }
  if (state.rabies && !state.profile.priorRabies) {
    const dates = rabiesSchedule(first);
    extra += `<article class="task"><h3>${langOf() === "ar" ? "السعار قبل التعرض" : "Rabies pre-exposure"}</h3><p>${esc(langOf() === "ar"
      ? `لقاح السعار قبل التعرض وفق جدول CDC/ACIP العضلي: جرعتان في اليومين 0 و7 (${dates.day0 || "—"} ثم ${dates.day7 || "—"}). استمرار الخطر أكثر من 3 سنوات أو نقص المناعة يحتاج تقييمًا إضافيًا. التعرض بعد أكثر من 3 سنوات على سلسلتين دون عيار أو معزز قد يحتاج وقاية كاملة بعد التعرض مع الغلوبولين، لا جرعتين تلقائيًا.`
      : `Rabies pre-exposure vaccination (CDC/ACIP intramuscular schedule): doses on days 0 and 7 (${dates.day0 || "—"} and ${dates.day7 || "—"}). Risk past 3 years, or immune compromise, needs more assessment. An exposure more than 3 years after a 2-dose series, without a titer or booster, may need full post-exposure prophylaxis with immune globulin — not an automatic 2-dose course.`)}</p></article>`;
  }
  if (!tasks.length && !extra) {
    return `<p class="muted">${esc(t("empty"))}</p>`;
  }
  const ordered = [...tasks].sort((a, b) => {
    if (a.when && b.when) return a.when < b.when ? -1 : 1;
    if (a.when) return -1;
    if (b.when) return 1;
    return 0;
  });
  return `<ol class="timeline">${ordered.map((task) => `<li><span class="dot" aria-hidden="true"></span><article class="task"><h3>${esc(langOf() === "ar" ? task.titleAr : task.titleEn)}</h3>
    ${task.when ? `<p class="when">${esc(task.when)}</p>` : ""}
    <p>${esc(langOf() === "ar" ? task.detailAr : task.detailEn)}</p>
    ${(task.blocks || []).map((b) => `<p class="flag-note">${esc(langOf() === "ar" ? b.ar : b.en)}</p>`).join("")}
  </article></li>`).join("")}</ol>` + extra + `<p class="meta">${esc(langOf() === "ar" ? "التواريخ تُحسب من أول وصول مُدخل. ليست وصفة." : "Dates count back from the first arrival you entered. They are not a prescription.")}</p>`;
}

function renderMalaria() {
  return state.stops.map((s) => {
    const rec = state.byIso[s.iso];
    const pack = malariaOptions(state.profile, rec);
    if (pack.status === "none") {
      const who = whoMalariaText(rec.whoMalaria);
      return `<article class="task"><h3>${esc(nameOf(rec))}</h3>${quoteBlock(
        who ? who.en : (rec.malaria.prophylaxis || "No chemoprophylaxis is named."),
        who ? who.ar : "لا تُذكر وقاية دوائية."
      )}</article>`;
    }
    if (pack.status === "verify") {
      return `<article class="task"><h3>${esc(nameOf(rec))}</h3><p class="flag">${esc(t("verify"))}</p></article>`;
    }
    const options = pack.options.map((d) => {
      const on = state.drug[s.iso] === d.id;
      return `<label class="drug ${esc(d.state)} ${on ? "is-on" : ""}"><input type="radio" name="drug-${esc(s.iso)}" value="${esc(d.id)}" ${on ? "checked" : ""}>
        <span><strong>${esc(d.name)}</strong> · ${esc(d.state)}</span>
        ${(d.reasons || []).map((r) => `<small>${esc(langOf() === "ar" ? r.ar : r.en)}</small>`).join("")}
        <small>${esc(langOf() === "ar" ? d.timingAr : d.timingEn)}</small>
      </label>`;
    }).join("");
    return `<article class="task"><h3>${esc(nameOf(rec))}</h3>
      <p>${esc(langOf() === "ar" ? "الأسماء التي تظهر في سطر CDC فقط. اختر واحدًا لتثبيت التوقيت، أو لا تختر. الاختيار ليس وصفة." : "Only names that appear on the CDC line. Pick one to pin the timing, or pick none. A pick is not a prescription.")}</p>
      <label class="drug"><input type="radio" name="drug-${esc(s.iso)}" value="" ${state.drug[s.iso] ? "" : "checked"}> ${esc(t("drugNone"))}</label>
      ${options}
    </article>`;
  }).join("") + `<p class="meta"><a href="${esc(SOURCES.malaria.url)}">${esc(SOURCES.malaria.title)}</a> · ${esc(SOURCES.malaria.dated)}</p>`;
}

function renderCheck() {
  const rows = checklist(state.profile, state.stops, state.byIso);
  const hajj = hajjBlock();
  return `<p class="muted">${langOf() === "ar" ? "علّم أثناء المشورة. العلامة ليست إخلاء طرف." : "Tick while you counsel. A tick is not a clearance."}</p>
    <ul class="checks">${rows.map((r) => `<li><label><input type="checkbox"> <span>${esc(langOf() === "ar" ? r.ar : r.en)}</span></label></li>`).join("")}</ul>
    ${hajj}`;
}

function hajjBlock() {
  const on = state.stops.some((s) => s.purpose === "hajj" || s.purpose === "umrah");
  if (!on) return "";
  const match = hajjMatch(state.origin);
  const purpose = state.stops.some((s) => s.purpose === "hajj") ? "hajj" : "umrah";
  const lines = [];
  lines.push(langOf() === "ar"
    ? `إصدار مرجعي: ${HAJJ.editionAr}. لم يُتحقق من موسم ${HAJJ.unverifiedNext}. السياحة والحج والعمرة ليست فئة واحدة.`
    : `Reference edition: ${HAJJ.edition}. ${HAJJ.unverifiedNext} was not verified. Tourism, Hajj, and Umrah are not one category.`);
  if (match.missing) {
    lines.push(langOf() === "ar" ? "اختر بلد القدوم قبل تطبيق جداول 1447." : "Choose the country of arrival before applying the 1447 tables.");
  } else {
    if (match.polioA) lines.push(langOf() === "ar" ? "الجدول أ: جرعة bOPV أو IPV على الأقل قبل السفر، بغض النظر عن العمر أو سابقة التحصين." : "Table A: at least one bOPV or IPV dose before travel, regardless of age or previous vaccination.");
    if (match.polioB) lines.push(langOf() === "ar" ? "الجدول ب: جرعة IPV على الأقل؛ وإن لم تتوفر، يُقبل إثبات جرعة فموية تحتوي النمط 2 بما فيه novel OPV2." : "Table B: at least one IPV dose; if unavailable, documentation of a type-2-containing OPV dose, including novel OPV2, is accepted.");
    if (match.yf) lines.push(langOf() === "ar" ? "الحمى الصفراء في إصدار 1447: للقادمين من البلدان المدرجة الأكبر من 9 أشهر. الشهادة مدى الحياة من اليوم العاشر. عبارة الوزارة «أكبر من 9 أشهر» لا تُختصر إلى صياغة CDC." : "Yellow fever in the 1447 edition: arrivals from the listed countries who are older than 9 months. The certificate is valid for life from day 10. MOH’s “older than 9 months” is not rewritten as a CDC age.");
    if (purpose === "umrah" && match.menCert) lines.push(langOf() === "ar" ? "قائمة شهادة العمرة لهذا البلد: يلزم إبراز شهادة اللقاح. بقية المسافرين للعمرة مشمولون بجملة التطعيم أيضًا." : "Umrah certificate list includes this origin: proof of vaccination is required. Other Umrah travelers are still covered by the vaccination sentence.");
    if (match.polioAdvice) lines.push(langOf() === "ar" ? "توصية إضافية لشلل الأطفال، وليست بديلاً عن الجداول الإلزامية." : "Additional polio advice. It does not cancel a mandatory table.");
    if (!match.polioA && !match.polioB && !match.yf && !match.menCert && !match.polioAdvice) {
      lines.push(langOf() === "ar" ? "بلد القدوم هذا ليس في الجداول المنسوخة. ما زال MenACWY في نص 1447 يشمل الحج والعمرة من كل البلدان. تأكد من الموسم." : "This origin is not on the transcribed tables. The 1447 MenACWY sentence still covers Hajj and Umrah from all countries. Confirm the season.");
    }
  }
  lines.push(langOf() === "ar"
    ? "كوفيد في وثيقة الحج: إثبات لفئات محددة من كل البلدان، والفئات غير معرّفة في القسم. لا تنقل قائمة العمرة إلى الحج."
    : "Hajj COVID text: proof for specified groups from all countries, and the section does not define the groups. Do not copy the Umrah list onto Hajj.");
  if (purpose === "umrah") {
    lines.push(langOf() === "ar"
      ? "كوفيد في وثيقة العمرة: فوق 65 سنة، والحمل، وأمراض القلب أو التنفس المزمنة، والفشل الكلوي، وأمراض الدم الوراثية، ونقص المناعة، والسرطان، والمرض العصبي المزمن. البدائل: جرعة 2025–2026، أو سلسلة أولية بجرعتين على الأقل في 2021–2024، أو تعافٍ مخبري في 2025."
      : "Umrah COVID text: over 65, pregnancy, chronic heart or respiratory disease, chronic kidney failure, hereditary blood disorders, immunodeficiency, cancer, or chronic neurological disease. Alternatives: a 2025–2026 dose, a primary series of at least two doses in 2021–2024, or laboratory-confirmed recovery in 2025.");
    lines.push(langOf() === "ar"
      ? "القادمون من اليمن والسودان: شهادة إتمام ملاحظة صحية لمدة 10 أيام على الأقل قبل السفر، حسب وثيقة العمرة. هذا ليس لقاح كوليرا شخصيًا."
      : "Arrivals from Yemen and Sudan: a health-observation certificate for at least 10 days before travel, in the Umrah document. That is not a personal cholera vaccine.");
  }
  return `<article class="task"><h3>${langOf() === "ar" ? "الحج والعمرة" : "Hajj and Umrah"}</h3><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
    <p class="meta"><a href="${esc(SOURCES.moh.url)}">MOH</a> · <a href="${esc(SOURCES.hajjPdf.url)}">Hajj PDF</a> · <a href="${esc(SOURCES.umrahPdf.url)}">Umrah PDF</a></p></article>`;
}

function handoutHtml() {
  const alerts = profileAlerts(state.profile);
  const items = checklist(state.profile, state.stops, state.byIso);
  const stops = state.stops.map((s) => {
    const rec = state.byIso[s.iso];
    const none = rec.malaria?.band === "none";
    const unknown = rec.malaria?.band === "unknown" || rec.status !== "reviewed";
    const en = none
      ? "Routine malaria tablets are not indicated from the sources on this card. That is not a guarantee of zero risk, and it is not clearance for a side trip."
      : unknown
        ? "Malaria advice for this stop is not established here. Ask before travel. Do not start a tablet from this sheet."
        : "Parts of this trip may need malaria tablets. The choice depends on the exact places, dates, and your health. Do not start a medicine from a list on this sheet. Fever during the trip or after return is urgent.";
    const ar = none
      ? "لا تُستطب أقراص ملاريا روتينية حسب المصادر على هذه البطاقة. هذا ليس ضمانًا لانعدام الخطر، ولا تصريحًا لرحلة جانبية."
      : unknown
        ? "مشورة الملاريا لهذه المحطة غير محسومة هنا. اسأل قبل السفر. لا تبدأ قرصًا من هذه الورقة."
        : "قد تحتاج أجزاء من الرحلة أقراص ملاريا. الاختيار يعتمد على الأماكن والتواريخ وحالتك. لا تبدأ دواءً من قائمة على هذه الورقة. الحمى أثناء الرحلة أو بعد العودة عاجلة.";
    return `<section><h3>${esc(rec.name)} · ${esc(rec.name_ar || "")}</h3>
      <p lang="en">${esc(en)}</p><p lang="ar" dir="rtl">${esc(ar)}</p>
      <p class="meta">${esc(rec.status)} · ${esc(rec.checkedAt || "—")}</p></section>`;
  }).join("");
  return `<article class="sheet">
    <p class="kicker">Draft counseling aid — clinician review required · مسودة مساعدة للمشورة — يلزم مراجعتها من الطبيب</p>
    <h2>Patient handout · ورقة المسافر</h2>
    <p lang="en">Educational reference—not a prescription. Verify the traveler’s needs and current entry rules.</p>
    <p lang="ar" dir="rtl">مرجع تعليمي، لا يُعد وصفة طبية. تحقّق من احتياجات المسافر واشتراطات الدخول السارية.</p>
    ${stops}
    ${alerts.map((a) => `<p class="flag" lang="en">${esc(a.en)}</p><p class="flag" lang="ar" dir="rtl">${esc(a.ar)}</p>`).join("")}
    ${items.map((i) => `<p lang="en">${esc(i.en)}</p><p lang="ar" dir="rtl">${esc(i.ar)}</p>`).join("")}
    <h2>Clinician summary · ملخص الطبيب</h2>
    ${state.stops.map((s) => {
      const rec = state.byIso[s.iso];
      const line = rec.malaria?.tablePresent
        ? `CDC prophylaxis line: ${rec.malaria.prophylaxis} Areas: ${rec.malaria.areas}`
        : (whoMalariaText(rec.whoMalaria)?.en || rec.gap || "Malaria not established.");
      return `<p lang="en"><strong>${esc(rec.iso)}</strong> ${esc(rec.status)}. ${esc(line)}</p>`;
    }).join("")}
    <p lang="en">Checked ${ACCESS}. Profile selections change flags; they do not generate a personal prescription. Bolivia’s certificate, when on the route, stays a source conflict. Saudi rules on this sheet are ${HAJJ.edition} only.</p>
    <p lang="ar" dir="rtl">فُحص في ${ACCESS}. اختيارات الملف تغيّر التنبيهات ولا تنشئ وصفة شخصية. شهادة بوليفيا، إن وُجدت في المسار، تبقى تعارض مصادر. قواعد السعودية على هذه الورقة إصدار ${HAJJ.editionAr} فقط.</p>
    <p class="meta" id="discFull">This map supports, but does not replace, an individualized pre-travel consultation. Risks vary by route, season, activities and medical history. Vaccine and medicine choices require clinical assessment. Entry rules and outbreak notices can change. Verification is limited to the topics and dates shown; unreviewed destinations remain unverified.</p>
    <p class="meta" dir="rtl" lang="ar">تساعد هذه الخريطة في المشورة قبل السفر ولا تستبدل التقييم الفردي. تختلف المخاطر حسب المسار والموسم والأنشطة والتاريخ المرضي. يتطلب اختيار اللقاحات والأدوية تقييمًا طبيًا. قد تتغير اشتراطات الدخول وتنبيهات التفشي. يقتصر التحقق على الموضوعات والتواريخ المعروضة، وتبقى الوجهات غير المراجعة موسومة بذلك.</p>
  </article>`;
}

function paintMap() {
  const svg = $("#map");
  if (!svg) return;
  const selected = new Set(state.stops.map((s) => s.iso));
  svg.querySelectorAll("path").forEach((path) => {
    const iso = path.dataset.iso;
    const rec = state.byIso[iso];
    path.classList.toggle("is-selected", selected.has(iso));
    path.classList.toggle("is-focus", state.focus === iso);
    const band = rec?.malaria?.band || "unknown";
    path.dataset.band = band;
    path.dataset.notice = noticesFor(iso).some((n) => n.level >= 2) ? "yes" : "no";
  });
}

function drawMap() {
  const svg = $("#map");
  const { width, height, paths } = state.world;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = paths.map((p) => {
    const rec = state.byIso[p.iso];
    const label = rec ? `${rec.name} / ${rec.name_ar || ""}` : p.iso;
    return `<path data-iso="${esc(p.iso)}" d="${p.d}" tabindex="0" role="button" aria-label="${esc(label)}"><title>${esc(label)}</title></path>`;
  }).join("");
  paintMap();
}

function search(q) {
  const n = norm(q);
  if (!n) return [];
  return state.records.filter((r) => {
    const blob = norm([r.name, r.name_ar, r.iso, r.region, ...(r.aliases || [])].join(" "));
    return blob.includes(n);
  }).slice(0, 8);
}

function showSearch(items) {
  const list = $("#searchList");
  if (!items.length) {
    list.hidden = true;
    list.innerHTML = "";
    return;
  }
  list.hidden = false;
  list.innerHTML = items.map((r, i) => `<li role="option" id="opt-${i}" data-iso="${esc(r.iso)}">${esc(nameOf(r))} <small>${esc(r.name)}</small></li>`).join("");
}

function shareUrl() {
  const params = new URLSearchParams();
  params.set("lang", langOf());
  if (state.origin) params.set("from", state.origin);
  params.set("age", state.profile.age);
  const flags = [];
  if (state.profile.pregnant) flags.push("preg");
  if (state.profile.planningPregnancy) flags.push("plan");
  if (state.profile.breastfeedingUnder5kg) flags.push("bf");
  if (state.profile.immune !== "none") flags.push(`im-${state.profile.immune}`);
  if (state.profile.seizure) flags.push("sz");
  if (state.profile.psych) flags.push("psy");
  if (state.profile.conduction) flags.push("cv");
  if (state.profile.g6pd !== "unknown") flags.push(`g6-${state.profile.g6pd}`);
  if (state.profile.psoriasis) flags.push("pso");
  if (state.profile.renal) flags.push("ren");
  if (state.profile.liver) flags.push("liv");
  if (flags.length) params.set("p", flags.join("."));
  if (state.stops.length) {
    params.set("stops", state.stops.map((s) => [s.iso, s.arrive, s.leave, s.purpose, s.ascent ? "1" : "0"].join(".")).join("~"));
  }
  const url = `${location.pathname}?${params.toString()}`;
  history.replaceState(null, "", url);
  return `${location.origin}${url}`;
}

function loadFromUrl() {
  const q = new URLSearchParams(location.search);
  const lang = (q.get("lang") || "").toLowerCase() === "ar" ? "ar" : "en";
  if (q.get("age")) state.profile.age = q.get("age");
  const flags = (q.get("p") || "").split(".").filter(Boolean);
  state.profile.pregnant = flags.includes("preg");
  state.profile.planningPregnancy = flags.includes("plan");
  state.profile.breastfeedingUnder5kg = flags.includes("bf");
  state.profile.seizure = flags.includes("sz");
  state.profile.psych = flags.includes("psy");
  state.profile.conduction = flags.includes("cv");
  state.profile.psoriasis = flags.includes("pso");
  state.profile.renal = flags.includes("ren");
  state.profile.liver = flags.includes("liv");
  if (flags.includes("im-severe")) state.profile.immune = "severe";
  if (flags.includes("im-limited")) state.profile.immune = "limited";
  if (flags.includes("g6-normal")) state.profile.g6pd = "normal";
  if (flags.includes("g6-deficient")) state.profile.g6pd = "deficient";
  state.origin = q.get("from") || state.origin;
  const raw = q.get("stops");
  if (raw) {
    state.stops = raw.split("~").map((part) => {
      const [iso, arrive, leave, purpose, ascent] = part.split(".");
      return { iso, arrive: arrive || "", leave: leave || "", purpose: purpose || "tourism", ascent: ascent === "1" };
    }).filter((s) => state.byIso[s.iso]);
    state.focus = state.stops[0]?.iso || "";
  }
  return lang;
}

function bind() {
  $("#langEn").addEventListener("click", () => applyLang("en"));
  $("#langAr").addEventListener("click", () => applyLang("ar"));
  $("#themeToggle").addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
  $("#startConsult").addEventListener("click", () => {
    showStep(1);
    document.getElementById("stepper").scrollIntoView({ block: "start" });
  });
  $("#stepBtn1").addEventListener("click", () => showStep(1));
  $("#stepBtn2").addEventListener("click", () => showStep(2));
  $("#stepBtn3").addEventListener("click", () => showStep(3));
  $("#toRoute").addEventListener("click", () => showStep(2));
  $("#toPlan").addEventListener("click", () => showStep(3));
  $("#backTraveler").addEventListener("click", () => showStep(1));
  $("#backRoute").addEventListener("click", () => showStep(2));
  $("#discToggle").addEventListener("click", () => {
    const open = $("#discDetails").hidden;
    $("#discDetails").hidden = !open;
    $("#discToggle").setAttribute("aria-expanded", String(open));
  });
  $("#discDismiss").addEventListener("click", () => {
    $("#safetyBanner").hidden = true;
    $("#discReopen").hidden = false;
  });
  $("#discReopen").addEventListener("click", () => {
    $("#safetyBanner").hidden = false;
    $("#discReopen").hidden = true;
  });
  $("#profile").addEventListener("change", () => {
    readProfile();
    renderPlan();
    save();
  });
  $("#origin").addEventListener("change", () => {
    state.origin = $("#origin").value;
    renderPlan();
    save();
  });
  $("#stops").addEventListener("change", (e) => {
    const iso = e.target.dataset.iso;
    const field = e.target.dataset.field;
    const stop = state.stops.find((s) => s.iso === iso);
    if (!stop) return;
    if (field === "ascent") stop.ascent = e.target.checked;
    else stop[field] = e.target.value;
    renderPlan();
    save();
  });
  $("#stops").addEventListener("click", (e) => {
    const iso = e.target.dataset.remove;
    if (!iso) return;
    state.stops = state.stops.filter((s) => s.iso !== iso);
    if (state.focus === iso) state.focus = state.stops[0]?.iso || "";
    renderStops();
    renderPlan();
    paintMap();
    save();
  });
  $("#planBody").addEventListener("change", (e) => {
    if (e.target.name?.startsWith("drug-")) {
      const iso = e.target.name.slice(5);
      state.drug[iso] = e.target.value;
      renderPlan();
      save();
    }
  });
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => {
        b.setAttribute("aria-selected", String(b === btn));
      });
      renderPlan();
    });
  });
  let active = -1;
  $("#q").addEventListener("input", () => {
    active = -1;
    showSearch(search($("#q").value));
  });
  $("#q").addEventListener("keydown", (e) => {
    const items = [...$("#searchList").querySelectorAll("li")];
    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = Math.min(items.length - 1, active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      active = Math.max(0, active - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = items[active] || items[0];
      if (pick) addStop(pick.dataset.iso);
      return;
    } else if (e.key === "Escape") {
      $("#searchList").hidden = true;
      return;
    } else return;
    items.forEach((li, i) => li.classList.toggle("is-active", i === active));
    items[active]?.scrollIntoView({ block: "nearest" });
  });
  $("#searchList").addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (li) addStop(li.dataset.iso);
  });
  $("#map").addEventListener("click", (e) => {
    const iso = e.target.dataset?.iso;
    if (iso && state.byIso[iso]) addStop(iso);
  });
  $("#map").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.dataset?.iso) {
      e.preventDefault();
      addStop(e.target.dataset.iso);
    }
  });
  let zoom = 1;
  const applyZoom = () => {
    $("#map").style.transform = `scale(${zoom})`;
  };
  $("#zoomIn").addEventListener("click", () => { zoom = Math.min(2.8, zoom + 0.25); applyZoom(); });
  $("#zoomOut").addEventListener("click", () => { zoom = Math.max(1, zoom - 0.25); applyZoom(); });
  $("#zoomReset").addEventListener("click", () => { zoom = 1; applyZoom(); });
  $("#share").addEventListener("click", async () => {
    readProfile();
    const url = shareUrl();
    try { await navigator.clipboard.writeText(url); } catch { /* the address bar already updated */ }
    $("#shareNote").textContent = t("copied");
  });
  $("#print").addEventListener("click", () => {
    renderPlan();
    window.print();
  });
  $("#reset").addEventListener("click", () => {
    state.stops = [];
    state.profile = defaultProfile();
    state.origin = "";
    state.focus = "";
    state.drug = {};
    state.je = false;
    state.rabies = false;
    writeProfile();
    renderStops();
    renderPlan();
    paintMap();
    history.replaceState(null, "", location.pathname);
    sessionStorage.removeItem("tm-consult-v1");
    showStep(1);
  });
}

async function main() {
  const [records, world] = await Promise.all([
    fetch("./data/destinations.json").then((r) => r.json()),
    fetch("./data/world.json").then((r) => r.json()),
  ]);
  state.records = records;
  state.byIso = Object.fromEntries(records.map((r) => [r.iso, r]));
  state.world = world;
  const stored = sessionStorage.getItem("tm-consult-v1");
  if (stored && !location.search) {
    try {
      const data = JSON.parse(stored);
      state.stops = data.stops || [];
      state.profile = { ...defaultProfile(), ...(data.profile || {}) };
      state.origin = data.origin || "";
      state.focus = data.focus || "";
      state.drug = data.drug || {};
      state.je = !!data.je;
      state.rabies = !!data.rabies;
      applyLang(data.lang === "ar" ? "ar" : "en");
    } catch {
      applyLang("en");
    }
  } else {
    const lang = location.search ? loadFromUrl() : "en";
    applyLang(lang);
  }
  drawMap();
  bind();
  renderStops();
  renderPlan();
  paintMap();
  showStep(state.stops.length ? 3 : 1);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

main();
