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
        print("ERROR: ERP_API_KEY environment variable is missing")
        return False
    if not api_secret:
        print("ERROR: ERP_API_SECRET environment variable is missing")
        return False
        
    print("Environment variables validated successfully")
    return True

# Validate environment variables on startup
if not validate_env_vars():
    print("\nWARNING: Missing environment variables. API calls will fail.")
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
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://d3js.org https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://res.cloudinary.com data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org; connect-src 'self' https://cdn.jsdelivr.net https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://unpkg.com https://erp.wttint.com;"
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

@app.get("/api/hr/leave-details")
async def get_hr_leave_details():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_leave_details"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR leave details: {str(e)}")
        return {"message": []}

@app.get("/api/hr/attendance-summary")
async def get_hr_attendance_summary():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_attendance_summary"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": {"total_employees": 128, "present": 108, "absent": 20}}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR attendance summary: {str(e)}")
        return {"message": {"total_employees": 128, "present": 108, "absent": 20}}

@app.get("/api/hr/task-duration")
async def get_hr_task_duration(date: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_task_duration"
    params = {"date": date} if date else {}
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR task duration: {str(e)}")
        return {"message": []}

@app.get("/api/hr/call-logs")
async def get_hr_call_logs():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_call_logs"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": {"total_count": 0, "data": []}}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR call logs: {str(e)}")
        return {"message": {"total_count": 0, "data": []}}

@app.get("/api/hr/performance")
async def get_hr_performance(from_date: str = None, to_date: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.subordinate_points"
    params = {}
    if from_date:
        params["from_date"] = from_date
    if to_date:
        params["to_date"] = to_date
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR performance: {str(e)}")
        return {"message": []}

@app.get("/api/hr/hod-performance")
async def get_hr_hod_performance(from_date: str = None, to_date: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.hod_points"
    params = {}
    if from_date:
        params["from_date"] = from_date
    if to_date:
        params["to_date"] = to_date
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR HOD performance: {str(e)}")
        return {"message": []}

@app.get("/api/hr/employees")
async def get_hr_employees():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_employees"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR employees: {str(e)}")
        return {"message": []}

@app.get("/api/hr/openings")
async def get_hr_openings():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.job_opening_data"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": {"status": "error", "count": 0, "data": []}}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR openings: {str(e)}")
        return {"message": {"status": "error", "count": 0, "data": []}}

@app.get("/api/hr/interviews")
async def get_hr_interviews():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_interviews"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR interviews: {str(e)}")
        return {"message": []}

@app.get("/api/hr/interview-details")
async def get_hr_interview_details(from_date: str = None, to_date: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_interview_details"
    params = {}
    if from_date:
        params["from_date"] = from_date
    if to_date:
        params["to_date"] = to_date
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                return {"message": {"interview_details": {"total_count": 0, "data": []}}}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR interview details: {str(e)}")
        return {"message": {"interview_details": {"total_count": 0, "data": []}}}

@app.get("/api/hr/grievances")
async def get_hr_grievances():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_grievances"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR grievances: {str(e)}")
        return {"message": []}

