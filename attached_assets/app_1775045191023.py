"""
Process & Proposal Dashboard — Flask Backend
============================================
Run:  python app.py
API:  http://localhost:5000/api/<section_key>

Section keys:
  Process  → proc_today, proc_yest, proc_mkt, proc_rd, proc_civil
  Proposal → prop_today, prop_yest, prop_help, prop_week, prop_month
"""

import os
from flask import Flask, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv

# ── LOAD .env FILE ──
load_dotenv(".env")

# ──────────────────────────────────────────────────────────────────────────────
# CONFIG — all values pulled from .env
# ──────────────────────────────────────────────────────────────────────────────

# Flask
FLASK_DEBUG  = os.getenv("FLASK_DEBUG", "True") == "True"
PORT         = int(os.getenv("PORT", 5000))
SECRET_KEY   = os.getenv("SECRET_KEY", "change-me-in-env")

# Database
DB_HOST      = os.getenv("DB_HOST", "localhost")
DB_PORT      = int(os.getenv("DB_PORT", 3306))
DB_NAME      = os.getenv("DB_NAME", "dashboard_db")
DB_USER      = os.getenv("DB_USER", "root")
DB_PASSWORD  = os.getenv("DB_PASSWORD", "")

# ERP / External API
ERP_API_KEY  = os.getenv("ERP_API_KEY", "")
ERP_BASE_URL = os.getenv("ERP_BASE_URL", "")

# ──────────────────────────────────────────────────────────────────────────────
# APP INIT
# ──────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)
app.secret_key = SECRET_KEY
CORS(app)

# ──────────────────────────────────────────────────────────────────────────────
# OPTIONAL: DB CONNECTION HELPER
# Uncomment and fill in when your DB is ready
# ──────────────────────────────────────────────────────────────────────────────

# import mysql.connector   # pip install mysql-connector-python
#
# def get_db():
#     return mysql.connector.connect(
#         host=DB_HOST,
#         port=DB_PORT,
#         database=DB_NAME,
#         user=DB_USER,
#         password=DB_PASSWORD
#     )

# ──────────────────────────────────────────────────────────────────────────────
# ROUTES — PAGES
# ──────────────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

# ──────────────────────────────────────────────────────────────────────────────
# HELPER
# ──────────────────────────────────────────────────────────────────────────────

def ok(data):
    return jsonify(data)

# ──────────────────────────────────────────────────────────────────────────────
# PROCESS ENDPOINTS
# ──────────────────────────────────────────────────────────────────────────────

@app.route("/api/proc_today")
def proc_today():
    """
    Today's pending - Process team.
    Replace list with DB query when ready.

    Row format:
    {
        "date":        "30-03-2026",
        "company":     "Company Name",
        "capacity":    "500 KLD",
        "requirement": "STP",
        "age":         2          # days (int)
    }
    """
    data = [
        # TODO: query using DB_HOST, DB_NAME, DB_USER, DB_PASSWORD
    ]
    return ok(data)


@app.route("/api/proc_yest")
def proc_yest():
    """Yesterday's elevated - Process team."""
    data = [
        # TODO: DB query
    ]
    return ok(data)


@app.route("/api/proc_mkt")
def proc_mkt():
    """Clarification (Marketing Team) - Process team."""
    data = [
        # TODO: DB query
    ]
    return ok(data)


@app.route("/api/proc_rd")
def proc_rd():
    """R&D - Process team."""
    data = [
        # TODO: DB query
    ]
    return ok(data)


@app.route("/api/proc_civil")
def proc_civil():
    """CIVIL - Process team."""
    data = [
        # TODO: DB query
    ]
    return ok(data)

# ──────────────────────────────────────────────────────────────────────────────
# PROPOSAL ENDPOINTS
# ──────────────────────────────────────────────────────────────────────────────

@app.route("/api/prop_today")
def prop_today():
    """Today's pending - Proposal team."""
    data = [
        # TODO: DB query
    ]
    return ok(data)


@app.route("/api/prop_yest")
def prop_yest():
    """Yesterday's pending - Proposal team."""
    data = [
        # TODO: DB query
    ]
    return ok(data)


@app.route("/api/prop_help")
def prop_help():
    """Help needed from other team - Proposal."""
    data = [
        # TODO: DB query
    ]
    return ok(data)


@app.route("/api/prop_week")
def prop_week():
    """Last week / this week proposal completion."""
    data = [
        # TODO: DB query
    ]
    return ok(data)


@app.route("/api/prop_month")
def prop_month():
    """Last month / this month proposal completion."""
    data = [
        # TODO: DB query
    ]
    return ok(data)

# ──────────────────────────────────────────────────────────────────────────────
# RUN
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"  Starting on http://0.0.0.0:{PORT}  |  Debug={FLASK_DEBUG}")
    print(f"  DB -> {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    app.run(debug=FLASK_DEBUG, host="0.0.0.0", port=PORT)