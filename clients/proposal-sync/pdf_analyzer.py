# -*- coding: utf-8 -*-
"""
PDF metadata extractor for the WTT Proposal Library.

Pulls customer name, revision, proposal number (WTT-####), date and country
from each PDF in a folder. Used by sync_client.py to push results to the
Marketing & CRM > Proposal Library API.

Compatible with Python 3.6+.
"""

import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

try:
    from PyPDF2 import PdfReader
except ImportError as e:  # pragma: no cover
    raise SystemExit("PyPDF2 is required. Install with: pip install PyPDF2")


# ----- patterns --------------------------------------------------------------

WTT_NUMBER_RE = re.compile(r"WTT[-\s]?(\d+)", re.IGNORECASE)
REV_RE = re.compile(r"REV[-\s]?(\d+(?:\.\d+)?(?:-\d+)?)", re.IGNORECASE)

DATE_PATTERNS = [
    re.compile(r"\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b"),
    re.compile(r"\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b"),
    re.compile(
        r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b",
        re.IGNORECASE,
    ),
]

COUNTRIES = [
    "Bangladesh", "India", "Sri Lanka", "Pakistan", "Nepal", "Bhutan",
    "Maldives", "Afghanistan", "China", "Vietnam", "Thailand", "Indonesia",
    "Malaysia", "Singapore", "Philippines", "Myanmar", "Cambodia", "Laos",
    "Brunei", "UAE", "United Arab Emirates", "Saudi Arabia", "Qatar",
    "Kuwait", "Oman", "Bahrain", "Iraq", "Jordan", "Lebanon", "Syria",
    "Yemen", "Turkey", "Iran", "Israel", "Egypt", "Libya", "Tunisia",
    "Algeria", "Morocco", "Sudan", "Ethiopia", "Kenya", "Tanzania",
    "Uganda", "Rwanda", "Burundi", "South Africa", "Zimbabwe", "Zambia",
    "Botswana", "Namibia", "Angola", "Mozambique", "Madagascar",
    "Mauritius", "Seychelles", "Ghana", "Nigeria", "USA", "United States",
    "UK", "United Kingdom", "Germany", "France", "Italy", "Spain",
    "Portugal", "Netherlands", "Belgium", "Switzerland", "Austria", "Poland",
    "Greece", "Romania", "Ireland", "Sweden", "Norway", "Denmark", "Finland",
    "Australia", "New Zealand", "Japan", "South Korea", "Korea", "Russia",
    # Americas
    "Mexico", "El Salvador", "Guatemala", "Honduras", "Nicaragua",
    "Costa Rica", "Panama", "Cuba", "Dominican Republic", "Haiti",
    "Jamaica", "Trinidad", "Colombia", "Venezuela", "Ecuador", "Peru",
    "Bolivia", "Brazil", "Chile", "Argentina", "Uruguay", "Paraguay",
    "Canada",
]

# Match the customer segment that sits between the REV-XX token and the WTT-#### token.
# Examples:
#   PROPOSAL(T&C)-(REV-00)-AZAD RIFAT FIBRES-ETP-(WTT-1047).pdf  ->  AZAD RIFAT FIBRES-ETP
#   PROPOSALTC-REV-01-KNIT PLUS LTD-WTT-0597.pdf                 ->  KNIT PLUS LTD
CUSTOMER_FROM_FILENAME = re.compile(
    r"-\(?REV[-\s]?\d[\w.-]*\)?[-\s)]*[-\s]*(.+?)\s*-\s*\(?WTT",
    re.IGNORECASE,
)


# ----- helpers ---------------------------------------------------------------

def _read_text(pdf_path):
    # type: (str) -> Tuple[str, int]
    """Return (joined_text, page_count)."""
    text_parts = []  # type: List[str]
    pages = 0
    with open(pdf_path, "rb") as fh:
        reader = PdfReader(fh)
        pages = len(reader.pages)
        for page in reader.pages:
            try:
                text_parts.append(page.extract_text() or "")
            except Exception:
                continue
    return "\n".join(text_parts), pages


def extract_customer(text, filename):
    # type: (str, str) -> Optional[str]
    m = CUSTOMER_FROM_FILENAME.search(filename)
    if m:
        name = m.group(1).strip(" -()")
        name = re.sub(r"\s+", " ", name)
        return name or None

    company_re = re.compile(
        r"([A-Z][A-Z0-9 &.()-]{2,60}?\s+(?:LTD|LIMITED|GROUP|COMPOSITE|MILLS|TEXTILE))",
        re.IGNORECASE,
    )
    m2 = company_re.search(text)
    if m2:
        return re.sub(r"\s+", " ", m2.group(1)).strip()
    return None