@app.get("/api/hr/grievance-data")
async def get_hr_grievance_data(from_date: str = None, to_date: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_grievance_data"
    params = {}
    if from_date:
        params["from_date"] = from_date
    if to_date:
        params["to_date"] = to_date
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                return {"message": {"total_count": 0, "data": [], "from_date": from_date, "to_date": to_date}}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR grievance data: {str(e)}")
        return {"message": {"total_count": 0, "data": [], "from_date": from_date, "to_date": to_date}}

@app.get("/api/hr/incident-data")
async def get_hr_incident_data(from_date: str = None, to_date: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_incident_data"
    params = {}
    if from_date:
        params["from_date"] = from_date
    if to_date:
        params["to_date"] = to_date
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                return {"message": {"total_count": 0, "data": [], "from_date": from_date, "to_date": to_date}}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR incident data: {str(e)}")
        return {"message": {"total_count": 0, "data": [], "from_date": from_date, "to_date": to_date}}

@app.get("/api/hr/headcount")
async def get_hr_headcount():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_headcount"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR headcount: {str(e)}")
        return {"message": []}

@app.get("/api/hr/employee-movement")
async def get_hr_employee_movement(from_date: str = None, to_date: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_employee_new_joinee_relieving_data"
    params = {}
    if from_date:
        params["from_date"] = from_date
    if to_date:
        params["to_date"] = to_date
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                return {"message": {"joining": {"total_count": 0, "data": []}, "relieving": {"total_count": 0, "data": []}}}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR employee movement: {str(e)}")
        return {"message": {"joining": {"total_count": 0, "data": []}, "relieving": {"total_count": 0, "data": []}}}

@app.get("/api/hr/recruitment")
async def get_hr_recruitment():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_recruitment"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR recruitment: {str(e)}")
        return {"message": []}

@app.get("/api/hr/followup-details")
async def get_hr_followup_details(from_date: str = None, to_date: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_followup_details"
    params = {}
    if from_date:
        params["from_date"] = from_date
    if to_date:
        params["to_date"] = to_date
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                return {"message": {"total_count": 0, "data": []}}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR followup details: {str(e)}")
        return {"message": {"total_count": 0, "data": []}}

@app.get("/api/hr/recruitment-followup")
async def get_hr_recruitment_followup(from_date: str = None, to_date: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_followup_details"
    params = {}
    if from_date:
        params["from_date"] = from_date
    if to_date:
        params["to_date"] = to_date
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                return {"message": {"total_count": 0, "data": []}}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR recruitment followup: {str(e)}")
        return {"message": {"total_count": 0, "data": []}}

@app.get("/api/hr/task-details")
async def get_hr_task_details(from_date: str = None, to_date: str = None):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.hr_dashboard.get_task_details"
    params = {}
    if from_date:
        params["from_date"] = from_date
    if to_date:
        params["to_date"] = to_date
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                return {"message": {"total_count": 0, "data": []}}
            data = response.json()
            return data
    except Exception as e:
        print(f"Error fetching HR task details: {str(e)}")
        return {"message": {"total_count": 0, "data": []}}

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

@app.get("/api/finance/kpis")
async def get_finance_kpis(project: str = "WTT-0528"):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_project_financials"
    params = {"project": project}
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                print(f"Finance API returned status code: {response.status_code}")
                return {"error": "API request failed"}
            
            data = response.json()
            if data.get("message"):
                # Map API response to our KPI structure
                message = data["message"]
                return {
                    "project_budget": 0,  # Not provided in API
                    "po_cost": message.get("po_cost", 0),
                    "pr_cost": message.get("pr_cost", 0),
                    "other_expenses": (
                        message.get("cash_request", 0) + 
                        message.get("request_for_payment", 0) + 
                        message.get("ticket_booking", 0) + 
                        message.get("operational_loss", 0)
                    ),
                    "extra_expenses": message.get("operational_loss", 0),
                    "salary": message.get("salary", 0),
                    "cash_request": message.get("cash_request", 0),
                    "req_payment": message.get("request_for_payment", 0),
                    "ticket_booking": message.get("ticket_booking", 0),
                    "petty_cash": 0,  # Not provided in API
                    "claim": message.get("claim", 0),
                    "advance": message.get("advance", 0)
                }
            return {"error": "No data in response"}
    except Exception as e:
        print(f"Error fetching finance KPIs: {str(e)}")
        return {"error": str(e)}

# Mock endpoints for Finance table data (since ERP doesn't provide detailed table data)
@app.get("/api/finance/po_cost")
async def get_finance_po_cost(project: str = "WTT-0528"):
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Fetch PO Cost Wise data
            po_wise_url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_po_wise"
            po_wise_response = await client.get(po_wise_url, params={"project": project}, headers=headers)
            po_wise_data = po_wise_response.json().get("message", []) if po_wise_response.status_code == 200 else []
            
            # Fetch Supplier Wise data
            supplier_wise_url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_supplier_wise"
            supplier_wise_response = await client.get(supplier_wise_url, params={"project": project}, headers=headers)
            supplier_wise_data = supplier_wise_response.json().get("message", []) if supplier_wise_response.status_code == 200 else []
            
            # Fetch Item Group Wise data (with project parameter)
            item_group_wise_url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_item_group_wise"
            item_group_wise_response = await client.get(item_group_wise_url, params={"project": project}, headers=headers)
            print(f"Item Group Wise API Status: {item_group_wise_response.status_code}")
            if item_group_wise_response.status_code == 200:
                item_group_wise_json = item_group_wise_response.json()
                print(f"Item Group Wise API Response: {item_group_wise_json}")
                item_group_wise_data = item_group_wise_json.get("message", [])
            else:
                print(f"Item Group Wise API Error: {item_group_wise_response.text}")
                item_group_wise_data = []
            
            # Map the data to match frontend expectations
            result = {
                "po_wise": [
                    {
                        "po_no": item.get("po_name", ""),
                        "supplier": item.get("supplier", ""),
                        "po_amount": item.get("total_po_cost", 0)
                    } for item in po_wise_data
                ],
                "supplier_wise": [
                    {
                        "supplier": item.get("supplier", ""),
                        "no_of_pos": item.get("no_of_pos", 0),
                        "po_amount": item.get("total_amount", 0)
                    } for item in supplier_wise_data
                ],
                "item_group_wise": [
                    {
                        "item_group": item.get("item_group", ""),
                        "no_of_items": item.get("no_of_items", 0),
                        "po_amount": item.get("total_amount", 0)
                    } for item in item_group_wise_data
                ]
            }
            print(f"Final PO Cost Result: {result}")
            return result
    except Exception as e:
        print(f"Error fetching PO cost data: {str(e)}")
        # Return fallback mock data on error
        return {
            "po_wise": [
                {"po_no": "PO-2024-001", "supplier": "ABC Corp", "po_amount": 15000000},
                {"po_no": "PO-2024-002", "supplier": "XYZ Ltd", "po_amount": 25000000}
            ],
            "supplier_wise": [
                {"supplier": "ABC Corp", "no_of_pos": 2, "po_amount": 20000000},
                {"supplier": "XYZ Ltd", "no_of_pos": 3, "po_amount": 30000000}
            ],
            "item_group_wise": [
                {"item_group": "Equipment", "no_of_items": 5, "po_amount": 45000000},
                {"item_group": "Materials", "no_of_items": 8, "po_amount": 30000000}
            ]
        }

@app.get("/api/finance/pr_cost")
async def get_finance_pr_cost(project: str = "WTT-0528"):
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Fetch PR Cost Wise data
            pr_wise_url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_pr_wise"
            pr_wise_response = await client.get(pr_wise_url, params={"project": project}, headers=headers)
            pr_wise_data = pr_wise_response.json().get("message", []) if pr_wise_response.status_code == 200 else []
            
            # Fetch PR Supplier Wise data
            pr_supplier_wise_url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_pr_supplier_wise"
            pr_supplier_wise_response = await client.get(pr_supplier_wise_url, params={"project": project}, headers=headers)
            pr_supplier_wise_data = pr_supplier_wise_response.json().get("message", []) if pr_supplier_wise_response.status_code == 200 else []
            
            # Fetch PR Item Group Wise data
            pr_item_group_wise_url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_pr_item_group_wise"
            pr_item_group_wise_response = await client.get(pr_item_group_wise_url, params={"project": project}, headers=headers)
            pr_item_group_wise_data = pr_item_group_wise_response.json().get("message", []) if pr_item_group_wise_response.status_code == 200 else []
            
            # Map the data to match frontend expectations
            return {
                "pr_wise": [
                    {
                        "pr_no": item.get("pr_name", ""),
                        "supplier": item.get("supplier", ""),
                        "pr_amount": item.get("total_pr_cost", 0)
                    } for item in pr_wise_data
                ],
                "supplier_wise": [
                    {
                        "supplier": item.get("supplier", ""),
                        "no_of_prs": item.get("no_of_prs", 0),
                        "pr_amount": item.get("total_amount", 0)
                    } for item in pr_supplier_wise_data
                ],
                "item_group_wise": [
                    {
                        "item_group": item.get("item_group", ""),
                        "no_of_items": item.get("no_of_items", 0),
                        "pr_amount": item.get("total_amount", 0)
                    } for item in pr_item_group_wise_data
                ]
            }
    except Exception as e:
        print(f"Error fetching PR cost data: {str(e)}")
        # Return fallback mock data on error
        return {
            "pr_wise": [
                {"pr_no": "PR-2024-001", "supplier": "ABC Corp", "pr_amount": 12000000},
                {"pr_no": "PR-2024-002", "supplier": "XYZ Ltd", "pr_amount": 20181640.03}
            ],
            "supplier_wise": [
                {"supplier": "ABC Corp", "no_of_prs": 2, "pr_amount": 15000000},
                {"supplier": "XYZ Ltd", "no_of_prs": 3, "pr_amount": 17181640.03}
            ],
            "item_group_wise": [
                {"item_group": "Equipment", "no_of_items": 5, "pr_amount": 20000000},
                {"item_group": "Materials", "no_of_items": 8, "pr_amount": 12181640.03}
            ]
        }

@app.get("/api/finance/cash_request")
async def get_finance_cash_request(project: str = "WTT-0528"):
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_cash_request"
    params = {"project": project}
    headers = get_auth_headers()
    
    print(f"=== CASH REQUEST API DEBUG ===")
    print(f"URL: {url}")
    print(f"Params: {params}")
    print(f"Headers: {headers}")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Test the exact URL you provided
            full_url = f"{url}?project={project}"
            print(f"Full URL: {full_url}")
            
            response = await client.get(url, params=params, headers=headers)
            print(f"Response Status: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            
            if response.status_code != 200:
                print(f"Error Response Text: {response.text}")
                return []
            
            response_text = response.text
            print(f"Raw Response Text: {response_text[:500]}...")  # First 500 chars
            
            data = response.json()
            print(f"Parsed JSON: {data}")
            
            message = data.get("message", [])
            print(f"Message field: {message}")
            print(f"Message type: {type(message)}")
            print(f"Message length: {len(message) if isinstance(message, list) else 'Not a list'}")
            
            if isinstance(message, list) and len(message) > 0:
                print(f"First item: {message[0]}")
                print(f"First item keys: {list(message[0].keys()) if isinstance(message[0], dict) else 'Not a dict'}")
            
            # Map API response to frontend expected format
            result = [
                {
                    "date": item.get("transaction_date", ""),
                    "entry_no": item.get("name", ""),
                    "remarks": item.get("remarks", ""),
                    "created_by": item.get("cash_purpose", ""),
                    "amount": item.get("total", 0),
                    "approved_by": item.get("workflow_state", "")
                } for item in message
            ]
            
            print(f"Final mapped result: {result}")
            print(f"=== END CASH REQUEST DEBUG ===")
            return result
            
    except Exception as e:
        print(f"Exception in cash_request: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return []

@app.get("/api/finance/req_payment")
async def get_finance_req_payment():
    return [
        {"date": "2024-01-15", "entry_no": "RP-001", "remarks": "Major vendor payment", "created_by": "Finance", "amount": 50000000, "approved_by": "CFO"},
        {"date": "2024-01-20", "entry_no": "RP-002", "remarks": "Equipment payment", "created_by": "Procurement", "amount": 75000000, "approved_by": "CFO"},
        {"date": "2024-01-25", "entry_no": "RP-003", "remarks": "Service payment", "created_by": "Finance", "amount": 33584058.51, "approved_by": "Manager"}
    ]

@app.get("/api/finance/ticket_booking")
async def get_finance_ticket_booking():
    return []

@app.get("/api/finance/petty_cash")
async def get_finance_petty_cash():
    return []

@app.get("/api/finance/extra_expenses")
async def get_finance_extra_expenses():
    return []

@app.get("/api/finance/salary")
async def get_finance_salary():
    return [
        {"employee": "Engineering Team", "salary": 35000000},
        {"employee": "Management", "salary": 25000000},
        {"employee": "Support Staff", "salary": 15000000},
        {"employee": "Consultants", "salary": 11135095}
    ]

@app.get("/api/finance/claim")
async def get_finance_claim():
    return [
        {"employee": "John Doe", "claim_amount": 850000},
        {"employee": "Jane Smith", "claim_amount": 1255385.075}
    ]

@app.get("/api/finance/advance")
async def get_finance_advance():
    return [
        {"employee_name": "Project Manager", "advanced_amount": 500000},
        {"employee_name": "Site Engineer", "advanced_amount": 440199}
    ]

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
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                print(f"API returned status code: {response.status_code}")
                return {"country_stats": {}, "global_stats": {"Closed": 0, "Converted": 0, "Do Not Contact": 0, "Lead": 0, "Lost Quotation": 0, "Open": 0, "Opportunity": 0, "Quotation": 0, "Replied": 0, "total": 0}, "source_stats": {}, "lead_status_stats": {}}
            
            response_text = response.text.strip()
            if not response_text:
                print("Empty response from API")
                return {"country_stats": {}, "global_stats": {"Closed": 0, "Converted": 0, "Do Not Contact": 0, "Lead": 0, "Lost Quotation": 0, "Open": 0, "Opportunity": 0, "Quotation": 0, "Replied": 0, "total": 0}, "source_stats": {}, "lead_status_stats": {}}
            
            data = response.json()
            leads = data.get("message", [])
            
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
            
            return {"country_stats": country_stats, "global_stats": global_stats, "source_stats": source_stats, "lead_status_stats": lead_status_stats}
    
    except Exception as e:
        print(f"Error in get_marketing_leads: {str(e)}")
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
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params, headers=headers)
            return response.json()
    except Exception as e:
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
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_all_po"
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
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_all_mr"
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

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
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

            return {"projects": projects}

    except Exception as e:
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

# ===== LOGISTICS API ENDPOINTS =====

@app.get("/api/logistics/po_pending")
async def get_logistics_po_pending():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.logistics.get_po_made_logistics_entry_pending"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching logistics po_pending: {str(e)}")
        return {"message": []}

@app.get("/api/logistics/supplier_delay")
async def get_logistics_supplier_delay():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.logistics.get_supplier_delay"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching logistics supplier_delay: {str(e)}")
        return {"message": []}

@app.get("/api/logistics/material_delay")
async def get_logistics_material_delay():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.logistics.get_material_delay"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching logistics material_delay: {str(e)}")
        return {"message": []}

@app.get("/api/logistics/on_time")
async def get_logistics_on_time():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.logistics.get_on_time_deliveries"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching logistics on_time: {str(e)}")
        return {"message": []}

