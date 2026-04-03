import frappe
from frappe import _
from frappe.utils import getdate, flt


COMPANY_NAME = "WTT INTERNATIONAL PVT LTD"
DETAIL_REPORT_NAME = "Consolidate Stock Statement"
JOB_REPORT_NAME = "Job Wise Stock"
PROJECT_REPORT_NAME = "Project Wise Stock"

JOBWORK_PARENT_WAREHOUSE = "Job Work - WTT"
PROJECT_PARENT_WAREHOUSE = "Project Material - WTT"
SACHIN_PARENT_WAREHOUSE = "Sachin Project - WTT"
EXCLUDED_WAREHOUSES = {"WIP - Job Work - WTT"}


def execute(filters=None):
	filters = frappe._dict(filters or {})
	apply_defaults_and_validate(filters)

	view_mode = (filters.get("view_mode") or "Summary").strip()

	if view_mode == "Detail":
		return execute_detail(filters)

	columns = get_summary_columns()
	data = get_summary_data(filters)

	return columns, data


def apply_defaults_and_validate(filters):
	if not filters.get("from_date") or not filters.get("to_date"):
		frappe.throw(_("From Date and To Date are required"))

	filters.from_date = getdate(filters.from_date)
	filters.to_date = getdate(filters.to_date)

	filters.company = COMPANY_NAME

	if not filters.get("view_mode"):
		filters.view_mode = "Summary"

	if filters.get("include_child_warehouses") is None:
		filters.include_child_warehouses = 1


# -------------------------
# SUMMARY VIEW
# -------------------------

def get_summary_columns():
	return [
		{"label": _("Warehouse"), "fieldname": "warehouse", "fieldtype": "Data", "width": 320},
		{"label": _("Closing Qty"), "fieldname": "closing_qty", "fieldtype": "Float", "width": 140},
		{"label": _("Closing Amount"), "fieldname": "closing_amount", "fieldtype": "Currency", "width": 180},
	]


def get_summary_data(filters):
	enabled_wh = get_enabled_warehouses(company=filters.company, exclude=EXCLUDED_WAREHOUSES)
	if not enabled_wh:
		return []

	job_children = get_warehouse_descendants(
		company=filters.company,
		parent_warehouse=JOBWORK_PARENT_WAREHOUSE,
		exclude=EXCLUDED_WAREHOUSES
	)

	if job_children:
		warehouse_label_expr = """
			CASE
				WHEN sle.warehouse IN %(job_children)s THEN %(job_parent)s
				ELSE sle.warehouse
			END
		"""
	else:
		warehouse_label_expr = "sle.warehouse"

	wh_condition = " AND sle.warehouse IN %(warehouses)s "

	rows = frappe.db.sql(
		f"""
		SELECT
			t.warehouse_label AS warehouse,
			SUM(t.qty_after) AS closing_qty,
			SUM(t.stock_value) AS closing_amount
		FROM (
			SELECT
				sle.item_code,
				({warehouse_label_expr}) AS warehouse_label,
				sle.qty_after_transaction AS qty_after,
				sle.stock_value AS stock_value
			FROM `tabStock Ledger Entry` sle
			INNER JOIN (
				SELECT
					item_code,
					warehouse,
					MAX(CONCAT(posting_date, ' ', posting_time, ' ', creation)) AS max_key
				FROM `tabStock Ledger Entry` sle
				WHERE sle.is_cancelled = 0
					AND sle.company = %(company)s
					AND sle.posting_date <= %(to_date)s
					{wh_condition}
				GROUP BY item_code, warehouse
			) x
				ON x.item_code = sle.item_code
				AND x.warehouse = sle.warehouse
				AND CONCAT(sle.posting_date, ' ', sle.posting_time, ' ', sle.creation) = x.max_key
			WHERE sle.is_cancelled = 0
				AND sle.company = %(company)s
				{wh_condition}
		) t
		GROUP BY t.warehouse_label
		ORDER BY t.warehouse_label ASC
		""",
		{
			"company": filters.company,
			"to_date": filters.to_date,
			"warehouses": tuple(enabled_wh),
			"job_children": tuple(job_children) if job_children else tuple(["__none__"]),
			"job_parent": JOBWORK_PARENT_WAREHOUSE,
		},
		as_dict=True
	)

	# Add Sachin Stock data
	sachin_data = get_sachin_stock_summary()
	if sachin_data:
		rows.extend(sachin_data)

	total_qty = 0.0
	total_amt = 0.0

	for r in rows:
		r["closing_qty"] = flt(r.get("closing_qty"))
		r["closing_amount"] = flt(r.get("closing_amount"))
		total_qty += r["closing_qty"]
		total_amt += r["closing_amount"]

	rows.append({
		"warehouse": _("Total"),
		"closing_qty": flt(total_qty),
		"closing_amount": flt(total_amt)
	})

	return rows


