# Proposal Sync Client

Runs on the WTT file-server PC. Scans the local proposal folder, extracts
metadata from each PDF (customer, revision, WTT number, date, country) and
pushes the results to FlowMatrix → **Marketing & CRM → Proposal Library**.

The folder is **auto-detected** — the only thing you have to give it is the
FlowMatrix API URL.

## Install (one-time)

```powershell
cd clients\proposal-sync
pip install -r requirements.txt
```

## Run once

```powershell
python sync_client.py --api-url https://your-flowmatrix-host.com
```

It will look for a `proposal` (or `Proposals`) folder under `Desktop`,
`Documents`, `OneDrive`, drive roots, or the current directory and start
processing it. You should see something like:

```
=== WTT Proposal Sync ===
  Folder : C:\Users\IT\Desktop\proposal
  API    : https://your-flowmatrix-host.com
  Host   : DESKTOP-WTT01

[ok]   PROPOSAL (T&C) - (REV-00) - SQUARE FASHION - (WTT-0609).pdf
       customer=SQUARE FASHION number=WTT-0609 rev=00 country=Bangladesh
```

## Run continuously (recommended)

Re-scan the folder every 5 minutes:

```powershell
python sync_client.py --api-url https://your-flowmatrix-host.com --watch 300
```

For an unattended setup, register it as a Windows Scheduled Task that runs
"At log on" with the same command.

## Override the folder if auto-detect picks the wrong one

```powershell
python sync_client.py --api-url https://... --folder "D:\Proposals"
```

## Environment variables (alternative to flags)

| Variable | Purpose |
| --- | --- |
| `FLOWMATRIX_API_URL` | Default for `--api-url` (so you can omit it) |
| `PROPOSAL_FOLDER` | Forces a specific folder, skips auto-detect |
| `PROPOSAL_SYNC_API_KEY` | Override the shared sync API key |

## Standalone PDF analyzer

Extract metadata locally without uploading:

```powershell
python pdf_analyzer.py "C:\Users\IT\Desktop\proposal"
```

Add `--json` for machine-readable output.
