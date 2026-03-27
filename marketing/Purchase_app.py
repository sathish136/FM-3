from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import json

load_dotenv()

def validate_env_vars():
    """Validate required environment variables"""
    api_key = os.getenv("ERP_API_KEY")
    api_secret = os.getenv("ERP_API_SECRET")
    
    if not api_key:
        print("❌ ERROR: ERP_API_KEY environment variable is missing")
        return False
    if not api_secret:
        print("❌ ERROR: ERP_API_SECRET environment variable is missing")
        return False
        
    print("✅ Environment variables validated successfully")
    return True

# Validate environment variables on startup
if not validate_env_vars():
    print("\n⚠️  WARNING: Missing environment variables. API calls will fail.")
    print("Please ensure .env file contains ERP_API_KEY and ERP_API_SECRET")

def get_auth_headers():
    """Get standardized authorization headers"""
    api_key = os.getenv("ERP_API_KEY")
    api_secret = os.getenv("ERP_API_SECRET")
    
    if api_key and api_secret:
        return {"Authorization": f"token {api_key}:{api_secret}"}
    return {}

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

ERP_BASE_URL   = "https://erp.wttint.com"
ERP_API_KEY    = os.getenv("ERP_API_KEY", "")
ERP_API_SECRET = os.getenv("ERP_API_SECRET", "")

print("===========================================")
print("🔑 ERP CONFIG CHECK:")
print(f"ERP_BASE_URL  : {ERP_BASE_URL}")
print(f"ERP_API_KEY   : {'✅ Found (' + ERP_API_KEY[:6] + '...)' if ERP_API_KEY else '❌ MISSING'}")
print(f"ERP_API_SECRET: {'✅ Found (' + ERP_API_SECRET[:6] + '...)' if ERP_API_SECRET else '❌ MISSING'}")
print("===========================================")


def debug_print(title, data):
    print(f"\n===== {title} =====")
    try:
        print(json.dumps(data, indent=2))
    except:
        print(data)


def erp_get(endpoint, params={}):
    url = f"{ERP_BASE_URL}/api/method/{endpoint}"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    # Use standardized auth headers
    auth_headers = get_auth_headers()
    headers.update(auth_headers)
    print(f"📡 GET {url} | params={params}")
    response = requests.get(url, headers=headers, params=params, timeout=15)
    print(f"📬 Status: {response.status_code}")
    return response.json()


def project_params(project):
    if not project or project.strip() == "":
        return {}
    return {"project": project}

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


# ── Shared: project list ──────────────────────────────────────────────────────
@app.route("/api/stores/projects")
def get_projects():
    try:
        data = erp_get("wtt_module.customization.custom.rfq.get_project")
        raw = data.get("message", "")
        projects = []
        for line in raw.strip().split("\n"):
            parts = line.split(" - ", 1)
            code = parts[0].strip()
            name = parts[1].strip() if len(parts) > 1 else code
            projects.append({"code": code, "name": name, "label": f"{code} - {name}"})
        return jsonify({"projects": projects})
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ── Purchase: Dashboard Counts ───────────────────────────────────────────────
@app.route("/api/purchase/dashboard-counts")
def purchase_dashboard_counts():
    project = request.args.get("project", "")
    try:
        data = erp_get(
            "wtt_module.customization.custom.rfq.get_purchase_dashboard_counts",
            project_params(project)
        )
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ── Purchase: MR Made PO Pending ──────────────────────────────────────────────
@app.route("/api/purchase/mr-made-po-pending")
def mr_made_po_pending():
    project = request.args.get("project", "")
    try:
        data = erp_get(
            "wtt_module.customization.custom.rfq.get_mr_made_po_pending",
            project_params(project)
        )
        debug_print("MR MADE PO PENDING", data)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ── Purchase: Completed Purchase Orders ──────────────────────────────────────
@app.route("/api/purchase/completed-purchase-orders")
def completed_purchase_orders():
    project = request.args.get("project", "")
    try:
        data = erp_get(
            "wtt_module.customization.custom.rfq.get_completed_purchase_orders",
            project_params(project)
        )
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ── Purchase: Pending Purchase Orders ────────────────────────────────────────
@app.route("/api/purchase/po-pending")
def po_pending():
    project = request.args.get("project", "")
    try:
        data = erp_get(
            "wtt_module.customization.custom.rfq.get_pending_purchase_orders",
            project_params(project)
        )
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ── Purchase: Completed MR Orders ────────────────────────────────────────────
@app.route("/api/purchase/completed-mr-orders")
def completed_mr_orders():
    project = request.args.get("project", "")
    try:
        data = erp_get(
            "wtt_module.customization.custom.rfq.get_completed_mr_orders",
            project_params(project)
        )
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ── Purchase: Pending MR Orders ──────────────────────────────────────────────
@app.route("/api/purchase/mr-pending")
def mr_pending():
    project = request.args.get("project", "")
    try:
        data = erp_get(
            "wtt_module.customization.custom.rfq.get_pending_mr_orders",
            project_params(project)
        )
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ── Purchase: Pending Payments ───────────────────────────────────────────────
@app.route("/api/purchase/payment-pending")
def payment_pending():
    project = request.args.get("project", "")
    try:
        data = erp_get(
            "wtt_module.customization.custom.rfq.get_pending_payments",
            project_params(project)
        )
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ── Purchase: PO On Transit ──────────────────────────────────────────────────
@app.route("/api/purchase/po-on-transit")
def po_on_transit():
    project = request.args.get("project", "")
    try:
        data = erp_get(
            "wtt_module.customization.custom.rfq.get_po_on_transit",
            project_params(project)
        )
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ── Purchase: PO Delay Transit ───────────────────────────────────────────────
@app.route("/api/purchase/po-delay-transit")
def po_delay_transit():
    project = request.args.get("project", "")
    try:
        data = erp_get(
            "wtt_module.customization.custom.rfq.get_po_delay_transit",
            project_params(project)
        )
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


if __name__ == "__main__":
    print("🚀 Starting Purchase Dashboard server at http://localhost:5001")
    app.run(host="0.0.0.0", port=3000, debug=True)