def get_enabled_warehouses(company, exclude=None):
	exclude = exclude or set()
	wh = frappe.db.get_all(
		"Warehouse",
		filters={"company": company, "disabled": 0},
		fields=["name"],
		order_by="name asc"
	)
	return [d.name for d in wh if d.name not in exclude]


def get_warehouse_descendants(company, parent_warehouse, exclude=None):
	exclude = exclude or set()

	parent = frappe.db.get_value(
		"Warehouse",
		{"name": parent_warehouse, "company": company},
		["lft", "rgt"],
		as_dict=True
	)
	if not parent:
		return []

	children = frappe.db.sql(
		"""
		SELECT name
		FROM `tabWarehouse`
		WHERE company = %(company)s
			AND disabled = 0
			AND lft > %(lft)s
			AND rgt < %(rgt)s
		ORDER BY name ASC
		""",
		{"company": company, "lft": parent.lft, "rgt": parent.rgt},
		as_dict=True
	)

	return [c.name for c in children if c.name not in exclude]


def get_sachin_stock_summary():
	"""Get Sachin Stock summary data for Stock Summary report"""
	query = """
		SELECT 
			%s as warehouse,
			SUM(
				CASE 
					WHEN ss.stock_entry_type = 'Material Receipt' THEN ssd.qty 
					ELSE 0 
				END
				-
				CASE 
					WHEN ss.stock_entry_type = 'Material Issue' THEN ssd.qty 
					ELSE 0 
				END
			) as closing_qty,
			0 as closing_amount
		FROM 
			`tabSachin Stock Table` ssd
		INNER JOIN 
			`tabSachin Stock` ss ON ssd.parent = ss.name
		WHERE 
			ss.stock_entry_type IN ('Material Receipt', 'Material Issue')
		GROUP BY 
			ssd.item
		HAVING 
			closing_qty != 0
	"""
	data = frappe.db.sql(query, (SACHIN_PARENT_WAREHOUSE,), as_dict=True)
	
	if not data:
		return []
	
	# Consolidate to single row for Sachin Project - WTT
	total_qty = sum(flt(d.get("closing_qty", 0)) for d in data)
	
	return [{
		"warehouse": SACHIN_PARENT_WAREHOUSE,
		"closing_qty": flt(total_qty),
		"closing_amount": 0.0
	}]


# -------------------------
# DETAIL VIEW
# -------------------------

def execute_detail(filters):
	if not filters.get("warehouse"):
		frappe.throw(_("Warehouse is required for Detail view"))

	if filters.warehouse in EXCLUDED_WAREHOUSES:
		frappe.throw(_("{0} is not allowed").format(filters.warehouse))

	child = 1 if int(filters.get("include_child_warehouses") or 0) else 0
	project_filter = filters.get("project") or ""

	# ── Job Work - WTT → Job Wise Stock ──
	if filters.warehouse == JOBWORK_PARENT_WAREHOUSE:
		report_name = JOB_REPORT_NAME
		detail_filters = {
			"warehouse": filters.warehouse,
			"from_date": filters.from_date,
			"to_date": filters.to_date,
		}

	# ── Project Material - WTT with NO project filter
	#    → Project Wise Stock (project listing) ──
	elif filters.warehouse == PROJECT_PARENT_WAREHOUSE and not project_filter:
		report_name = PROJECT_REPORT_NAME
		detail_filters = {
			"warehouse": filters.warehouse,
			"from_date": filters.from_date,
			"to_date": filters.to_date,
		}

	# ── Project Material - WTT WITH a project filter
	#    → Consolidate Stock Statement filtered by that project ──
	elif filters.warehouse == PROJECT_PARENT_WAREHOUSE and project_filter:
		report_name = DETAIL_REPORT_NAME
		detail_filters = {
			"warehouse": filters.warehouse,
			"from_date": filters.from_date,
			"to_date": filters.to_date,
			"include_child_warehouses": child,
			"consolidate_by": "",
			"bin": filters.get("bin"),
			"rack_no": filters.get("rack_no"),
			"project": project_filter,        # ← the key filter
			"item_code": filters.get("item_code"),
			"number_of_bins": filters.get("number_of_bins"),
			"item_wise_bin": int(filters.get("item_wise_bin") or 0),
			"project_wise_bin": int(filters.get("project_wise_bin") or 0),
			"transaction_breakdown": filters.get("transaction_breakdown") or ""
		}

	# ── Sachin Project - WTT → Sachin Stock report ──
	elif filters.warehouse == SACHIN_PARENT_WAREHOUSE:
		report_name = "Sachin Stock"
		detail_filters = {
			"item": filters.get("item_code")
		}

	# ── Any other warehouse → Consolidate Stock Statement ──
	else:
		report_name = DETAIL_REPORT_NAME
		detail_filters = {
			"warehouse": filters.warehouse,
			"from_date": filters.from_date,
			"to_date": filters.to_date,
			"include_child_warehouses": child,
			"consolidate_by": filters.get("consolidate_by") or "",
			"bin": filters.get("bin"),
			"rack_no": filters.get("rack_no"),
			"project": project_filter,
			"item_code": filters.get("item_code"),
			"number_of_bins": filters.get("number_of_bins"),
			"item_wise_bin": int(filters.get("item_wise_bin") or 0),
			"project_wise_bin": int(filters.get("project_wise_bin") or 0),
			"transaction_breakdown": filters.get("transaction_breakdown") or ""
		}

	from frappe.desk.query_report import run

	out = run(
		report_name=report_name,
		filters=detail_filters,
		ignore_prepared_report=True
	)

	columns = out.get("columns") or []
	data = out.get("result") or []

	# ── Inject Action column for Job Wise Stock ──
	if filters.warehouse == JOBWORK_PARENT_WAREHOUSE:
		columns, data = inject_job_action_column(columns, data)

	# ── Inject Action column for Project Wise Stock
	#    (only when no project filter — i.e. the listing view) ──
	elif filters.warehouse == PROJECT_PARENT_WAREHOUSE and not project_filter:
		columns, data = inject_project_action_column(columns, data)

	return columns, data


