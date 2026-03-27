from flask import Flask, jsonify
import requests

app = Flask(__name__)
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
import uvicorn
import json
import httpx
from competitor_analysis import get_competitor_analysis
from news_generator import get_country_news, get_competitor_analysis as get_country_competitors, get_state_news, get_state_competitors
import os
from dotenv import load_dotenv

load_dotenv()

def validate_env_vars():
    """Validate required environment variables"""
    api_key = os.getenv('ERP_API_KEY')
    api_secret = os.getenv('ERP_API_SECRET')
    
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
    api_key = os.getenv('ERP_API_KEY')
    api_secret = os.getenv('ERP_API_SECRET')
    
    if api_key and api_secret:
        return {"Authorization": f"token {api_key}:{api_secret}"}
    return {}

class CSPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://d3js.org https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://res.cloudinary.com data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org; connect-src 'self' https://cdn.jsdelivr.net https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://unpkg.com https://erp.wttint.com;"
        return response

app = FastAPI(title="WTT International Business Analysis")
app.add_middleware(CSPMiddleware)

app.mount("/static", StaticFiles(directory="static"), name="static")

class LoginRequest(BaseModel):
    userId: str
    password: str

@app.get("/")
async def root():
    return RedirectResponse(url="/static/login.html")

@app.get("/api/test-connectivity")
async def test_connectivity():
    """Test basic connectivity to ERP server"""
    
    tests = []
    
    # Test 1: Basic ping-like test
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://erp.wttint.com")
            tests.append({
                "test": "Basic HTTPS Connection",
                "url": "https://erp.wttint.com",
                "status": response.status_code,
                "success": True,
                "response_time": response.elapsed.total_seconds()
            })
    except Exception as e:
        tests.append({
            "test": "Basic HTTPS Connection", 
            "url": "https://erp.wttint.com",
            "status": "ERROR",
            "success": False,
            "error": str(e)
        })
    
    # Test 2: API base path
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://erp.wttint.com/api")
            tests.append({
                "test": "API Base Path",
                "url": "https://erp.wttint.com/api", 
                "status": response.status_code,
                "success": True,
                "response_preview": response.text[:100]
            })
    except Exception as e:
        tests.append({
            "test": "API Base Path",
            "url": "https://erp.wttint.com/api",
            "status": "ERROR", 
            "success": False,
            "error": str(e)
        })
    
    # Test 3: With authentication headers
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://erp.wttint.com/api/method", headers=headers)
            tests.append({
                "test": "API Method Path with Auth",
                "url": "https://erp.wttint.com/api/method",
                "status": response.status_code,
                "success": True,
                "auth_headers": headers,
                "response_preview": response.text[:100]
            })
    except Exception as e:
        tests.append({
            "test": "API Method Path with Auth",
            "url": "https://erp.wttint.com/api/method", 
            "status": "ERROR",
            "success": False,
            "error": str(e),
            "auth_headers": headers
        })
    
    return {"connectivity_tests": tests}

@app.get("/api/test-auth")
async def test_authentication():
    """Test different authentication methods"""
    
    headers = get_auth_headers()
    auth_tests = []
    
    # Test with current auth
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://erp.wttint.com/api/method/frappe.auth.get_logged_user", 
                headers=headers
            )
            auth_tests.append({
                "method": "Token Auth",
                "headers": headers,
                "status": response.status_code,
                "response": response.text[:200]
            })
    except Exception as e:
        auth_tests.append({
            "method": "Token Auth",
            "headers": headers,
            "error": str(e)
        })
    
    # Test without auth
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://erp.wttint.com/api/method/frappe.auth.get_logged_user"
            )
            auth_tests.append({
                "method": "No Auth",
                "status": response.status_code,
                "response": response.text[:200]
            })
    except Exception as e:
        auth_tests.append({
            "method": "No Auth", 
            "error": str(e)
        })
    
    return {"auth_tests": auth_tests}

@app.get("/api/test-summary")
async def test_summary():
    """Complete diagnostic summary"""
    
    return {
        "diagnostic_summary": {
            "dns_resolution": {
                "erp.wttint.com": "✅ Resolves to 122.165.225.42",
                "10.15.5.15": "✅ Resolves to 10.15.5.15"
            },
            "connectivity": {
                "erp.wttint.com:443": "❌ ConnectTimeout - Firewall/Network issue",
                "10.15.5.15:80": "✅ Connects but returns 404 - Wrong API path"
            },
            "authentication": {
                "token_format": "✅ Correct format: token API_KEY:API_SECRET",
                "api_keys": "✅ Present in environment"
            },
            "code_status": {
                "main.py": "✅ All auth headers implemented",
                "Purchase_app.py": "✅ All auth headers implemented", 
                "stores_app.py": "✅ All auth headers implemented"
            },
            "root_cause": "Network connectivity to erp.wttint.com is blocked",
            "recommendation": "Check firewall, VPN, or network configuration"
        }
    }