def extract_revision(text, filename):
    # type: (str, str) -> Optional[str]
    m = REV_RE.search(filename)
    if m:
        return m.group(1)
    m2 = re.search(r"Revision[:\s]+([\w.-]+)", text, re.IGNORECASE)
    return m2.group(1) if m2 else None


def extract_number(text, filename):
    # type: (str, str) -> Optional[str]
    m = WTT_NUMBER_RE.search(filename)
    if m:
        return "WTT-{0}".format(m.group(1))
    m2 = WTT_NUMBER_RE.search(text)
    if m2:
        return "WTT-{0}".format(m2.group(1))
    return None


def extract_date(text, file_path):
    # type: (str, str) -> Optional[str]
    for pat in DATE_PATTERNS:
        m = pat.search(text)
        if m:
            return m.group(1)
    try:
        ts = os.path.getmtime(file_path)
        return datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
    except OSError:
        return None


_WTT_SELF_KEYWORDS = (
    "WTT INTERNATIONAL", "WATER LOVING TECHNOLOGIES", "WATERLOVINGTECHNOLOGIES",
    "BANGALORE", "BENGALURU", "KARNATAKA",
    # WTT's own contact details — discovered from sample proposals
    "INFO@WTTINDIA", "WTTINDIA.COM", "WWW.WTTINDIA",
)

# Map common city / region tokens to a country, used as a stronger hint
# than a bare country name (handles "KAHRAMANMARAS" -> Turkey, etc.).
_CITY_HINTS = {
    "DHAKA": "Bangladesh", "CHITTAGONG": "Bangladesh", "GAZIPUR": "Bangladesh",
    "NARAYANGANJ": "Bangladesh", "SAVAR": "Bangladesh", "TONGI": "Bangladesh",
    "ASHULIA": "Bangladesh", "MIRPUR": "Bangladesh",
    "ISTANBUL": "Turkey", "ANKARA": "Turkey", "IZMIR": "Turkey",
    "BURSA": "Turkey", "GAZIANTEP": "Turkey", "KAHRAMANMARAS": "Turkey",
    "KAYSERI": "Turkey", "DENIZLI": "Turkey", "ADANA": "Turkey",
    "KARACHI": "Pakistan", "LAHORE": "Pakistan", "FAISALABAD": "Pakistan",
    "COLOMBO": "Sri Lanka", "KATUNAYAKE": "Sri Lanka",
    "HANOI": "Vietnam", "HO CHI MINH": "Vietnam", "SAIGON": "Vietnam",
    "JAKARTA": "Indonesia", "BANDUNG": "Indonesia", "SURABAYA": "Indonesia",
    "BANGKOK": "Thailand", "PHNOM PENH": "Cambodia",
    "DUBAI": "UAE", "ABU DHABI": "UAE", "SHARJAH": "UAE",
    "RIYADH": "Saudi Arabia", "JEDDAH": "Saudi Arabia",
    "CAIRO": "Egypt", "ALEXANDRIA": "Egypt",
    "ADDIS ABABA": "Ethiopia", "NAIROBI": "Kenya",
    "LAGOS": "Nigeria", "ACCRA": "Ghana",
    "GUANGZHOU": "China", "SHENZHEN": "China", "SHANGHAI": "China",
    "CHENNAI": "India", "MUMBAI": "India", "TIRUPUR": "India",
    "COIMBATORE": "India", "AHMEDABAD": "India", "SURAT": "India",
    "DELHI": "India", "NEW DELHI": "India", "GURGAON": "India",
    "NOIDA": "India", "KOLKATA": "India", "PUNE": "India",
    "HYDERABAD": "India", "LUDHIANA": "India",
}


def _word_in(haystack_upper, needle_upper):
    # type: (str, str) -> bool
    """Substring check with word boundaries on both sides."""
    pat = r"\b" + re.escape(needle_upper) + r"\b"
    return re.search(pat, haystack_upper) is not None


