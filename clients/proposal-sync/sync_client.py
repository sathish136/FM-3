# -*- coding: utf-8 -*-
"""
WTT Proposal Library -- desktop sync client (single-file edition).

Scans a local folder of proposal PDFs, extracts metadata (customer, revision,
WTT-####, date, country) and pushes the results to the FlowMatrix API.

The folder is auto-detected. The only thing you usually need to provide is
--api-url.

Compatible with Python 3.6+ (CentOS 7 stock python3 included).

Quick start (on the file-server PC):

    pip install PyPDF2 requests

    python3 sync_client.py --api-url https://your-flowmatrix-host.com

    # Continuous mode (re-scans every 5 minutes):
    python3 sync_client.py --api-url https://your-flowmatrix-host.com --watch 300

    # Override the folder if needed:
    python3 sync_client.py --api-url https://... --folder "/srv/proposals"
"""

import argparse
import os
import re
import socket
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import requests
except ImportError as exc:  # pragma: no cover
    raise SystemExit("requests is required. Install with: pip install requests")

try:
    from PyPDF2 import PdfReader
except ImportError as exc:  # pragma: no cover
    raise SystemExit("PyPDF2 is required. Install with: pip install PyPDF2")


DEFAULT_API_KEY = "wtt-proposal-sync-2026"


# ----------------------------- PDF metadata extraction ----------------------

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
    "Australia", "Japan", "Korea", "Russia",
]

# Customer is the segment between the last REV-XX bracket and the WTT-####
# bracket inside the filename, e.g.:
#   PROPOSAL(T&C)-(REV-00)-SQUARE FASHION-(WTT-0609).pdf  ->  SQUARE FASHION
CUSTOMER_FROM_FILENAME = re.compile(r"\)\s*-\s*(.+?)\s*-\s*\(?WTT", re.IGNORECASE)


def _read_text(pdf_path):
    # type: (str) -> Tuple[str, int]
    parts = []  # type: List[str]
    pages = 0
    with open(pdf_path, "rb") as fh:
        reader = PdfReader(fh)
        pages = len(reader.pages)
        for page in reader.pages:
            try:
                parts.append(page.extract_text() or "")
            except Exception:
                continue
    return "\n".join(parts), pages


def _customer(text, filename):
    # type: (str, str) -> Optional[str]
    m = CUSTOMER_FROM_FILENAME.search(filename)
    if m:
        return re.sub(r"\s+", " ", m.group(1).strip(" -()")) or None
    m2 = re.search(
        r"([A-Z][A-Z0-9 &.()-]{2,60}?\s+(?:LTD|LIMITED|GROUP|COMPOSITE|MILLS|TEXTILE))",
        text, re.IGNORECASE,
    )
    return re.sub(r"\s+", " ", m2.group(1)).strip() if m2 else None


def _revision(text, filename):
    # type: (str, str) -> Optional[str]
    m = REV_RE.search(filename)
    if m:
        return m.group(1)
    m2 = re.search(r"Revision[:\s]+([\w.-]+)", text, re.IGNORECASE)
    return m2.group(1) if m2 else None


def _number(text, filename):
    # type: (str, str) -> Optional[str]
    m = WTT_NUMBER_RE.search(filename) or WTT_NUMBER_RE.search(text)
    return "WTT-{0}".format(m.group(1)) if m else None


def _date(text, file_path):
    # type: (str, str) -> Optional[str]
    for pat in DATE_PATTERNS:
        m = pat.search(text)
        if m:
            return m.group(1)
    try:
        return datetime.fromtimestamp(os.path.getmtime(file_path)).strftime("%Y-%m-%d")
    except OSError:
        return None


def _country(text):
    # type: (str) -> Optional[str]
    upper = text.upper()
    for c in COUNTRIES:
        if c.upper() in upper:
            return c
    m = re.search(r"Country[:\s]+([A-Z][A-Za-z ]{2,30})", text)
    return m.group(1).strip() if m else None


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
        "filename":      filename,
        "customer_name": _customer(text, filename),
        "revision":      _revision(text, filename),
        "number":        _number(text, filename),
        "proposal_date": _date(text, pdf_path),
        "country":       _country(text),
        "page_count":    pages,
        "file_size":     file_size,
        "file_mtime":    file_mtime,
        "raw_text":      text[:8000] if text else None,
    }


def analyze_folder(folder):
    # type: (str) -> List[Dict[str, Any]]
    out = []  # type: List[Dict[str, Any]]
    for name in sorted(os.listdir(folder)):
        if name.lower().endswith(".pdf"):
            out.append(extract_pdf_data(os.path.join(folder, name)))
    return out