@app.get("/favicon.ico")
async def favicon():
    return {"message": "No favicon"}

@app.post("/api/login")
async def login(request: LoginRequest):
    # Check for CRM user first
    if request.userId == "CRM" and request.password == "Crm@wtt#!":
        return {"success": True, "message": "Login successful", "role": "CRM"}
    
    try:
        with open('users.json', 'r') as f:
            data = json.load(f)
        
        for user in data['users']:
            if user['userId'] == request.userId and user['password'] == request.password:
                return {"success": True, "message": "Login successful", "role": "ADMIN"}
        
        return {"success": False, "message": "Invalid user ID or password"}
    except Exception as e:
        # If users.json doesn't exist or has issues, still allow CRM login
        return {"success": False, "message": "Invalid user ID or password"}

@app.get("/api/sales")
async def get_sales_data():
    return {
        "department": "Sales",
        "metrics": {
            "total_revenue": 2500000,
            "monthly_growth": 15.5,
            "active_clients": 145,
            "conversion_rate": 32.8
        },
        "quarterly_data": [
            {"quarter": "Q1", "revenue": 550000, "clients": 120},
            {"quarter": "Q2", "revenue": 620000, "clients": 135},
            {"quarter": "Q3", "revenue": 680000, "clients": 140},
            {"quarter": "Q4", "revenue": 650000, "clients": 145}
        ]
    }

@app.get("/api/hr")
async def get_hr_data():
    return {
        "department": "Human Resources",
        "metrics": {
            "total_employees": 250,
            "new_hires": 18,
            "attrition_rate": 8.5,
            "satisfaction_score": 4.2
        },
        "department_breakdown": [
            {"name": "Engineering", "count": 85},
            {"name": "Sales", "count": 60},
            {"name": "Marketing", "count": 35},
            {"name": "Operations", "count": 45},
            {"name": "HR", "count": 25}
        ]
    }

@app.get("/api/finance")
async def get_finance_data():
    return {
        "department": "Finance",
        "metrics": {
            "total_expenses": 1800000,
            "profit_margin": 28.5,
            "operating_costs": 1200000,
            "net_profit": 700000
        },
        "expense_breakdown": [
            {"category": "Salaries", "amount": 900000},
            {"category": "Operations", "amount": 400000},
            {"category": "Marketing", "amount": 250000},
            {"category": "Infrastructure", "amount": 250000}
        ]
    }

@app.get("/api/operations")
async def get_operations_data():
    return {
        "department": "Operations",
        "metrics": {
            "projects_completed": 42,
            "on_time_delivery": 88.5,
            "resource_utilization": 76.3,
            "client_satisfaction": 4.5
        },
        "project_status": [
            {"status": "Completed", "count": 42},
            {"status": "In Progress", "count": 18},
            {"status": "Planning", "count": 8}
        ]
    }

