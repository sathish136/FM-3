from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import json
from flask import Flask, jsonify
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

app = Flask(__name__)
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


# ✅ DEFINE FIRST
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
    if not project or project == "":
        return {}
    return {"project": project}

@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})

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

@app.route("/api/stores/dashboard-counts")
def dashboard_counts():
    project = request.args.get("project", "")
    try:
        data = erp_get("wtt_module.customization.custom.rfq.get_dashboard_counts_store", project_params(project))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@app.route("/api/stores/gate-entry-pr-pending")
def gate_entry_pr_pending():
    project = request.args.get("project", "")
    try:
        data = erp_get("wtt_module.customization.custom.rfq.get_gate_entry_made_pr_pending", project_params(project))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@app.route("/api/stores/dc-gateout-pending")
def dc_gateout_pending():
    project = request.args.get("project", "")
    try:
        data = erp_get("wtt_module.customization.custom.rfq.get_dc_gateout_pen", project_params(project))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@app.route("/api/stores/pr-bill-pending")
def pr_bill_pending():
    project = request.args.get("project", "")
    try:
        data = erp_get("wtt_module.customization.custom.rfq.get_pr_made_to_bill_pending", project_params(project))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@app.route("/api/stores/returnable-dc")
def returnable_dc():
    project = request.args.get("project", "")
    try:
        data = erp_get("wtt_module.customization.custom.rfq.get_dc_returns", project_params(project))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@app.route("/api/stores/stock-summary")
def stock_summary():
    project = request.args.get("project", "")
    try:
        data = erp_get("wtt_module.customization.custom.rfq.get_stock_summary", project_params(project))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

# @app.route("/api/stores/petty-cash")
# def petty_cash():
#     try:
#         data = erp_get("wtt_module.customization.custom.rfq.get_petty_cash_entries")
#         return jsonify(data)
#     except Exception as e:
#         return jsonify({"error": str(e)}), 502

@app.route("/api/stores/petty-cash")
def petty_cash():
    try:
        data = erp_get("wtt_module.customization.custom.rfq.get_petty_cash_entries")
        
        # ✅ Reusable print
        debug_print("PETTY CASH DATA", data)

        return jsonify(data)

    except Exception as e:
        debug_print("ERROR", str(e))
        return jsonify({"error": str(e)}), 502

@app.route("/api/stores/direct-site-delivery")
def direct_site_delivery():
    project = request.args.get("project", "")
    try:
        data = erp_get("wtt_module.customization.custom.rfq.get_direct_site_delivery", project_params(project))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@app.route("/api/stores/delivery-note-pending")
def delivery_note_pending():
    project = request.args.get("project", "")
    try:
        data = erp_get("wtt_module.customization.custom.rfq.get_delivery_note_pending", project_params(project))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@app.route("/api/stores/stock-indent-pending")
def stock_indent_pending():
    project = request.args.get("project", "")
    try:
        data = erp_get("wtt_module.customization.custom.rfq.get_stock_indent_pending", project_params(project))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

# @app.route("/api/stores/material-issue-pending")
# def material_issue_pending():
#     project = request.args.get("project", "")
#     try:
#         data = erp_get("wtt_module.customization.custom.rfq.material_issue_request_made_issue_pending", project_params(project))
#         return jsonify(data)
#     except Exception as e:
#         return jsonify({"error": str(e)}), 502

@app.route("/api/stores/material-issue-pending")
def material_issue_pending():
    project = request.args.get("project", "")
    
    try:
        print("\n➡️ API CALLED: material_issue_pending")
        print("📌 Project:", project)

        params = project_params(project)
        print("📦 Params:", params)

        data = erp_get(
            "wtt_module.customization.custom.rfq.material_issue_request_made_issue_pending",
            params
        )

        print("✅ ERP RESPONSE:")
        print(data)

        return jsonify(data)

    except Exception as e:
        print("❌ ERROR in material_issue_pending")
        print("Type:", type(e))
        print("Message:", str(e))

        return jsonify({
            "error": str(e),
            "type": str(type(e))
        }), 502

@app.route("/api/stores/project-dispute")
def project_dispute():
    project = request.args.get("project", "")
    try:
        data = erp_get("wtt_module.customization.custom.rfq.get_project_wise_dispute", project_params(project))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

if __name__ == "__main__":
    print("🚀 Starting server at http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)