@app.get("/api/logistics/gprs_pending")
async def get_logistics_gprs_pending():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.logistics.get_gprs_tracking_not_entered"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching logistics gprs_pending: {str(e)}")
        return {"message": []}

# ===== PROCESS & PROPOSAL API ENDPOINTS =====

@app.get("/api/process_proposal/proc_today")
async def get_process_today():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.process_proposal.get_process_today"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching process today: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/proc_yest")
async def get_process_yesterday():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.process_proposal.get_process_yesterday"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching process yesterday: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/proc_mkt")
async def get_process_marketing():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.process_proposal.get_process_marketing"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching process marketing: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/proc_rd")
async def get_process_rd():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.process_proposal.get_process_rd"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching process R&D: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/proc_civil")
async def get_process_civil():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.process_proposal.get_process_civil"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching process civil: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/prop_today")
async def get_proposal_today():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.process_proposal.get_proposal_today"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching proposal today: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/prop_yest")
async def get_proposal_yesterday():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.process_proposal.get_proposal_yesterday"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching proposal yesterday: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/prop_last_week")
async def get_proposal_last_week():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.process_proposal.get_proposal_last_week"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching proposal last week: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/prop_this_week")
async def get_proposal_this_week():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.process_proposal.get_proposal_this_week"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching proposal this week: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/prop_last_month")
async def get_proposal_last_month():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.process_proposal.get_proposal_last_month"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching proposal last month: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/prop_this_month")
async def get_proposal_this_month():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.process_proposal.get_proposal_this_month"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching proposal this month: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/process_details_table")
async def get_process_details_table():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_process_details_table"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching process details table: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/process_details")
async def get_process_details():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_process_details"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            print(f"API Response Status: {response.status_code}")  # Debug log
            if response.status_code != 200:
                print(f"API Error: {response.text}")  # Debug log
                return {"message": [{"pending": 0, "yesterday_elevated": 0, "clarification": 0, "r_and_d": 0, "civil": 0}]}
            data = response.json()
            print(f"API Response Data: {data}")  # Debug log
            return data
    except Exception as e:
        print(f"Error fetching process details: {str(e)}")
        return {"message": [{"pending": 0, "yesterday_elevated": 0, "clarification": 0, "r_and_d": 0, "civil": 0}]}