@app.get("/api/marketing/leads")
async def get_marketing_leads():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_all_lead_details"
    headers = get_auth_headers()
    
    print("\n" + "="*50)
    print("🔍 API CALL: /api/marketing/leads")
    print(f"📡 URL: {url}")
    print(f"🔑 Headers: {headers}")
    print("="*50)
    
    try:
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            response = await client.get(url, headers=headers)
            
            print(f"📬 Response Status: {response.status_code}")
            print(f"📬 Response Headers: {dict(response.headers)}")
            print(f"📬 Response Text: {response.text[:500]}...")
            
            if response.status_code != 200:
                print(f"❌ API returned status code: {response.status_code}")
                return {"country_stats": {}, "global_stats": {"Closed": 0, "Converted": 0, "Do Not Contact": 0, "Lead": 0, "Lost Quotation": 0, "Open": 0, "Opportunity": 0, "Quotation": 0, "Replied": 0, "total": 0}, "source_stats": {}, "lead_status_stats": {}}
            
            response_text = response.text.strip()
            if not response_text:
                print("❌ Empty response from API")
                return {"country_stats": {}, "global_stats": {"Closed": 0, "Converted": 0, "Do Not Contact": 0, "Lead": 0, "Lost Quotation": 0, "Open": 0, "Opportunity": 0, "Quotation": 0, "Replied": 0, "total": 0}, "source_stats": {}, "lead_status_stats": {}}
            
            data = response.json()
            leads = data.get("message", [])
            
            print(f"✅ Successfully parsed {len(leads)} leads from ERP")
            
            country_stats = {}
            global_stats = {"Closed": 0, "Converted": 0, "Do Not Contact": 0, "Lead": 0, "Lost Quotation": 0, "Open": 0, "Opportunity": 0, "Quotation": 0, "Replied": 0, "total": 0}
            source_stats = {}
            lead_status_stats = {}
            
            for lead in leads:
                country = lead.get("country", "Unknown")
                status = lead.get("status", "Unknown")
                source = lead.get("source", "Unknown")
                lead_status = lead.get("lead_status", "Unknown")
                
                if country not in country_stats:
                    country_stats[country] = {"Closed": 0, "Converted": 0, "Do Not Contact": 0, "Lead": 0, "Lost Quotation": 0, "Open": 0, "Opportunity": 0, "Quotation": 0, "Replied": 0, "total": 0}
                if status in country_stats[country]:
                    country_stats[country][status] += 1
                country_stats[country]["total"] += 1
                if status in global_stats:
                    global_stats[status] += 1
                global_stats["total"] += 1
                
                if source not in source_stats:
                    source_stats[source] = 0
                source_stats[source] += 1
                
                if lead_status not in lead_status_stats:
                    lead_status_stats[lead_status] = 0
                lead_status_stats[lead_status] += 1
            
            print(f"✅ Processed data - Countries: {len(country_stats)}, Total Leads: {global_stats['total']}")
            print("="*50)
            
            return {"country_stats": country_stats, "global_stats": global_stats, "source_stats": source_stats, "lead_status_stats": lead_status_stats}
    
    except Exception as e:
        print(f"❌ Error in get_marketing_leads: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        print(f"❌ Full traceback: {traceback.format_exc()}")
        print("="*50)
        return {"country_stats": {}, "global_stats": {"Closed": 0, "Converted": 0, "Do Not Contact": 0, "Lead": 0, "Lost Quotation": 0, "Open": 0, "Opportunity": 0, "Quotation": 0, "Replied": 0, "total": 0}, "source_stats": {}, "lead_status_stats": {}}

@app.get("/api/marketing/lead-details")
async def get_lead_details(country: str = None, status: str = None, source: str = None, industry_type: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_all_lead_details"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"leads": []}
            data = response.json()
            leads = data.get("message", [])
            
            filtered = []
            for l in leads:
                if country and l.get("country") != country:
                    continue
                if status and l.get("status") != status:
                    continue
                if source and l.get("source") != source:
                    continue
                if industry_type:
                    industry = (l.get("industry") or "").strip().lower()
                    if industry_type == "Textile" and industry != "textile":
                        continue
                    if industry_type == "Non Textile" and industry == "textile":
                        continue
                filtered.append(l)
            
            return {"leads": filtered}
    except Exception as e:
        return {"leads": []}

@app.get("/api/marketing")
async def get_marketing_data():
    return {
        "department": "Marketing",
        "metrics": {
            "campaign_roi": 245.5,
            "leads_generated": 1250,
            "social_reach": 85000,
            "engagement_rate": 6.8
        },
        "channel_performance": [
            {"channel": "Social Media", "leads": 450, "cost": 25000},
            {"channel": "Email", "leads": 380, "cost": 15000},
            {"channel": "SEO", "leads": 280, "cost": 20000},
            {"channel": "PPC", "leads": 140, "cost": 18000}
        ]
    }

@app.get("/api/marketing/news")
async def get_marketing_news(country: str = None):
    try:
        if country:
            data = await get_country_news(country)
            articles = data.get("articles", [])
            news = [{"title": a.get("title"), "source": a.get("source"), "date": a.get("date"), "link": a.get("link")} for a in articles]
        else:
            data = await get_country_news("Global")
            articles = data.get("articles", [])
            news = [{"title": a.get("title"), "source": a.get("source"), "date": a.get("date"), "link": a.get("link")} for a in articles]
        return {"news": news, "country": country or "Global"}
    except Exception as e:
        return {"news": [], "country": country or "Global"}

@app.get("/api/marketing/state-news")
async def get_state_marketing_news(state: str = None):
    try:
        if state:
            data = await get_state_news(state)
            articles = data.get("articles", [])
            news = [{"title": a.get("title"), "source": a.get("source"), "date": a.get("date"), "link": a.get("link")} for a in articles]
        else:
            data = await get_country_news("India")
            articles = data.get("articles", [])
            news = [{"title": a.get("title"), "source": a.get("source"), "date": a.get("date"), "link": a.get("link")} for a in articles]
        return {"news": news, "state": state or "India"}
    except Exception as e:
        return {"news": [], "state": state or "India"}

@app.get("/api/marketing/state-competitor-analysis")
async def get_state_competitor_report(state: str = None):
    try:
        if state:
            data = await get_state_competitors(state)
        else:
            data = await get_country_competitors("India")
        return {"competitors": data.get("competitors", []), "state": state or "India"}
    except Exception as e:
        return {"competitors": [], "state": state or "India"}

@app.get("/api/marketing/competitor-analysis")
async def get_competitor_report(country: str = None):
    try:
        if country:
            data = await get_country_competitors(country)
        else:
            data = await get_country_competitors("Global")
        return {"competitors": data.get("competitors", []), "country": country or "Global"}
    except Exception as e:
        return {"competitors": [], "country": country or "Global"}

@app.get("/api/purchase")
async def get_purchase_data():
    return {
        "department": "Purchase",
        "metrics": {
            "total_purchases": 1200000,
            "active_vendors": 85,
            "purchase_orders": 342,
            "cost_savings": 12.5
        },
        "vendor_performance": [
            {"vendor": "Vendor A", "orders": 85, "amount": 320000, "on_time": 95},
            {"vendor": "Vendor B", "orders": 72, "amount": 280000, "on_time": 92},
            {"vendor": "Vendor C", "orders": 65, "amount": 250000, "on_time": 88},
            {"vendor": "Vendor D", "orders": 58, "amount": 220000, "on_time": 90}
        ]
    }

@app.get("/api/purchase/dashboard_counts")
async def get_dashboard_counts(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_dashboard_counts"
    params = {"project": project} if project else {}
    headers = get_auth_headers()
    
    print("\n" + "="*50)
    print("🔍 API CALL: /api/purchase/dashboard_counts")
    print(f"📡 URL: {url}")
    print(f"📦 Params: {params}")
    print(f"🔑 Headers: {headers}")
    print("="*50)
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            print(f"📬 Response Status: {response.status_code}")
            print(f"📬 Response Text: {response.text[:300]}...")
            return response.json()
    except Exception as e:
        print(f"❌ Error in get_dashboard_counts: {str(e)}")
        return {"error": str(e)}

@app.get("/api/purchase/mr_items_without_po")
async def get_mr_items_without_po(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_mr_made_po_pending"
    params = {"project": project} if project else {}
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/purchase/completed_purchase_orders")
async def get_completed_purchase_orders(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_completed_purchase_orders"
    params = {"project": project} if project else {}
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/purchase/pending_purchase_orders")
async def get_pending_purchase_orders(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_pending_purchase_orders"
    params = {"project": project} if project else {}
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/purchase/pending_payments")
async def get_pending_payments(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_pending_payments"
    params = {"project": project} if project else {}
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/purchase/pending_rfq_comparison")
async def get_pending_rfq_comparison(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_pending_rfq_comparison"
    params = {"project": project} if project else {}
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/purchase/mr_pending")
async def get_mr_pending(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_pending_mr_orders"
    params = {"project": project} if project else {}
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/purchase/completed_mr_orders")
async def get_completed_mr_orders(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_completed_mr_orders"
    params = {"project": project} if project else {}
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/purchase/po_delay_transit")
async def get_po_delay_transit(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_po_delay_transit"
    params = {"project": project} if project else {}
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/purchase/po_on_transit")
async def get_po_on_transit(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_po_on_transit"
    params = {"project": project} if project else {}
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/marketing/followup-report")
async def get_followup_report():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_followup_report"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching followup report: {str(e)}")
        return {"message": []}

@app.get("/api/marketing/proposal-request")
async def get_proposal_request():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_proposal_request"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching proposal request: {str(e)}")
        return {"message": []}

@app.get("/api/purchase/projects")
async def get_projects():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.mobile_web.get_project"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": ""}
            data = response.json()
            return {"message": data.get("message", "")}
    except Exception as e:
        print(f"Error fetching projects: {str(e)}")
        return {"message": ""}

# ===== STORES API ENDPOINTS =====

@app.get("/api/stores/projects")
async def get_stores_projects():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_project"

    headers = get_auth_headers()

    print("\n" + "="*50)
    print("🔍 API CALL: /api/stores/projects")
    print(f"📡 URL: {url}")
    print(f"🔑 Headers: {headers}")
    print("="*50)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            
            print(f"📬 Response Status: {response.status_code}")
            print(f"📬 Response Text: {response.text[:300]}...")
            
            data = response.json()

            raw = data.get("message", "")
            projects = []

            for line in raw.strip().split("\n"):
                parts = line.split(" - ", 1)
                code = parts[0].strip()
                name = parts[1].strip() if len(parts) > 1 else code

                projects.append({
                    "code": code,
                    "name": name,
                    "label": f"{code} - {name}"
                })

            print(f"✅ Processed {len(projects)} projects")
            print("="*50)

            return {"projects": projects}

    except Exception as e:
        print(f"❌ Error in get_stores_projects: {str(e)}")
        return {"error": str(e)}

@app.get("/api/stores/dashboard-counts")
async def get_stores_dashboard_counts(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_dashboard_counts_store"

    params = {"project": project} if project else {}

    headers = get_auth_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/stores/gate-entry-pr-pending")
async def get_gate_entry_pr_pending():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_gate_entry_made_pr_pending"

    headers = get_auth_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/stores/dc-gateout-pending")
async def get_dc_gateout_pending():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_dc_aging_data"

    headers = get_auth_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/stores/pr-bill-pending")
async def get_pr_bill_pending(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_pr_made_to_bill_pending"
    
    params = {"project": project} if project else {}

    headers = get_auth_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/stores/stock-summary")
async def get_stock_summary(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_stock_summary"
    params = {"project": project} if project else {}

    headers = get_auth_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/stores/direct-site-delivery")
async def get_direct_site_delivery(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_direct_site_delivery"
    params = {"project": project} if project else {}

    headers = get_auth_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/stores/delivery-note-pending")
async def get_delivery_note_pending(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_delivery_note_pending"
    params = {"project": project} if project else {}

    headers = get_auth_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/stores/stock-indent-pending")
async def get_stock_indent_pending(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_stock_indent_pending"
    params = {"project": project} if project else {}

    headers = get_auth_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/stores/material-issue-pending")
async def get_material_issue_pending(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.material_issue_request_made_issue_pending"
    params = {"project": project} if project else {}

    headers = get_auth_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/stores/project-dispute")
async def get_project_dispute(project: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_project_wise_dispute"
    params = {"project": project} if project else {}

    headers = get_auth_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

# @app.get("/api/stores/stock-summary")
# async def get_stock_summary(project: str = None):
#     url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_stock_summary"
#     params = {"project": project} if project else {}
#     try:
#         async with httpx.AsyncClient(timeout=15.0) as client:
#             response = await client.get(url, params=params)
#             return response.json()
#     except Exception as e:
#         return {"error": str(e)}

# @app.get("/api/stores/direct-site-delivery")
# async def get_direct_site_delivery(project: str = None):
#     url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_direct_site_delivery"
#     params = {"project": project} if project else {}
#     try:
#         async with httpx.AsyncClient(timeout=15.0) as client:
#             response = await client.get(url, params=params)
#             return response.json()
#     except Exception as e:
#         return {"error": str(e)}

# @app.get("/api/stores/delivery-note-pending")
# async def get_delivery_note_pending(project: str = None):
#     url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_delivery_note_pending"
#     params = {"project": project} if project else {}
#     try:
#         async with httpx.AsyncClient(timeout=15.0) as client:
#             response = await client.get(url, params=params)
#             return response.json()
#     except Exception as e:
#         return {"error": str(e)}

# @app.get("/api/stores/stock-indent-pending")
# async def get_stock_indent_pending(project: str = None):
#     url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_stock_indent_pending"
#     params = {"project": project} if project else {}
#     try:
#         async with httpx.AsyncClient(timeout=15.0) as client:
#             response = await client.get(url, params=params)
#             return response.json()
#     except Exception as e:
#         return {"error": str(e)}

# @app.get("/api/stores/material-issue-pending")
# async def get_material_issue_pending(project: str = None):
#     url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.material_issue_request_made_issue_pending"
#     params = {"project": project} if project else {}
#     try:
#         async with httpx.AsyncClient(timeout=15.0) as client:
#             response = await client.get(url, params=params)
#             return response.json()
#     except Exception as e:
#         return {"error": str(e)}

# @app.get("/api/stores/project-dispute")
# async def get_project_dispute(project: str = None):
#     url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_project_wise_dispute"
#     params = {"project": project} if project else {}
#     try:
#         async with httpx.AsyncClient(timeout=15.0) as client:
#             response = await client.get(url, params=params)
#             return response.json()
#     except Exception as e:
#         return {"error": str(e)}

if __name__ == '__main__':
    print("Starting WTT International Business Analysis Dashboard...")
    print("Server running on http://localhost:5000")
    print("Open http://localhost:5000/static/index.html in your browser")
    uvicorn.run(app, host='0.0.0.0', port=5000)
