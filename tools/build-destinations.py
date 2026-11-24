#!/usr/bin/env python3
"""Pull CDC destination pages and write data/destinations.json.

Run from the repo root when regenerating. The committed JSON is what GitHub
Pages serves; this script is not part of the request path.
Accessed 24 November 2026.
"""
from __future__ import annotations

import html
import json
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path("/tmp/sources")
OUT = ROOT / "data" / "destinations.json"
CHECKED = "2026-11-24"
UA = "Mozilla/5.0 (compatible; travel-medicine-audit/1.0; educational)"

OVERRIDES = {
    "CIV": "ivory-coast",
    "COD": "democratic-republic-of-congo",
    "COG": "congo",
    "TLS": "east-timor",
    "MMR": "burma",
    "HKG": "hong-kong-sar",
    "PSE": None,
    "TTO": "trinidad-and-tobago",
    "BIH": "bosnia-and-herzegovina",
    "DOM": "dominican-republic",
    "CAF": "central-african-republic",
    "GNB": "guinea-bissau",
    "SLE": "sierra-leone",
    "GNQ": "equatorial-guinea",
    "PNG": "papua-new-guinea",
    "NZL": "new-zealand",
    "ZAF": "south-africa",
    "SSD": "south-sudan",
    "KOR": "south-korea",
    "PRK": "north-korea",
    "ARE": "united-arab-emirates",
    "GBR": "united-kingdom",
    "USA": "united-states",
    "NLD": "netherlands",
    "CZE": "czechia",
    "CPV": "cape-verde",
    "SWZ": "eswatini",
    "MKD": "north-macedonia",
    "MDA": "moldova",
    "RUS": "russia",
    "LAO": "laos",
    "VNM": "vietnam",
    "TUR": "turkey",
    "SYR": "syria",
    "TWN": "taiwan",
    "PRI": "puerto-rico",
    "NCL": "new-caledonia",
    "PYF": "french-polynesia",
    "SLB": "solomon-islands",
    "BHS": "the-bahamas",
    "GMB": "the-gambia",
    "BRB": "barbados",
    "TZA": "tanzania",
    "COD": "democratic-republic-of-congo",
}

HEADS = {
    "Hepatitis A", "Hepatitis B", "Japanese Encephalitis", "Malaria", "Measles",
    "Meningococcal disease", "Polio", "Rabies", "Typhoid", "Yellow Fever",
    "Cholera", "COVID-19", "Tick-borne Encephalitis", "Monkeypox", "Chikungunya",
}

VACCINE_IDS = {
    "Hepatitis A": "hepa",
    "Hepatitis B": "hepb",
    "Japanese Encephalitis": "je",
    "Meningococcal disease": "men",
    "Polio": "polio",
    "Rabies": "rabies",
    "Typhoid": "typhoid",
    "Yellow Fever": "yf",
    "Cholera": "cholera",
    "COVID-19": "covid",
    "Tick-borne Encephalitis": "tbe",
    "Chikungunya": "chik",
}

WHO_NAME = {
    "Cabo Verde": "CPV",
    "Cape Verde": "CPV",
    "Czechia": "CZE",
    "United Kingdom of Great Britain and Northern Ireland": "GBR",
    "Netherlands (Kingdom of the)": "NLD",
    "United States of America": "USA",
    "Republic of Moldova": "MDA",
    "Republic of North Macedonia": "MKD",
    "Russian Federation": "RUS",
    "United Arab Emirates": "ARE",
    "France (Metropolitan)": "FRA",
    "Bosnia and Herzegovina": "BIH",
    "Bolivia (Plurinational State of)": "BOL",
    "Venezuela (Bolivarian Republic of)": "VEN",
    "Iran (Islamic Republic of)": "IRN",
    "Republic of Korea": "KOR",
    "Democratic People's Republic of Korea": "PRK",
    "Viet Nam": "VNM",
    "Lao People's Democratic Republic": "LAO",
    "Syrian Arab Republic": "SYR",
    "Türkiye": "TUR",
    "Turkey": "TUR",
    "United Republic of Tanzania": "TZA",
    "Côte d'Ivoire": "CIV",
    "Congo": "COG",
    "Democratic Republic of the Congo": "COD",
    "Timor-Leste": "TLS",
    "Eswatini": "SWZ",
    "North Macedonia": "MKD",
    "Moldova": "MDA",
    "Brunei Darussalam": "BRN",
    "Micronesia (Federated States of)": None,
    "La Réunion (France)": None,
    "Taiwan (China)": "TWN",
}