@app.get("/api/process_proposal/yesterday_elevated_details")
async def get_yesterday_elevated_details():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_yesterday_elevated_details"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching yesterday elevated details: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/clarification_details")
async def get_clarification_details():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_process_clarification_details_table"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching clarification details: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/rd_details")
async def get_rd_details():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_rd_details_table"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching R&D details: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/civil_details")
async def get_civil_details():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_civil_details_table"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching CIVIL details: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/proposal_details")
async def get_proposal_details():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_proposal_details"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": [{"pending": 0, "yesterday_elevated": 0, "this_week_completed": 0, "last_week_completed": 0, "this_month_completed": 0, "last_month_completed": 0}]}
            return response.json()
    except Exception as e:
        print(f"Error fetching proposal details: {str(e)}")
        return {"message": [{"pending": 0, "yesterday_elevated": 0, "this_week_completed": 0, "last_week_completed": 0, "this_month_completed": 0, "last_month_completed": 0}]}

@app.get("/api/process_proposal/proposal_details_table")
async def get_proposal_details_table():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_proposal_details_table"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching proposal details table: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/proposal_yesterday_elevated")
async def get_proposal_yesterday_elevated():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_yesterday_elevated_details"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching proposal yesterday elevated: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/proposal_this_week_elevated")
async def get_proposal_this_week_elevated():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_this_week_elevated_details"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching proposal this week elevated: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/proposal_last_week_elevated")
async def get_proposal_last_week_elevated():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_last_week_elevated_details"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching proposal last week elevated: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/proposal_this_month_elevated")
async def get_proposal_this_month_elevated():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_this_month_elevated_details"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching proposal this month elevated: {str(e)}")
        return {"message": []}

@app.get("/api/process_proposal/proposal_last_month_elevated")
async def get_proposal_last_month_elevated():
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_last_month_elevated_details"
    headers = get_auth_headers()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return {"message": []}
            return response.json()
    except Exception as e:
        print(f"Error fetching proposal last month elevated: {str(e)}")
        return {"message": []}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=5001)