# ----------------------------- Folder auto-detect ---------------------------

_FOLDER_NAMES = ("proposal", "Proposal", "PROPOSAL", "proposals", "Proposals")


def _candidate_parents():
    # type: () -> List[Path]
    home = Path.home()
    cands = [
        home / "Desktop",
        home / "Documents",
        home / "OneDrive" / "Desktop",
        home / "OneDrive" / "Documents",
        home,
        Path.cwd(),
        Path.cwd().parent,
    ]  # type: List[Path]
    if os.name == "nt":
        for drv in "CDEFGH":
            cands.append(Path("{0}:\\".format(drv)))
            cands.append(Path("{0}:\\Users\\Public\\Desktop".format(drv)))
    return cands


def _has_pdfs(folder):
    # type: (Path) -> bool
    try:
        return any(p.suffix.lower() == ".pdf" for p in folder.iterdir())
    except (OSError, PermissionError):
        return False


def autodetect_folder():
    # type: () -> Optional[str]
    env = os.environ.get("PROPOSAL_FOLDER")
    if env and Path(env).is_dir():
        return str(Path(env))

    for parent in _candidate_parents():
        if not parent.exists():
            continue
        for name in _FOLDER_NAMES:
            cand = parent / name
            if cand.is_dir() and _has_pdfs(cand):
                return str(cand)

    here = Path(__file__).resolve().parent
    if _has_pdfs(here):
        return str(here)
    cwd = Path.cwd()
    if _has_pdfs(cwd):
        return str(cwd)

    for parent in _candidate_parents():
        if not parent.exists():
            continue
        try:
            for child in parent.iterdir():
                if child.is_dir() and "proposal" in child.name.lower() and _has_pdfs(child):
                    return str(child)
        except (OSError, PermissionError):
            continue
    return None


# ----------------------------- HTTP -----------------------------------------

def check_connection(api_url):
    # type: (str) -> Optional[Dict[str, Any]]
    """Ping the API. Returns parsed JSON on success, None on failure (prints reason)."""
    url = api_url.rstrip("/") + "/api/proposals/ping"
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.ConnectionError as exc:
        print("  [X] Connection FAILED -- host unreachable: {0}".format(exc))
    except requests.exceptions.Timeout:
        print("  [X] Connection FAILED -- request timed out")
    except requests.HTTPError as exc:
        print("  [X] Connection FAILED -- HTTP {0}".format(exc.response.status_code if exc.response else "?"))
    except Exception as exc:
        print("  [X] Connection FAILED -- {0}".format(exc))
    return None