def fetch(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 1000:
        return True
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            dest.write_bytes(resp.read())
        return True
    except Exception as exc:
        print("FAIL", url, type(exc).__name__, exc)
        return False


def to_lines(raw: str) -> list[str]:
    text = re.sub(r"<script[\s\S]*?</script>", " ", raw, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</(p|div|li|h\d|tr|td|th|section)>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    out = []
    for line in text.split("\n"):
        line = re.sub(r"\s+", " ", line).strip()
        if line:
            out.append(line)
    return out


def clip(s: str, n: int = 700) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def parse_page(raw: str) -> dict:
    ls = to_lines(raw)
    reviewed = ""
    for i, line in enumerate(ls):
        if line.startswith("Page last reviewed:"):
            reviewed = line.split(":", 1)[1].strip()
            if not reviewed and i + 1 < len(ls):
                reviewed = ls[i + 1]
            break
    # clinical window: stop before the repeated non-vaccine table
    starts = [i for i, line in enumerate(ls) if line == "Vaccines and Medicines"]
    stops = [i for i, line in enumerate(ls) if line == "Non-Vaccine-Preventable Diseases"]
    start = starts[1] if len(starts) > 1 else (starts[0] if starts else 0)
    stop = stops[1] if len(stops) > 1 else (stops[-1] if stops else len(ls))
    if stop <= start:
        stop = len(ls)
    window = ls[start:stop]

    def clinical_at(i: int) -> bool:
        if i + 1 >= len(window):
            return False
        nxt = window[i + 1]
        if nxt in HEADS or len(nxt) < 12:
            return False
        return True

    sections = {}
    for i, line in enumerate(window):
        if line in HEADS and line not in sections and clinical_at(i):
            buf = []
            j = i + 1
            while j < len(window) and window[j] not in HEADS and len(buf) < 24:
                if window[j] in {"Top", "Hide", "See footnotes"}:
                    j += 1
                    continue
                buf.append(window[j])
                j += 1
            sections[line] = buf

    malaria = None
    if "Malaria" in sections:
        blob = sections["Malaria"]
        if "Transmission areas" in blob:
            def grab(label, stop_labels):
                if label not in blob:
                    return ""
                k = blob.index(label) + 1
                parts = []
                while k < len(blob) and blob[k] not in stop_labels:
                    parts.append(blob[k])
                    k += 1
                return clip(" ".join(parts), 900)

            areas = grab("Transmission areas", {"Drug resistance", "Drug resistance 1", "Species", "Recommended chemoprophylaxis", "Updated April 23, 2025"})
            # resistance label may include a footnote number
            res_label = next((x for x in blob if x.startswith("Drug resistance")), "")
            resistance = ""
            if res_label:
                k = blob.index(res_label) + 1
                parts = []
                while k < len(blob) and blob[k] not in {"Species", "Recommended chemoprophylaxis"} and not blob[k].startswith("P. "):
                    parts.append(blob[k])
                    k += 1
                resistance = clip(" ".join(parts), 240)
            proph = grab("Recommended chemoprophylaxis", {"Updated April 23, 2025", "Updated", "See footnotes", "Malaria - CDC Yellow Book"})
            updated = next((x.replace("Updated", "").strip() for x in blob if x.startswith("Updated ")), "")
            malaria = {
                "areas": areas,
                "resistance": resistance,
                "prophylaxis": proph,
                "sectionUpdated": updated or "April 23, 2025",
            }

    yf = None
    if "Yellow Fever" in sections:
        blob = sections["Yellow Fever"]
        text = " ".join(blob)
        # split recommendation vs entry
        rec, entry, updated = "", "", ""
        if "CDC recommendations:" in text:
            rest = text.split("CDC recommendations:", 1)[1]
            if "Country entry requirements:" in rest:
                rec, rest2 = rest.split("Country entry requirements:", 1)
                if "Updated " in rest2:
                    entry, upd = rest2.split("Updated ", 1)
                    updated = upd.split(" Yellow")[0].strip().split(" See footnotes")[0].strip()
                else:
                    entry = rest2
            else:
                rec = rest
            rec = rec.split(" Updated ")[0]
        yf = {
            "recommendation": clip(rec, 1100),
            "entry": clip(entry, 1100),
            "sectionUpdated": updated or "April 23, 2025",
        }

    vaccines = []
    for name, buf in sections.items():
        if name in {"Malaria", "Yellow Fever", "Measles", "Monkeypox"}:
            continue
        if name not in VACCINE_IDS:
            continue
        lead = buf[0] if buf else ""
        extra = ""
        if name == "Rabies" and len(buf) > 1:
            extra = buf[1]
        if name == "Polio" and len(buf) > 2:
            extra = " ".join(buf[:3])
        vaccines.append({
            "id": VACCINE_IDS[name],
            "name": name,
            "lead": clip(lead if name != "Polio" else " ".join(buf[:3]), 500),
            "note": clip(extra, 300) if name == "Rabies" else "",
        })

    risks = []
    for name in ("Japanese Encephalitis", "Cholera", "Chikungunya", "Tick-borne Encephalitis"):
        if name in sections:
            risks.append(VACCINE_IDS[name])
    # dengue / schisto only if a short heading exists in the clinical window
    joined = " | ".join(window)
    if any(line == "Dengue" for line in window):
        risks.append("dengue")
    if any(line == "Schistosomiasis" for line in window):
        risks.append("schisto")
    nv = [i for i, line in enumerate(ls) if line == "Non-Vaccine-Preventable Diseases"]
    stay = [i for i, line in enumerate(ls) if line == "Stay Healthy and Safe"]
    if len(nv) > 1:
        a = nv[1]
        b = next((i for i in stay if i > a), min(len(ls), a + 40))
        block = set(ls[a:b])
        if "Dengue" in block and "dengue" not in risks:
            risks.append("dengue")
        if "Schistosomiasis" in block and "schisto" not in risks:
            risks.append("schisto")
    if "Rabies" in sections:
        lead = sections["Rabies"][0].lower()
        avail = " ".join(sections["Rabies"][:4]).lower()
        if "not commonly found" not in lead and ("commonly found" in lead or "not readily available" in avail):
            risks.append("rabies")

    return {
        "pageReviewed": reviewed,
        "malaria": malaria,
        "yellowFever": yf,
        "vaccines": vaccines,
        "topics": risks,
    }


def load_who() -> dict:
    raw = (CACHE / "who-malaria.html").read_text(errors="replace")
    rows = re.findall(r"<tr[\s\S]*?</tr>", raw, flags=re.I)
    found = {}
    for row in rows:
        cells = re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", row, flags=re.I)
        cells = [html.unescape(re.sub(r"\s+", " ", re.sub("<[^>]+>", "", c))).strip() for c in cells]
        if len(cells) < 3 or not cells[0] or cells[0].endswith("Mediterranean") or "Asia" in cells[0] or cells[0] in {"Africa", "Europe", "Americas", "Western Pacific", "South-East Asia", "Country/territory"}:
            continue
        if not re.search(r"\d{4}", " ".join(cells[1:])):
            continue
        found[cells[0]] = {"certified": cells[1], "historical": cells[2]}
    # footnote d
    if "Taiwan (China) was certified malaria-free in November 1965" in raw:
        found["Taiwan (China)"] = {"certified": "1965", "historical": "", "footnote": "d"}
    return found


def who_for_iso(who: dict, iso: str, name: str) -> dict | None:
    # direct
    for label, row in who.items():
        mapped = WHO_NAME.get(label)
        if mapped == iso:
            return {"whoName": label, **row}
    # exact name
    for label, row in who.items():
        if label == name or label.startswith(name + " "):
            return {"whoName": label, **row}
    return None


DRUGS = ["atovaquone-proguanil", "doxycycline", "mefloquine", "tafenoquine", "primaquine", "chloroquine"]


def drugs_in(text: str) -> list[str]:
    low = text.lower()
    # only the prophylaxis sentence, ignore "no chemoprophylaxis"
    if "no chemoprophylaxis" in low:
        # still record drugs named before that clause if a subregion lists them
        pass
    found = []
    for drug in DRUGS:
        if drug in low:
            found.append(drug)
    return found


def malaria_band(malaria: dict | None, who_row: dict | None) -> str:
    if malaria:
        pro = (malaria.get("prophylaxis") or "").lower()
        areas = (malaria.get("areas") or "").lower()
        if pro.startswith("none") or "no chemoprophylaxis" in pro and "atovaquone" not in pro:
            return "none"
        if "no chemoprophylaxis" in pro and "atovaquone" in pro:
            return "limited"
        if any(k in areas for k in ("only", "rare", "no malaria", "previously")):
            return "limited"
        return "present"
    if who_row and (who_row.get("certified") or who_row.get("historical")):
        return "none"
    return "unknown"


def main() -> None:
    seed = ROOT / "data" / "destinations.json"
    legacy = Path("/tmp/countries.json")
    if seed.exists():
        countries = json.loads(seed.read_text())
    else:
        countries = json.loads(legacy.read_text())
    slugs = set(json.loads((CACHE / "slugs.json").read_text()))
    who = load_who()
    jobs = []
    for c in countries:
        iso = c["iso"]
        slug = OVERRIDES[iso] if iso in OVERRIDES else re.sub(r"[^a-z0-9]+", "-", c["name"].lower()).strip("-")
        if slug and slug not in slugs:
            # try a few aliases
            for alias in c.get("aliases") or []:
                cand = re.sub(r"[^a-z0-9]+", "-", alias.lower()).strip("-")
                if cand in slugs:
                    slug = cand
                    break
        if slug and slug not in slugs:
            print("NO SLUG", iso, c["name"], slug)
            slug = None
        jobs.append((c, slug))

    def one(item):
        c, slug = item
        if not slug:
            return c["iso"], None
        dest = CACHE / "cdc" / f"{slug}.html"
        url = f"https://wwwnc.cdc.gov/travel/destinations/traveler/none/{slug}"
        ok = fetch(url, dest)
        if not ok:
            time.sleep(0.4)
            ok = fetch(url, dest)
        if not ok:
            return c["iso"], None
        parsed = parse_page(dest.read_text(errors="replace"))
        parsed["slug"] = slug
        parsed["url"] = url
        return c["iso"], parsed

    parsed_by = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = [pool.submit(one, item) for item in jobs]
        for fut in as_completed(futs):
            iso, parsed = fut.result()
            parsed_by[iso] = parsed
            print(("OK " if parsed else "MISS"), iso)

    records = []
    for c in countries:
        iso = c["iso"]
        parsed = parsed_by.get(iso)
        who_row = who_for_iso(who, iso, c["name"])
        malaria = parsed.get("malaria") if parsed else None
        band = malaria_band(malaria, who_row)
        conflict = False
        if malaria and who_row and (who_row.get("certified") or who_row.get("historical")) and band == "present":
            conflict = True
        if parsed and (malaria or who_row or (parsed.get("yellowFever") or {}).get("recommendation")):
            if conflict or band == "unknown":
                status = "partial"
            else:
                status = "reviewed"
        elif parsed:
            status = "partial"
        else:
            status = "unreviewed"

        drug_list = drugs_in(malaria["prophylaxis"]) if malaria else []
        resistance = (malaria or {}).get("resistance") or ""
        res_low = resistance.lower()
        chloroquine_r = "chloroquine" in res_low and not res_low.startswith("previously") and "none" not in res_low
        mefloquine_r = "mefloquine" in res_low and not res_low.startswith("previously")

        record = {
            "iso": iso,
            "name": c["name"],
            "name_ar": c.get("name_ar") or "",
            "aliases": c.get("aliases") or [],
            "region": c.get("region") or "",
            "status": status,
            "checkedAt": CHECKED if parsed else None,
            "pageReviewed": (parsed or {}).get("pageReviewed") or None,
            "cdcUrl": (parsed or {}).get("url"),
            "malaria": {
                "band": band,
                "areas": (malaria or {}).get("areas") or "",
                "resistance": resistance,
                "prophylaxis": (malaria or {}).get("prophylaxis") or "",
                "drugs": drug_list,
                "chloroquineResistance": bool(chloroquine_r) if malaria else None,
                "mefloquineResistance": bool(mefloquine_r) if malaria else None,
                "sectionUpdated": (malaria or {}).get("sectionUpdated"),
                "tablePresent": bool(malaria),
                "conflictWithWho": conflict,
            },
            "whoMalaria": who_row,
            "yellowFever": (parsed or {}).get("yellowFever") or None,
            "vaccines": (parsed or {}).get("vaccines") or [],
            "topics": (parsed or {}).get("topics") or [],
        }
        if iso == "PSE":
            record["status"] = "partial"
            record["checkedAt"] = CHECKED
            record["cdcUrl"] = None
            record["gap"] = (
                "No separate CDC destination page for Palestine was on the CDC destination list read on 24 Nov 2026. "
                "The CDC Global Polio notice (updated 23 Sep 2026; notices index read 24 Nov 2026) names the West Bank and Gaza. "
                "Malaria, yellow fever, and other destination lines were not reviewed."
            )
        records.append(record)

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(records, ensure_ascii=False, indent=1))
    from collections import Counter
    print(Counter(r["status"] for r in records))
    print("wrote", OUT, "bytes", OUT.stat().st_size)
    unmatched_who = []
    mapped = {r["iso"] for r in records if r["whoMalaria"]}
    print("who matched", len(mapped))


if __name__ == "__main__":
    main()