# -------------------------
# INJECT: Job Wise Stock
# -------------------------

def inject_job_action_column(columns, data):
	"""
	Appends Action column to Job Wise Stock result.
	Detects child warehouse field by:
	  1. column fieldname/label containing 'warehouse'
	  2. sniffing row values against all known Warehouse names
	"""
	all_warehouses = set(
		frappe.db.get_all("Warehouse", fields=["name"], pluck="name")
	)

	warehouse_fieldname = None
	for col in columns:
		fn = col.get("fieldname") or ""
		label = (col.get("label") or "").lower()
		if "warehouse" in fn.lower() or "warehouse" in label:
			warehouse_fieldname = fn
			break

	if not warehouse_fieldname:
		for row in data:
			if not isinstance(row, dict):
				continue
			for key, val in row.items():
				if isinstance(val, str) and val in all_warehouses:
					warehouse_fieldname = key
					break
			if warehouse_fieldname:
				break

	for row in data:
		if not isinstance(row, dict):
			continue
		child_wh = row.get(warehouse_fieldname, "") if warehouse_fieldname else ""
		row["jw_child_warehouse"] = child_wh or ""
		row["action"] = ""

	columns.append({
		"label": _("Action"),
		"fieldname": "action",
		"fieldtype": "Data",
		"width": 120
	})

	return columns, data


# -------------------------
# INJECT: Project Wise Stock
# -------------------------

def inject_project_action_column(columns, data):
	"""
	Appends Action column to Project Wise Stock result.
	Detects project field by:
	  1. column fieldname/label containing 'project'
	  2. sniffing row values against all known Project names
	Stamps pw_project on each dict row so JS can pass it
	as the project filter to Consolidate Stock Statement.
	"""
	all_projects = set(
		frappe.db.get_all("Project", fields=["name"], pluck="name")
	)

	# Step 1: find project fieldname from column definitions
	project_fieldname = None
	for col in columns:
		fn = col.get("fieldname") or ""
		label = (col.get("label") or "").lower()
		if "project" in fn.lower() or "project" in label:
			project_fieldname = fn
			break

	# Step 2: sniff from row values if not found in columns
	if not project_fieldname:
		for row in data:
			if not isinstance(row, dict):
				continue
			for key, val in row.items():
				if isinstance(val, str) and val in all_projects:
					project_fieldname = key
					break
			if project_fieldname:
				break

	# Step 3: stamp each dict row
	for row in data:
		if not isinstance(row, dict):
			continue
		project_val = row.get(project_fieldname, "") if project_fieldname else ""
		row["pw_project"] = project_val or ""
		row["action"] = ""

	columns.append({
		"label": _("Action"),
		"fieldname": "action",
		"fieldtype": "Data",
		"width": 120
	})

	return columns, data