def _scan_block_for_country(block_upper):
    # type: (str) -> Optional[str]
    """Return the earliest-position country / city-hint match in a text block."""
    earliest = None  # type: Optional[Tuple[int, str]]
    for c in COUNTRIES:
        m = re.search(r"\b" + re.escape(c.upper()) + r"\b", block_upper)
        if m and (earliest is None or m.start() < earliest[0]):
            earliest = (m.start(), c)
    for city, country in _CITY_HINTS.items():
        m = re.search(r"\b" + re.escape(city) + r"\b", block_upper)
        if m and (earliest is None or m.start() < earliest[0]):
            earliest = (m.start(), country)
    return earliest[1] if earliest else None


def extract_country(text):
    # type: (str) -> Optional[str]
    """
    Detect the customer's country.

    The PDFs are WTT proposals: WTT itself is in Bengaluru, India and that
    address appears in the header / footer of every page. The customer's
    country lives in the "To: ..." address block at the top, so we look there
    first and ignore lines that are clearly WTT's own contact details.
    """
    if not text:
        return None
    upper = text.upper()

    # 1. Try the customer address block, which usually starts with "To" or "M/s."
    candidates = []  # type: List[str]
    for pat in (
        r"\bTO\b\s*[:\-]?\s*\n?(.{0,500}?)(?:SUBJECT|SUB[:\s]|REF[:\s]|DEAR\s|WE\s|GENTLEMEN|KIND\s+ATTN|ATTN[:\s])",
        r"\bM\s*/?\s*S\.?\s+(.{0,400})",
        r"\bTO\b\s*[:\-]?\s*\n?(.{0,400})",
    ):
        m = re.search(pat, upper, re.DOTALL)
        if m:
            candidates.append(m.group(1))

    for block in candidates:
        hit = _scan_block_for_country(block)
        if hit:
            return hit

    # 2. Explicit "Country: X" tag wins next
    m2 = re.search(r"\bCountry\b[:\s]+([A-Z][A-Za-z ]{2,30})", text)
    if m2:
        cand = m2.group(1).strip().rstrip(".,;:")
        for c in COUNTRIES:
            if c.upper() == cand.upper():
                return c
        return cand

    # 3. Fallback: scan whole text but skip lines that are clearly WTT's own
    #    contact details. Take the earliest-position match in the remaining text.
    cleaned_lines = []
    for line in upper.split("\n"):
        if any(kw in line for kw in _WTT_SELF_KEYWORDS):
            continue
        cleaned_lines.append(line)
    cleaned = "\n".join(cleaned_lines)
    return _scan_block_for_country(cleaned)


# ----- public API ------------------------------------------------------------

def extract_pdf_data(pdf_path):
    # type: (str) -> Dict[str, Any]
    """Extract metadata from a PDF. Never raises -- returns {'error': ...}."""
    filename = os.path.basename(pdf_path)
    try:
        text, pages = _read_text(pdf_path)
    except Exception as exc:
        return {"filename": filename, "error": "read failed: {0}".format(exc)}

    try:
        st = os.stat(pdf_path)
        file_size = st.st_size
        file_mtime = datetime.fromtimestamp(st.st_mtime).isoformat()
    except OSError:
        file_size = None
        file_mtime = None

    return {
        "filename": filename,
        "customer_name": extract_customer(text, filename),
        "revision": extract_revision(text, filename),
        "number": extract_number(text, filename),
        "proposal_date": extract_date(text, pdf_path),
        "country": extract_country(text),
        "page_count": pages,
        "file_size": file_size,
        "file_mtime": file_mtime,
        "raw_text": text[:8000] if text else None,
    }


def analyze_folder(folder):
    # type: (str) -> List[Dict[str, Any]]
    out = []  # type: List[Dict[str, Any]]
    for name in sorted(os.listdir(folder)):
        if not name.lower().endswith(".pdf"):
            continue
        full = os.path.join(folder, name)
        out.append(extract_pdf_data(full))
    return out


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Extract proposal metadata from PDFs")
    parser.add_argument("folder", help="Folder containing PDF files")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of text")
    args = parser.parse_args()

    results = analyze_folder(args.folder)
    if args.json:
        print(json.dumps(results, indent=2, default=str))
    else:
        for r in results:
            print("\nAnalyzing: {0}".format(r["filename"]))
            if "error" in r:
                print("  Error: {0}".format(r["error"]))
                continue
            print("  Customer: {0}".format(r.get("customer_name")))
            print("  Revision: {0}".format(r.get("revision")))
            print("  Number:   {0}".format(r.get("number")))
            print("  Date:     {0}".format(r.get("proposal_date")))
            print("  Country:  {0}".format(r.get("country")))
        print("\nTotal PDFs analyzed: {0}".format(len(results)))
