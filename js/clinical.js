import { DRUGS, HAJJ, NOTICES, STANDING } from "./reference.js";

export const AGE_ORDER = ["under6m", "6to8m", "9to11m", "12to23m", "2to7y", "8to17y", "18to59y", "60plus"];

export function defaultProfile() {
  return {
    age: "18to59y",
    pregnant: false,
    planningPregnancy: false,
    breastfeedingUnder5kg: false,
    immune: "none",
    seizure: false,
    psych: false,
    conduction: false,
    g6pd: "unknown",
    psoriasis: false,
    renal: false,
    liver: false,
    priorYf: false,
    priorMen: false,
    menDate: "",
    menType: "unknown",
    priorHepa: false,
    priorTyphoid: false,
    priorRabies: false,
    priorMmr: false,
  };
}

export function ageIndex(age) {
  const i = AGE_ORDER.indexOf(age);
  return i < 0 ? 6 : i;
}

export function under8(age) {
  return ageIndex(age) <= AGE_ORDER.indexOf("2to7y");
}

export function under18(age) {
  return ageIndex(age) <= AGE_ORDER.indexOf("8to17y");
}

export function under2y(age) {
  return ageIndex(age) <= AGE_ORDER.indexOf("12to23m");
}

export function under1y(age) {
  return ageIndex(age) <= AGE_ORDER.indexOf("9to11m");
}