def post_batch(api_url, api_key, items):
    # type: (str, str, List[Dict[str, Any]]) -> Dict[str, Any]
    url = api_url.rstrip("/") + "/api/proposals/bulk-upload"
    resp = requests.post(
        url, json={"items": items},
        headers={"x-api-key": api_key, "Content-Type": "application/json"},
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def post_single(api_url, api_key, item):
    # type: (str, str, Dict[str, Any]) -> Dict[str, Any]
    url = api_url.rstrip("/") + "/api/proposals/upload"
    resp = requests.post(
        url, json=item,
        headers={"x-api-key": api_key, "Content-Type": "application/json"},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()


def server_has_file(api_url, filename):
    # type: (str, str) -> bool
    """Quick HEAD check: does the FlowMatrix server already have this PDF?"""
    from urllib.parse import quote
    url = api_url.rstrip("/") + "/api/proposals/file/" + quote(filename, safe="")
    try:
        r = requests.head(url, timeout=15)
        return r.status_code == 200
    except Exception:
        return False


def upload_file(api_url, api_key, full_path):
    # type: (str, str, str) -> bool
    """Upload the raw PDF bytes for a single proposal."""
    from urllib.parse import quote
    filename = os.path.basename(full_path)
    url = api_url.rstrip("/") + "/api/proposals/file/" + quote(filename, safe="")
    try:
        with open(full_path, "rb") as fh:
            data = fh.read()
        resp = requests.post(
            url, data=data,
            headers={
                "x-api-key": api_key,
                "Content-Type": "application/pdf",
            },
            timeout=300,
        )
        resp.raise_for_status()
        return True
    except Exception as exc:
        print("    !! file upload failed for {0}: {1}".format(filename, exc))
        return False


# ----------------------------- Sync core ------------------------------------

def run_once(folder, api_url, api_key, batch_size=25):
    # type: (str, str, str, int) -> int
    if not os.path.isdir(folder):
        sys.stderr.write("[!] Folder not found: {0}\n".format(folder))
        return 0

    host = socket.gethostname()
    print("\n=== WTT Proposal Sync ===")
    print("  Folder : {0}".format(folder))
    print("  API    : {0}".format(api_url))
    print("  Host   : {0}".format(host))

    print("  Status : checking connection...")
    ping = check_connection(api_url)
    if ping is None:
        print("  Status : OFFLINE -- aborting sync\n")
        return 0
    print("  Status : ONLINE  -- {0} (server time {1})".format(
        ping.get("service", "FlowMatrix"), ping.get("server_time", "?")))
    print("")

    results = analyze_folder(folder)
    enriched = []  # type: List[Dict[str, Any]]
    for r in results:
        if "error" in r:
            print("  [skip] {0}: {1}".format(r["filename"], r["error"]))
            continue
        r["source_host"] = host
        r["source_path"] = os.path.join(folder, r["filename"])
        enriched.append(r)
        print(
            "  [ok]   {0:60s} customer={1} number={2} rev={3} country={4}".format(
                r["filename"][:60],
                r.get("customer_name"),
                r.get("number"),
                r.get("revision"),
                r.get("country"),
            )
        )

    if not enriched:
        print("\nNo PDFs to sync.")
        return 0

    sent = 0
    for i in range(0, len(enriched), batch_size):
        chunk = enriched[i : i + batch_size]
        try:
            out = post_batch(api_url, api_key, chunk)
            sent += int(out.get("count", len(chunk)))
            print("  > pushed {0} (total {1}/{2})".format(len(chunk), sent, len(enriched)))
        except requests.HTTPError as e:
            print("  ! batch failed ({0}); falling back to single-row mode".format(e))
            for item in chunk:
                try:
                    post_single(api_url, api_key, item)
                    sent += 1
                except Exception as exc:
                    print("    !! {0}: {1}".format(item["filename"], exc))
        except Exception as exc:
            print("  ! batch error: {0}".format(exc))

    # Upload the actual PDF binaries so the dashboard can preview / download
    # them. Skip files the server already has.
    print("\n  Uploading PDF files to FlowMatrix...")
    files_pushed = 0
    files_skipped = 0
    for r in enriched:
        full = r.get("source_path") or os.path.join(folder, r["filename"])
        if not os.path.isfile(full):
            continue
        if server_has_file(api_url, r["filename"]):
            files_skipped += 1
            continue
        if upload_file(api_url, api_key, full):
            files_pushed += 1
            print("    [file] {0}".format(r["filename"][:80]))

    print(
        "\nDone. {0} metadata, {1} new PDF file(s) uploaded ({2} already present) "
        "from host '{3}' at {4}.".format(
            sent, files_pushed, files_skipped, host,
            datetime.now().isoformat(timespec="seconds"),
        )
    )
    return sent


def main():
    # type: () -> int
    p = argparse.ArgumentParser(
        description="WTT Proposal Library sync client (auto-detects the proposal folder)",
    )
    p.add_argument(
        "--api-url",
        required=("FLOWMATRIX_API_URL" not in os.environ),
        default=os.environ.get("FLOWMATRIX_API_URL"),
        help="FlowMatrix API base URL (e.g. https://flowmatrix.wttindia.com)",
    )
    p.add_argument("--folder", default=None, help="Override the auto-detected proposal folder")
    p.add_argument(
        "--api-key",
        default=os.environ.get("PROPOSAL_SYNC_API_KEY", DEFAULT_API_KEY),
        help="API key (defaults to the built-in shared key)",
    )
    p.add_argument("--batch-size", type=int, default=25)
    p.add_argument(
        "--watch", type=int, default=0, metavar="SECONDS",
        help="Run continuously, re-scanning every N seconds (0 = run once)",
    )
    args = p.parse_args()

    folder = args.folder or autodetect_folder()
    if not folder:
        sys.stderr.write(
            "[!] Could not auto-detect a proposal folder.\n"
            "    Tried Desktop, Documents, OneDrive, drive roots, current folder.\n"
            "    Pass it explicitly with --folder \"<path>\" or set PROPOSAL_FOLDER.\n"
        )
        return 2

    if args.watch <= 0:
        run_once(folder, args.api_url, args.api_key, args.batch_size)
        return 0

    print("[watch] re-scanning every {0}s. Ctrl+C to stop.".format(args.watch))
    while True:
        try:
            run_once(folder, args.api_url, args.api_key, args.batch_size)
        except Exception as exc:
            print("[watch] error: {0}".format(exc))
        time.sleep(args.watch)


if __name__ == "__main__":
    sys.exit(main() or 0)