export function addDays(iso, days) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const a = new Date(`${fromIso}T12:00:00Z`);
  const b = new Date(`${toIso}T12:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b - a) / 86400000);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function noticesFor(iso) {
  return NOTICES.filter((n) => n.isos.includes(iso));
}

export function whoMalariaText(row) {
  if (!row) return null;
  if (row.footnote === "d") {
    return {
      en: `WHO footnote d on the malaria-free page: Taiwan (China) was certified malaria-free in November ${row.certified}. That footnote is not a row in the main table.`,
      ar: `حاشية WHO (د) في صفحة الخلو من الملاريا: تايوان (الصين) اعتُمدت خالية من الملاريا في نوفمبر ${row.certified}. هذه حاشية وليست صفًا في الجدول الرئيس.`,
    };
  }
  if (row.certified) {
    return {
      en: `WHO table “Certification of malaria elimination, 1955–2025”: certified malaria-free in ${row.certified}. Certification is not a promise of zero imported infections or permanent zero risk.`,
      ar: `جدول WHO «اعتماد القضاء على الملاريا، 1955–2025»: اعتماد الخلو من الملاريا عام ${row.certified}. الاعتماد ليس وعدًا بانعدام الحالات الوافدة أو باستمرار الخطر صفرًا.`,
    };
  }
  if (row.historical) {
    return {
      en: `WHO table column for places where malaria never existed or disappeared without specific measures: ${row.historical}. That column is not a certification-of-elimination year.`,
      ar: `عمود جدول WHO للأماكن التي لم توجد فيها الملاريا أو اختفت دون تدابير خاصة: ${row.historical}. هذا العمود ليس سنة اعتماد للقضاء.`,
    };
  }
  return null;
}

export function assessDrug(drugId, profile, malaria) {
  const meta = DRUGS.find((d) => d.id === drugId);
  const reasons = [];
  let state = "option";
  const avoid = (en, ar) => {
    state = "avoid";
    reasons.push({ en, ar });
  };
  const caution = (en, ar) => {
    if (state !== "avoid") state = "caution";
    reasons.push({ en, ar });
  };
  const listed = (malaria.drugs || []).includes(drugId);
  if (!listed) {
    return {
      id: drugId,
      name: meta?.name || drugId,
      state: "unlisted",
      reasons: [{
        en: "Not named in this destination’s CDC prophylaxis line.",
        ar: "غير مذكور في سطر الوقاية على صفحة CDC لهذه الوجهة.",
      }],
      timingEn: meta?.timingEn || "",
      timingAr: meta?.timingAr || "",
    };
  }
  if (drugId === "doxycycline") {
    if (profile.pregnant || profile.planningPregnancy) {
      avoid(
        "Doxycycline is contraindicated in pregnancy.",
        "الدوكسيسيكلين ممنوع في الحمل."
      );
    }
    if (under8(profile.age)) {
      avoid(
        "Doxycycline is contraindicated under 8 years.",
        "الدوكسيسيكلين ممنوع دون عمر 8 سنوات."
      );
    }
  }
  if (drugId === "primaquine" || drugId === "tafenoquine") {
    if (profile.pregnant || profile.planningPregnancy) {
      avoid(
        "Primaquine and tafenoquine must not be used in pregnancy.",
        "البريماكين والتافينوكين لا يُستخدمان في الحمل."
      );
    }
    if (profile.g6pd !== "normal") {
      avoid(
        "CDC: do not use without a documented normal quantitative G6PD test.",
        "CDC: لا يُستخدم دون إثبات نشاط طبيعي لإنزيم G6PD بفحص كمي."
      );
    }
    if (drugId === "tafenoquine" && under18(profile.age)) {
      avoid(
        "The Yellow Book says tafenoquine cannot be used by children. Confirm the licensed age in the product label; this desk does not invent a cutoff.",
        "يقول الكتاب الأصفر إن التافينوكين لا يُستخدم للأطفال. تأكد من العمر المرخص على النشرة؛ هذا المكتب لا يخترع حدًا."
      );
    }
    if (drugId === "tafenoquine" && profile.psych) {
      caution(
        "Not recommended for patients with psychotic disorders. A broader psychiatric history still needs a clinician, not an automatic ban from this checkbox alone.",
        "لا يُنصح به لمن لديهم اضطراب ذهاني. التاريخ النفسي الأوسع يقرره الطبيب، وهذا المربع وحده ليس منعًا تلقائيًا."
      );
    }
    if (profile.breastfeedingUnder5kg && drugId === "primaquine") {
      avoid(
        "Do not use primaquine while breastfeeding unless the infant has also had a G6PD test.",
        "لا يُستخدم البريماكين أثناء الرضاعة ما لم يُفحص الرضيع أيضًا لإنزيم G6PD."
      );
    }
  }
  if (drugId === "mefloquine") {
    if (malaria.mefloquineResistance) {
      avoid(
        "This destination page reports mefloquine resistance. Do not offer mefloquine for the resistant areas.",
        "صفحة الوجهة تذكر مقاومة للميفلوكن. لا يُعرض للميفلوكن في مناطق المقاومة."
      );
    }
    if (profile.seizure) {
      avoid(
        "Mefloquine cannot be used with a seizure disorder.",
        "الميفلوكين لا يُستخدم مع اضطراب الصرع."
      );
    }
    if (profile.psych) {
      avoid(
        "Mefloquine cannot be used with the psychiatric conditions in the boxed warning (depression, recent depression, anxiety disorder, psychosis, schizophrenia, other major psychiatric illness). Counsel that neuropsychiatric reactions can persist.",
        "الميفلوكين لا يُستخدم مع الحالات النفسية المذكورة في التحذير المؤطر (اكتئاب، اكتئاب حديث، اضطراب قلق، ذهان، فصام، أو مرض نفسي كبير آخر). قد تستمر الآثار العصبية النفسية."
      );
    }
    if (profile.conduction) {
      caution(
        "Not recommended with cardiac conduction abnormalities.",
        "لا يُنصح به مع اضطرابات التوصيل القلبي."
      );
    }
  }
  if (drugId === "chloroquine") {
    if (malaria.chloroquineResistance) {
      avoid(
        "Chloroquine resistance is reported. Chloroquine is not the regimen for those areas.",
        "ذُكرت مقاومة للكلوروكين. الكلوروكين ليس نظام تلك المناطق."
      );
    }
    if (profile.psoriasis) {
      caution(
        "Chloroquine may exacerbate psoriasis. The chapter does not treat psoriasis as a one-line absolute ban.",
        "قد يفاقم الكلوروكين الصدفية. الفصل لا يجعل الصدفية منعًا مطلقًا في سطر واحد."
      );
    }
  }
  if (drugId === "atovaquone-proguanil") {
    if (profile.pregnant || profile.planningPregnancy) {
      caution(
        "Not recommended in pregnancy because data are limited and other options exist. Table 4.10.2 also says it cannot be used in pregnancy. If nothing else is feasible, the pregnancy section says to weigh the decision individually. This desk does not pick that exception.",
        "لا يُنصح به في الحمل لندرة البيانات ووجود بدائل. الجدول 4.10.2 يقول أيضًا إنه لا يُستخدم في الحمل. إذا تعذرت البدائل، يقول قسم الحمل إن القرار يُوزن فرديًا. هذا المكتب لا يختار ذلك الاستثناء."
      );
    }
    if (profile.renal) {
      avoid(
        "Contraindicated when creatinine clearance is under 30 mL/min.",
        "ممنوع إذا كان تصفية الكرياتينين أقل من 30 مل/دقيقة."
      );
    }
    if (profile.breastfeedingUnder5kg) {
      avoid(
        "Not recommended while breastfeeding an infant under 5 kg.",
        "لا يُنصح به أثناء إرضاع رضيع دون 5 كغ."
      );
    }
    if (under1y(profile.age) || profile.age === "12to23m") {
      caution(
        "Not recommended under 5 kg. Weight is required; this desk does not estimate it from age.",
        "لا يُنصح به دون 5 كغ. الوزن لازم، وهذا المكتب لا يقدّره من العمر."
      );
    }
  }
  if (profile.pregnant && malaria.chloroquineResistance && !malaria.mefloquineResistance && drugId === "mefloquine" && state === "option") {
    caution(
      "For chloroquine-resistant areas, the pregnancy section says mefloquine is the only medication recommended in pregnancy, and only if mefloquine itself is suitable. It is still not an automatic prescription.",
      "في مناطق مقاومة الكلوروكين، يقول قسم الحمل إن الميفلوكين هو الدواء الوحيد الموصى به في الحمل، وفقط إذا كان الميفلوكين نفسه مناسبًا. يبقى ذلك دون وصفة تلقائية."
    );
  }
  if (profile.pregnant && malaria.chloroquineResistance && malaria.mefloquineResistance && (drugId === "mefloquine" || drugId === "atovaquone-proguanil")) {
    caution(
      "Pregnancy plus a mefloquine-resistant area: the chapter’s pregnancy option and this destination’s drug list do not line up. Postpone travel or get specialist advice. Do not fill the gap from this list.",
      "الحمل مع منطقة مقاومة للميفلوكن: خيار قسم الحمل وقائمة أدوية الوجهة لا يتطابقان. يُؤجَّل السفر أو يُطلب رأي متخصص. لا تُسد الفجوة من هذه القائمة."
    );
  }
  return { id: drugId, name: meta?.name || drugId, state, reasons, timingEn: meta?.timingEn || "", timingAr: meta?.timingAr || "" };
}

export function malariaOptions(profile, record) {
  const malaria = record.malaria || {};
  if (malaria.band === "unknown" || (!malaria.tablePresent && malaria.band !== "none")) {
    return { status: "verify", options: [] };
  }
  if (malaria.band === "none") {
    return { status: "none", options: [] };
  }
  const options = DRUGS.map((d) => assessDrug(d.id, profile, malaria)).filter((d) => d.state !== "unlisted");
  return { status: malaria.band, options };
}

function yfKind(text) {
  const t = (text || "").toLowerCase();
  if (!t) return "unknown";
  const recommended = t.includes("recommended");
  const notRec = t.includes("not recommended");
  const generallyNot = t.includes("generally not");
  if (generallyNot && recommended) return "itinerary";
  if (notRec && t.includes("except")) return "itinerary";
  if (recommended && notRec) return "itinerary";
  if (notRec && !t.includes("is recommended for")) return "not";
  if (recommended) return "yes";
  return "unknown";
}

export function yfPlan(profile, record) {
  const yf = record.yellowFever;
  if (!yf) return { kind: "unknown", blocks: [] };
  const kind = yfKind(yf.recommendation);
  const blocks = [];
  if (profile.age === "under6m") {
    blocks.push({
      en: "Yellow fever vaccine is contraindicated under 6 months.",
      ar: "لقاح الحمى الصفراء ممنوع دون عمر 6 أشهر.",
    });
  } else if (profile.age === "6to8m") {
    blocks.push({
      en: "Age 6–8 months is a precaution, not the contraindication that applies under 6 months.",
      ar: "عمر 6–8 أشهر احتياط، وليس المنع الذي يسري دون 6 أشهر.",
    });
  }
  if (profile.age === "60plus") {
    blocks.push({
      en: "Age 60 or older is a precaution. Serious vaccine adverse events are more often reported after a first dose in older adults.",
      ar: "عمر 60 سنة فأكثر احتياط. الآثار الخطيرة للقاح تُبلغ أكثر بعد الجرعة الأولى عند الأكبر سنًا.",
    });
  }
  if (profile.pregnant) {
    blocks.push({
      en: "Pregnancy is a precaution, not an absolute contraindication. If exposure risk outweighs vaccine risk, vaccination may be appropriate. If not, a medical waiver may be discussed; acceptance is not guaranteed.",
      ar: "الحمل احتياط وليس منعًا مطلقًا. إذا رجح خطر التعرض على خطر اللقاح فقد يكون التطعيم مناسبًا. وإن لم يكن، يُناقش الإعفاء الطبي وقبوله غير مضمون.",
    });
  }
  if (profile.immune === "severe") {
    blocks.push({
      en: "Yellow fever vaccine is contraindicated in severe immunosuppression, including AIDS or CD4 counts under 200/µL (or under 15% in children under 6). Asymptomatic HIV with moderate immunosuppression is a precaution, not the same rule.",
      ar: "لقاح الحمى الصفراء ممنوع في التثبيط المناعي الشديد، ومنه الإيدز أو CD4 دون 200/ميكرولتر (أو دون 15% للأطفال دون 6 سنوات). فيروس العوز المناعي غير المصحوب بأعراض مع تثبيط متوسط احتياط، وليس القاعدة نفسها.",
    });
  } else if (profile.immune === "limited") {
    blocks.push({
      en: "Immune status changes yellow fever eligibility. Do not apply the severe-immunosuppression ban to every HIV or chronic-disease label. Specialist review.",
      ar: "حالة المناعة تغيّر أهلية الحمى الصفراء. لا يُطبَّق منع التثبيط الشديد على كل وسم لفيروس العوز أو مرض مزمن. يلزم تقييم متخصص.",
    });
  }
  return { kind, blocks };
}

export function vaccineTasks(profile, stops, byIso, today) {
  const tasks = [];
  const first = stops
    .map((s) => s.arrive)
    .filter(Boolean)
    .sort()[0] || "";
  const lead = first || today;
  const push = (task) => tasks.push(task);

  let yfRecord = null;
  for (const stop of stops) {
    const rec = byIso[stop.iso];
    if (!rec?.yellowFever) continue;
    const kind = yfKind(rec.yellowFever.recommendation);
    if (kind === "yes" || kind === "itinerary") {
      yfRecord = rec;
      break;
    }
  }
  if (yfRecord && !profile.priorYf) {
    const plan = yfPlan(profile, yfRecord);
    const blocked = profile.age === "under6m" || profile.immune === "severe";
    push({
      id: "yf",
      titleEn: plan.kind === "itinerary" ? "Yellow fever — itinerary decides" : "Yellow fever vaccine",
      titleAr: plan.kind === "itinerary" ? "الحمى الصفراء — المسار هو الذي يقرر" : "لقاح الحمى الصفراء",
      when: blocked || plan.kind === "itinerary" ? "" : addDays(lead, -10),
      detailEn: plan.kind === "itinerary"
        ? "The CDC text both recommends and withholds vaccine depending on the route. Do not put one date on the whole country. A primary certificate, when vaccination is given, is valid from 10 days after the dose and then for life under the IHR."
        : "When vaccination is appropriate, give it so the primary ICVP is valid: from 10 days after the dose, then for life. This is not a routine 10-year booster for border control.",
      detailAr: plan.kind === "itinerary"
        ? "نص CDC يوصي باللقاح ويمنعه حسب المسار. لا يُوضع تاريخ واحد لكل البلد. الشهادة الأولية، عند إعطاء اللقاح، تسري من اليوم العاشر ثم مدى الحياة وفق اللوائح الصحية الدولية."
        : "عندما يكون التطعيم مناسبًا، يُعطى بحيث تسري شهادة ICVP الأولية من اليوم العاشر ثم مدى الحياة. هذا ليس معززًا روتينيًا كل 10 سنوات للحدود.",
      blocks: plan.blocks,
    });
  }

  const hepa = stops.some((s) => (byIso[s.iso]?.vaccines || []).some((v) => v.id === "hepa" && /^Recommended/i.test(v.lead)));
  if (hepa && !profile.priorHepa && !under1y(profile.age)) {
    const soon = first ? daysUntil(today, first) : null;
    const ig = soon !== null && soon < 14 && (profile.age === "60plus" || profile.immune !== "none" || profile.liver);
    push({
      id: "hepa",
      titleEn: "Hepatitis A",
      titleAr: "التهاب الكبد A",
      when: today,
      detailEn: ig
        ? "Give vaccine even if departure is inside 2 weeks. For an older adult, immunocompromised traveler, or chronic liver disease leaving in under 2 weeks, assess immune globulin with the vaccine. Two weeks is not an eligibility cutoff."
        : "Give it when travel is considered, including last-minute trips. Two weeks is not a cutoff. Infants 6–11 months may receive a travel dose that does not count as the routine series.",
      detailAr: ig
        ? "يُعطى اللقاح حتى لو كان السفر خلال أسبوعين. لكبير السن أو ناقص المناعة أو مريض الكبد المزمن إذا غادر خلال أقل من أسبوعين، قيّم الغلوبولين المناعي مع اللقاح. الأسبوعان ليسا حد أهلية."
        : "يُعطى عند التفكير في السفر، بما فيه السفر اللحظي. الأسبوعان ليسا حدًا قاطعًا. الرضع من 6 إلى 11 شهرًا قد يأخذون جرعة سفر لا تُحتسب في السلسلة الروتينية.",
      blocks: [],
    });
  }

  const typhoidMost = stops.some((s) => (byIso[s.iso]?.vaccines || []).some((v) => v.id === "typhoid" && /Recommended for most/i.test(v.lead)));
  if (typhoidMost && !profile.priorTyphoid) {
    if (under2y(profile.age)) {
      push({
        id: "typhoid",
        titleEn: "Typhoid — age",
        titleAr: "التيفوئيد — العمر",
        when: "",
        detailEn: "US Vi polysaccharide is approved from 2 years, and oral Ty21a (Vivotif) from 6 years. This age band is under 2 years, so neither US product is simply scheduled here.",
        detailAr: "لقاح Vi متعدد السكريات الأمريكي مرخص من عمر سنتين، وTy21a الفموي (Vivotif) من عمر 6 سنوات. هذه الفئة دون سنتين، لذلك لا يُجدول أي منهما هنا تلقائيًا.",
        blocks: [],
      });
    } else {
      const liveBlocked = profile.pregnant || profile.immune === "severe";
      push({
        id: "typhoid",
        titleEn: "Typhoid",
        titleAr: "التيفوئيد",
        when: addDays(lead, -14),
        detailEn: liveBlocked
          ? "Prefer injectable Vi if travel vaccine is indicated: one dose, approved from age 2, booster every 2 years if risk continues. Do not use live oral Ty21a in pregnancy or immunocompromise. Finish an oral series at least 1 week before exposure if it is used instead."
          : "Injectable Vi: one dose at least 2 weeks before exposure, from age 2, booster every 2 years if still at risk. Oral Ty21a: age 6 or older, four capsules on alternate days, finished at least 1 week before exposure, booster every 5 years if still at risk. Live Ty21a and antibiotics conflict; see the typhoid note.",
        detailAr: liveBlocked
          ? "يُفضَّل لقاح Vi الحقني إذا كان التطعيم مستطبًا: جرعة واحدة من عمر سنتين، ومعزز كل سنتين إذا استمر الخطر. لا يُستخدم Ty21a الفموي الحي في الحمل أو نقص المناعة."
          : "Vi الحقني: جرعة واحدة قبل التعرض بأسبوعين على الأقل، من عمر سنتين، ومعزز كل سنتين إذا استمر الخطر. Ty21a الفموي: من عمر 6 سنوات، أربع كبسولات يومًا بعد يوم، تُستكمل قبل التعرض بأسبوع على الأقل، ومعزز كل 5 سنوات إذا استمر الخطر.",
        blocks: [],
      });
    }
  }

  const pilgrimage = stops.some((s) => s.purpose === "hajj" || s.purpose === "umrah" || (s.iso === "SAU" && (s.purpose === "hajj" || s.purpose === "umrah")));
  if (pilgrimage) {
    const arrive = stops.find((s) => s.purpose === "hajj" || s.purpose === "umrah")?.arrive || first;
    push({
      id: "men",
      titleEn: `Meningococcal ACYW — MOH ${HAJJ.edition} only`,
      titleAr: `المكورات السحائية ACYW — إصدار وزارة الصحة ${HAJJ.editionAr} فقط`,
      when: profile.priorMen ? "" : addDays(arrive, -10),
      detailEn: "In the 1447H/2026 Hajj and Umrah documents, conjugate ACYW or ACYWX is given at least 10 days and not more than 5 years before arrival. Polysaccharide ACYW: at least 10 days and not more than 3 years. If the certificate does not name the type, the document treats it as valid for 3 years. This edition is not verified for 1448H/2027.",
      detailAr: "في وثائق الحج والعمرة 1447هـ/2026م، اللقاح المقترن ACYW أو ACYWX قبل الوصول بعشرة أيام على الأقل ودون أن يمضي عليه أكثر من 5 سنوات. متعدد السكريات: عشرة أيام على الأقل ودون أكثر من 3 سنوات. إذا لم تُسمِّ الشهادة النوع، يعاملها المستند على أنها صالحة 3 سنوات. لم يُتحقق من هذا الإصدار لموسم 1448هـ/2027م.",
      blocks: [],
    });
  }

  return tasks;
}

export function jeSchedule(profile, depart, today) {
  if (!depart) return { ok: false, en: "Add a departure date to place JE doses.", ar: "أضف تاريخ المغادرة لوضع جرعات التهاب الدماغ الياباني." };
  const days = daysUntil(today, depart);
  const adult = profile.age === "18to59y";
  if (profile.age === "under6m" || profile.age === "6to8m") {
    return { ok: false, en: "IXIARO starts at 2 months of age. This age band is younger.", ar: "IXIARO يبدأ من عمر شهرين. هذه الفئة أصغر." };
  }
  if (profile.pregnant) {
    return {
      ok: false,
      en: "Pregnancy is a precaution for IXIARO. Defer unless the infection risk outweighs the theoretical vaccine risk.",
      ar: "الحمل احتياط لـ IXIARO. يُؤجَّل إلا إذا رجح خطر العدوى على الخطر النظري للقاح.",
    };
  }
  if (adult && days >= 14) {
    const day0 = days >= 35 ? addDays(depart, -35) : addDays(depart, -14);
    return {
      ok: true,
      en: `IXIARO, ages 18–65: days 0 and 7–28, both doses finished at least 1 week before exposure. A workable pair here is ${day0} and ${addDays(day0, days >= 35 ? 28 : 7)}. Other ages use days 0 and 28.`,
      ar: `IXIARO، عمر 18–65: اليومان 0 و7–28، وتُستكمل الجرعتان قبل التعرض بأسبوع على الأقل. زوج ممكن هنا ${day0} و${addDays(day0, days >= 35 ? 28 : 7)}. الأعمار الأخرى: اليومان 0 و28.`,
    };
  }
  if (days >= 35) {
    const day0 = addDays(depart, -35);
    const mix = profile.age === "60plus"
      ? " This age band mixes 60–65 years (days 0 and 7–28 are allowed) and over 65 (days 0 and 28). The dates below use days 0 and 28."
      : "";
    const mixAr = profile.age === "60plus"
      ? " هذه الفئة تجمع 60–65 سنة (يُسمح باليومين 0 و7–28) ومن هم فوق 65 (اليومان 0 و28). التواريخ أدناه تستخدم 0 و28."
      : "";
    return {
      ok: true,
      en: `IXIARO: days 0 and 28, finished at least 1 week before exposure. Dates: ${day0} and ${addDays(day0, 28)}.${mix}`,
      ar: `IXIARO: اليومان 0 و28، وتنتهي السلسلة قبل التعرض بأسبوع على الأقل. التواريخ: ${day0} و${addDays(day0, 28)}.${mixAr}`,
    };
  }
  return {
    ok: false,
    en: "There are not enough days to finish both IXIARO doses at least a week before departure on the standard schedule.",
    ar: "لا توجد أيام كافية لإنهاء جرعتي IXIARO قبل المغادرة بأسبوع على الأقل وفق الجدول المعتاد.",
  };
}

export function rabiesSchedule(depart) {
  if (!depart) return "";
  const day7 = addDays(depart, -1);
  const day0 = addDays(day7, -7);
  return { day0, day7 };
}

export function hajjMatch(origin) {
  if (!origin) return { missing: true };
  return {
    missing: false,
    polioA: HAJJ.polioA.includes(origin),
    polioB: HAJJ.polioB.includes(origin),
    yf: HAJJ.yfArrival.includes(origin),
    menCert: HAJJ.umrahMenCert.includes(origin),
    polioAdvice: HAJJ.polioAdvice.includes(origin),
  };
}

export function profileAlerts(profile) {
  const out = [];
  if (profile.pregnant) {
    out.push({
      en: "Pregnancy increases the risk of severe malaria. Postpone transmission-area travel if you can. Doxycycline, primaquine, and tafenoquine must not be used. Atovaquone-proguanil is not recommended routinely. MMR, varicella, and live oral Ty21a are not given. Yellow fever vaccine is a precaution.",
      ar: "الحمل يزيد خطر الملاريا الشديدة. يُؤجَّل السفر إلى مناطق الانتقال إن أمكن. الدوكسيسيكلين والبريماكين والتافينوكين لا تُستخدم. أتوفاكون–بروغوانيل ليس خيارًا روتينيًا. لا تُعطى MMR ولا جدري الماء ولا Ty21a الفموي الحي. لقاح الحمى الصفراء احتياط.",
    });
  }
  if (profile.immune === "severe") {
    out.push({
      en: "Severe immunosuppression: most live vaccines are contraindicated, including yellow fever and oral Ty21a. Inactivated vaccines may work less well. Do not stop immune treatment in order to vaccinate.",
      ar: "التثبيط المناعي الشديد: معظم اللقاحات الحية ممنوعة، ومنها الحمى الصفراء وTy21a الفموي. اللقاحات المعطلة قد تكون أقل فعالية. لا يُوقف علاج المناعة من أجل التطعيم.",
    });
  } else if (profile.immune === "limited") {
    out.push({
      en: "Limited immune compromise or stable HIV is not the same rule as severe immunosuppression. Eligibility for yellow fever, rabies serology, and live vaccines needs the treating team.",
      ar: "نقص المناعة المحدود أو فيروس العوز المستقر ليس قاعدة التثبيط الشديد نفسها. أهلية الحمى الصفراء وفحص أجسام السعار واللقاحات الحية يقررها الفريق المعالج.",
    });
  }
  if (!profile.priorMmr) {
    out.push({
      en: STANDING.measles.en,
      ar: STANDING.measles.ar,
    });
  }
  return out;
}

export function checklist(profile, stops, byIso) {
  const items = [];
  const add = (id, en, ar) => items.push({ id, en, ar });
  add("identity", "Confirm the route, dates, and reason for travel with the traveler. This desk is not an entry clearance.", "تأكد من المسار والتواريخ وسبب السفر مع المسافر. هذا المكتب ليس تصريح دخول.");
  add("mmr", "MMR is up to date for age, including an early dose at 6–11 months when travel needs it. That early dose does not replace the routine series.", "الحصبة والنكاف والحصبة الألمانية مكتملة للعمر، ومنها جرعة مبكرة في 6–11 شهرًا إذا احتاجها السفر. تلك الجرعة لا تغني عن السلسلة الروتينية.");
  add("food", "Food and water: sealed or treated water for drinking and teeth; food cooked and served hot; no unpasteurized dairy or raw meat. Hands washed. This reduces risk and does not erase it.", "الطعام والماء: ماء مغلق أو معالَج للشرب والأسنان؛ طعام مطهو ويُقدَّم ساخنًا؛ بلا ألبان غير مبسترة أو لحم نيئ. غسل اليدين. هذا يقلل الخطر ولا يمحوه.");
  add("bugs", "Bite precautions: a registered repellent used as its label says, covering clothes, and a net when sleeping exposed. Do not put permethrin on skin.", "الوقاية من اللدغ: طارد مسجّل كما تقول نشرته، وملابس ساترة، وناموسية عند النوم المكشوف. لا يوضع البيرميثرين على الجلد.");
  add("diarrhea", "Oral rehydration first. A standby antibiotic is a selective prescription with a written plan, not daily prevention. No loperamide alone for blood or fever. Children, pregnancy, and immune compromise need their own plan.", "تعويض السوائل أولًا. المضاد الاحتياطي وصفة انتقائية بخطة مكتوبة، لا وقاية يومية. لا لوبيراميد وحده مع الدم أو الحمى. الأطفال والحمل ونقص المناعة لهم خطة خاصة.");
  const malaria = stops.some((s) => ["present", "limited"].includes(byIso[s.iso]?.malaria?.band));
  if (malaria) {
    add("fever", "Fever during or after time in a transmission area is urgent, even if prophylaxis was taken. Malaria can present months later. Name every place and date.", "الحمى أثناء الوجود في منطقة انتقال أو بعده عاجلة، حتى مع الوقاية الدوائية. قد تظهر الملاريا بعد أشهر. اذكر كل مكان وتاريخ.");
  }
  if (stops.some((s) => s.ascent)) {
    add("altitude", "Do not sleep higher while altitude symptoms are present. Descend if they worsen. Confusion, trouble walking, or breathlessness at rest needs urgent descent and oxygen if you have it. A preventive medicine does not replace that.", "لا تنم على ارتفاع أعلى مع أعراض المرتفعات. انزل إذا ساءت. التشوش أو صعوبة المشي أو ضيق النفس وقت الراحة يحتاج نزولًا عاجلًا وأكسجينًا إن وُجد. دواء الوقاية لا يغني عن ذلك.");
  }
  if (stops.some((s) => s.purpose === "hajj" || s.purpose === "umrah")) {
    add("hajj-edition", `Open the current MOH page. Documents on file here are ${HAJJ.edition} only, not ${HAJJ.unverifiedNext}.`, `افتح صفحة وزارة الصحة السارية. الوثائق هنا إصدار ${HAJJ.editionAr} فقط، وليست ${HAJJ.unverifiedNext}.`);
    add("hajj-heat", "Hajj heat: fluids, shade, and a review of diuretics or other drugs that worsen dehydration. Late pregnancy and the serious illnesses listed in the 1447 document affect fitness to perform Hajj.", "حر الحج: سوائل وظل ومراجعة مدرات البول أو الأدوية التي تزيد الجفاف. الحمل المتأخر والأمراض الخطيرة المذكورة في وثيقة 1447 تؤثر في القدرة على أداء الحج.");
  }
  add("rabies-bite", "After a mammal bite, scratch, or possible bat exposure: wash with soap and a lot of water immediately and get urgent care. Prior vaccine does not remove the need for assessment.", "بعد عضة حيوان أو خدش أو تعرض محتمل لخفاش: اغسل فورًا بالصابون وماء كثير واطلب رعاية عاجلة. التطعيم السابق لا يلغي التقييم.");
  add("insurance", "Name a clinic at the destination and a way to get home if illness starts. Carry usual medicines in their original packs.", "سمِّ عيادة في الوجهة وطريقة للعودة إذا بدأ المرض. احمل الأدوية المعتادة في عبواتها الأصلية.");
  if (profile.pregnant || profile.immune !== "none" || under2y(profile.age)) {
    add("special", "Special-population cautions above stay on the printed sheet. Changing the profile does not create a personal prescription.", "تنبيهات الفئات الخاصة تبقى على الورقة المطبوعة. تغيير الملف لا ينشئ وصفة شخصية.");
  }
  return items;
}

export function boliviaConflict() {
  return {
    en: "Yellow fever certificate: verify before travel. The CDC Bolivia page, yellow fever section updated 23 Apr 2025 and page reviewed 10 Nov 2026, says the vaccine is required for all arriving travelers aged 1 year or older. WHO Annex 1 dated 18 Nov 2022, revised 3 Jan 2023, lists Bolivia’s requirement for arrivals from yellow fever-risk countries, not for every origin. These sources differ. Confirm with the Bolivian consulate or health authority and the airline. This desk does not confirm entry.",
    ar: "شهادة الحمى الصفراء: تحقق قبل السفر. صفحة CDC لبوليفيا، قسم الحمى الصفراء المحدّث 23 أبريل 2025 والصفحة المراجعة 10 نوفمبر 2026، تقول إن اللقاح مطلوب لكل القادمين بعمر سنة فأكثر. ملحق WHO المؤرخ 18 نوفمبر 2022 والمراجع 3 يناير 2023 يربط شرط بوليفيا بالقدوم من بلدان خطر الحمى الصفراء لا بكل المناشئ. المصدران يختلفان. تأكد لدى القنصلية أو الجهة الصحية وشركة الطيران. هذا المكتب لا يؤكد الدخول.",
  };
}
