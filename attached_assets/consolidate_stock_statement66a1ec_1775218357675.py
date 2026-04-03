# import frappe
# from frappe import _
# from frappe.utils import flt, getdate, cstr
# from collections import defaultdict

# def execute(filters=None):
# 	if not filters:
# 		filters = {}

# 	columns = get_columns(filters)
# 	data = get_data(filters)

# 	return columns, data


# def get_columns(filters):
# 	consolidate_by = filters.get("consolidate_by", "")

# 	columns = []

# 	if not consolidate_by:
# 		columns.append({
# 			"fieldname": "item_code",
# 			"label": _("Item Code"),
# 			"fieldtype": "Link",
# 			"options": "Item",
# 			"width": 150
# 		})

# 	if consolidate_by != "Warehouse Wise":
# 		columns.append({
# 			"fieldname": "item_group",
# 			"label": _("Item Group"),
# 			"fieldtype": "Link",
# 			"options": "Item Group",
# 			"width": 150
# 		})

# 	if not consolidate_by:
# 		columns.append({
# 			"fieldname": "description",
# 			"label": _("Description"),
# 			"fieldtype": "Data",
# 			"width": 200
# 		})

# 	if not consolidate_by:
# 		columns.append({
# 			"fieldname": "technical_description",
# 			"label": _("Technical Description"),
# 			"fieldtype": "Data",
# 			"width": 200
# 		})

# 	if consolidate_by not in ["Item Group Wise", "Bin Wise", "Project Wise"]:
# 		columns.append({
# 			"fieldname": "warehouse",
# 			"label": _("Warehouse"),
# 			"fieldtype": "Link",
# 			"options": "Warehouse",
# 			"width": 150
# 		})

# 	if not consolidate_by:
# 		columns.append({
# 			"fieldname": "bin_location",
# 			"label": _("Bin (Location)"),
# 			"fieldtype": "Data",
# 			"width": 200
# 		})

# 	if not consolidate_by:
# 		columns.append({
# 			"fieldname": "project_list",
# 			"label": _("Project"),
# 			"fieldtype": "Data",
# 			"width": 200
# 		})

# 	columns.append({
# 		"fieldname": "closing_qty",
# 		"label": _("Closing Qty"),
# 		"fieldtype": "Float",
# 		"width": 120
# 	})

# 	if consolidate_by == "Bin Wise":
# 		columns.append({
# 			"fieldname": "bin",
# 			"label": _("Bin"),
# 			"fieldtype": "Link",
# 			"options": "Physical Bin",
# 			"width": 150
# 		})

# 	if consolidate_by == "Project Wise":
# 		columns.append({
# 			"fieldname": "project",
# 			"label": _("Project"),
# 			"fieldtype": "Link",
# 			"options": "Project",
# 			"width": 150
# 		})

# 	columns.extend([
# 		{"fieldname": "opening_qty",      "label": _("Opening Qty"),                          "fieldtype": "Float",    "width": 120},
# 		{"fieldname": "opening_rate",     "label": _("Opening Rate"),                         "fieldtype": "Currency", "width": 120, "hidden": 1},
# 		{"fieldname": "opening_value",    "label": _("Opening Value"),                        "fieldtype": "Currency", "width": 150},
# 		{"fieldname": "receipt_qty",      "label": _("Receipt Qty"),                          "fieldtype": "Float",    "width": 120},
# 		{"fieldname": "receipt_rate",     "label": _("Receipt Rate"),                         "fieldtype": "Currency", "width": 120, "hidden": 1},
# 		{"fieldname": "receipt_amount",   "label": _("Receipt Amount"),                       "fieldtype": "Currency", "width": 150},
# 		{"fieldname": "return_qty",       "label": _("Return Qty"),                           "fieldtype": "Float",    "width": 120},
# 		{"fieldname": "return_rate",      "label": _("Return Rate"),                          "fieldtype": "Currency", "width": 120, "hidden": 1},
# 		{"fieldname": "return_amount",    "label": _("Return Amount"),                        "fieldtype": "Currency", "width": 150},
# 		{"fieldname": "dc_to_customer_qty",    "label": _("DC to Customer Qty"),              "fieldtype": "Float",    "width": 120},
# 		{"fieldname": "dc_to_customer_rate",   "label": _("DC to Customer Rate"),             "fieldtype": "Currency", "width": 120, "hidden": 1},
# 		{"fieldname": "dc_to_customer_amount", "label": _("DC to Customer Amount"),           "fieldtype": "Currency", "width": 150},
# 		{"fieldname": "other_receipt_qty",     "label": _("Other Receipt Qty"),               "fieldtype": "Float",    "width": 120},
# 		{"fieldname": "other_receipt_rate",    "label": _("Other Receipt Rate"),              "fieldtype": "Currency", "width": 120, "hidden": 1},
# 		{"fieldname": "other_receipt_amount",  "label": _("Other Receipt Amount"),            "fieldtype": "Currency", "width": 150},
# 		{"fieldname": "other_issue_qty",       "label": _("Other Issue Qty"),                 "fieldtype": "Float",    "width": 120},
# 		{"fieldname": "other_issue_rate",      "label": _("Other Issue Rate"),                "fieldtype": "Currency", "width": 120, "hidden": 1},
# 		{"fieldname": "other_issue_amount",    "label": _("Other Issue Amount"),              "fieldtype": "Currency", "width": 150},
# 		{"fieldname": "wip_factory_qty",       "label": _("WIP Factory (Material Transfer In) Qty"), "fieldtype": "Float", "width": 120},
# 		{"fieldname": "wip_factory_rate",      "label": _("WIP Factory Rate"),                "fieldtype": "Currency", "width": 120, "hidden": 1},
# 		{"fieldname": "wip_factory_amount",    "label": _("WIP Factory Amount"),              "fieldtype": "Currency", "width": 150},
# 		{"fieldname": "wip_job_work_qty",      "label": _("WIP Job Work (Send to Subcontractor) Qty"), "fieldtype": "Float", "width": 120},
# 		{"fieldname": "wip_job_work_rate",     "label": _("WIP Job Work Rate"),               "fieldtype": "Currency", "width": 120, "hidden": 1},
# 		{"fieldname": "wip_job_work_amount",   "label": _("WIP Job Work Amount"),             "fieldtype": "Currency", "width": 150},
# 		{"fieldname": "closing_rate",          "label": _("Closing Rate (Valuation Rate)"),   "fieldtype": "Currency", "width": 150},
# 		{"fieldname": "closing_amount",        "label": _("Closing Value"),                   "fieldtype": "Currency", "width": 150},
# 	])

# 	return columns


# def get_data(filters):
# 	warehouse      = filters.get("warehouse")
# 	from_date      = getdate(filters.get("from_date"))
# 	to_date        = getdate(filters.get("to_date"))
# 	include_child  = filters.get("include_child_warehouses")
# 	consolidate_by = filters.get("consolidate_by")
# 	bin_filter     = filters.get("bin")
# 	rack_no_filter = filters.get("rack_no")
# 	project_filter = filters.get("project")   # ← key filter
# 	item_code_filter = filters.get("item_code")
# 	number_of_bins = filters.get("number_of_bins")
# 	item_wise_bin  = filters.get("item_wise_bin")
# 	project_wise_bin = filters.get("project_wise_bin")

# 	warehouses = get_warehouses(warehouse, include_child)
# 	if not warehouses:
# 		return []

# 	# ── When project_filter is set, scope all items to that project only ──
# 	all_items = get_all_items(
# 		warehouses, from_date, to_date,
# 		item_code_filter=item_code_filter,
# 		project_filter=project_filter        # NEW: passed through
# 	)
# 	item_details = get_item_details(all_items)

# 	# ── Fetch all transaction data, passing project_filter everywhere ──
# 	opening_stock      = get_opening_stock(warehouses, from_date, bin_filter, project_filter)
# 	closing_stock      = get_closing_stock(warehouses, to_date, project_filter)
# 	receipt_data       = get_receipt_data(warehouses, from_date, to_date, project_filter)
# 	return_data        = get_return_data(warehouses, from_date, to_date, project_filter)
# 	issue_data         = get_issue_data(warehouses, from_date, to_date, project_filter)
# 	other_receipt_data = get_other_receipt_data(warehouses, from_date, to_date, project_filter)
# 	other_issue_data   = get_other_issue_data(warehouses, from_date, to_date, project_filter)
# 	wip_factory_in_data, wip_job_work_data = get_material_transfer_data(
# 		warehouses, from_date, to_date, project_filter
# 	)
# 	stock_recon_data = get_stock_reconciliation_data(warehouses, to_date)

# 	if consolidate_by == "Item Group Wise":
# 		return prepare_item_group_wise_data(
# 			all_items, item_details, opening_stock, closing_stock,
# 			receipt_data, return_data, issue_data, other_receipt_data,
# 			other_issue_data, wip_factory_in_data, wip_job_work_data
# 		)
# 	elif consolidate_by == "Warehouse Wise":
# 		return prepare_warehouse_wise_data(
# 			all_items, item_details, opening_stock, closing_stock,
# 			receipt_data, return_data, issue_data, other_receipt_data,
# 			other_issue_data, wip_factory_in_data, wip_job_work_data
# 		)
# 	elif consolidate_by == "Bin Wise":
# 		return prepare_bin_wise_data(
# 			all_items, item_details, opening_stock, closing_stock,
# 			receipt_data, return_data, issue_data, other_receipt_data,
# 			other_issue_data, wip_factory_in_data, wip_job_work_data
# 		)
# 	elif consolidate_by == "Project Wise":
# 		return prepare_project_wise_data(
# 			all_items, item_details, opening_stock, closing_stock,
# 			receipt_data, return_data, issue_data, other_receipt_data,
# 			other_issue_data, wip_factory_in_data, wip_job_work_data
# 		)
# 	else:
# 		return prepare_item_wise_data(
# 			all_items, item_details, opening_stock, closing_stock,
# 			receipt_data, return_data, issue_data, other_receipt_data,
# 			other_issue_data, wip_factory_in_data, wip_job_work_data,
# 			from_date=from_date, to_date=to_date,
# 			stock_recon_data=stock_recon_data,
# 			project_filter=project_filter     # NEW: passed through
# 		)


# # ─────────────────────────────────────────────
# # HELPER: build project SQL condition + params
# # ─────────────────────────────────────────────

# def _project_condition(project_filter, alias="sle"):
# 	"""
# 	Returns (sql_snippet, params_list).
# 	When project_filter is set, restricts to rows where
# 	custom_project_no matches exactly.
# 	alias: table alias prefix (e.g. "sle"). Pass alias="" for
# 	       queries that have no table alias.
# 	"""
# 	if project_filter:
# 		col = f"{alias}.custom_project_no" if alias else "custom_project_no"
# 		return f" AND {col} = %s ", [project_filter]
# 	return "", []


# # ─────────────────────────────────────────────
# # WAREHOUSE HELPERS
# # ─────────────────────────────────────────────

# def get_warehouses(warehouse, include_child):
# 	if not warehouse:
# 		return []
# 	warehouses = [warehouse]
# 	if include_child:
# 		child_warehouses = frappe.db.sql("""
# 			SELECT name FROM `tabWarehouse`
# 			WHERE parent_warehouse = %s AND disabled = 0
# 		""", warehouse, as_list=1)
# 		warehouses.extend([w[0] for w in child_warehouses])
# 	return warehouses


# # ─────────────────────────────────────────────
# # ITEMS
# # ─────────────────────────────────────────────

# def get_all_items(warehouses, from_date, to_date, item_code_filter=None, project_filter=None):
# 	"""
# 	Get all items that have transactions OR closing stock in the period.
# 	When project_filter is set, only items that have at least one SLE
# 	with custom_project_no = project_filter are returned.
# 	"""
# 	proj_cond, proj_params = _project_condition(project_filter)

# 	item_cond = ""
# 	item_params = []
# 	if item_code_filter:
# 		item_cond = " AND sle.item_code = %s "
# 		item_params = [item_code_filter]

# 	wh_placeholders = ','.join(['%s'] * len(warehouses))

# 	# Items with transactions in period
# 	transaction_items = frappe.db.sql(f"""
# 		SELECT DISTINCT sle.item_code
# 		FROM `tabStock Ledger Entry` sle
# 		WHERE sle.warehouse IN ({wh_placeholders})
# 			AND sle.posting_date >= %s
# 			AND sle.posting_date <= %s
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 			{item_cond}
# 			{proj_cond}
# 		ORDER BY sle.item_code
# 	""", list(warehouses) + [from_date, to_date] + item_params + proj_params, as_list=1)

# 	# Items with closing stock as of to_date
# 	stock_items = frappe.db.sql(f"""
# 		SELECT DISTINCT sle.item_code
# 		FROM `tabStock Ledger Entry` sle
# 		WHERE sle.warehouse IN ({wh_placeholders})
# 			AND sle.posting_date <= %s
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 			AND sle.qty_after_transaction > 0
# 			{item_cond}
# 			{proj_cond}
# 		ORDER BY sle.item_code
# 	""", list(warehouses) + [to_date] + item_params + proj_params, as_list=1)

# 	all_items = list(set(
# 		[i[0] for i in transaction_items] + [i[0] for i in stock_items]
# 	))
# 	return sorted(all_items)


# def get_item_details(item_codes):
# 	item_details = {}
# 	if not item_codes:
# 		return item_details
# 	items = frappe.db.sql("""
# 		SELECT name, item_group, description, item_name, technical_description
# 		FROM `tabItem`
# 		WHERE name IN ({})
# 	""".format(','.join(['%s'] * len(item_codes))), item_codes, as_dict=1)
# 	for item in items:
# 		item_details[item.name] = {
# 			"item_name": item.item_name or "",
# 			"item_group": item.item_group or "",
# 			"description": item.description or "",
# 			"technical_description": item.technical_description or ""
# 		}
# 	return item_details


# def get_bins_and_projects_for_item_warehouse(item_code, warehouse, from_date, to_date, project_filter=None):
# 	# Use _project_condition with no alias since this query has no table alias
# 	proj_cond, proj_params = _project_condition(project_filter, alias="")
# 	sle_data = frappe.db.sql(f"""
# 		SELECT DISTINCT
# 			COALESCE(custom_bin_no, '') as custom_bin_no,
# 			COALESCE(custom_project_no, '') as custom_project_no
# 		FROM `tabStock Ledger Entry`
# 		WHERE item_code = %s
# 			AND warehouse = %s
# 			AND is_cancelled = 0
# 			AND docstatus < 2
# 			{proj_cond}
# 	""", [item_code, warehouse] + proj_params, as_dict=1)

# 	bins_set = set()
# 	projects_set = set()
# 	for sle in sle_data:
# 		if sle.get("custom_bin_no"):
# 			bins_set.add(sle["custom_bin_no"])
# 		if sle.get("custom_project_no"):
# 			projects_set.add(sle["custom_project_no"])
# 	return sorted(bins_set), sorted(projects_set)


# # ─────────────────────────────────────────────
# # STOCK DATA FETCHERS — all accept project_filter
# # ─────────────────────────────────────────────

# def get_opening_stock(warehouses, from_date, bin_filter=None, project_filter=None):
# 	"""
# 	Opening stock = sum of all project-specific transactions BEFORE from_date.
# 	When project_filter is set, only include transactions with that project.
# 	"""
# 	opening_stock = defaultdict(lambda: defaultdict(lambda: defaultdict(
# 		lambda: {"qty": 0.0, "value": 0.0, "rate": 0.0, "bin": "", "project": ""}
# 	)))

# 	proj_cond, proj_params = _project_condition(project_filter)
# 	wh_placeholders = ','.join(['%s'] * len(warehouses))

# 	# Get sum of all project-specific transactions before from_date
# 	sle_data = frappe.db.sql(f"""
# 		SELECT
# 			sle.item_code, sle.warehouse,
# 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# 			SUM(sle.actual_qty) as total_qty,
# 			SUM(sle.actual_qty * sle.valuation_rate) as total_value
# 		FROM `tabStock Ledger Entry` sle
# 		WHERE sle.warehouse IN ({wh_placeholders})
# 			AND sle.posting_date < %s
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 			{proj_cond}
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 		HAVING SUM(sle.actual_qty) != 0
# 	""", list(warehouses) + [from_date] + proj_params, as_dict=1)

# 	for sle in sle_data:
# 		bin_no = sle.custom_bin_no or ""
# 		project_no = sle.custom_project_no or ""
# 		key = f"{bin_no}|||{project_no}"
# 		opening_stock[sle.item_code][sle.warehouse][key] = {
# 			"qty": flt(sle.total_qty, 3),
# 			"value": flt(sle.total_value, 2),
# 			"rate": flt(sle.total_value / sle.total_qty, 2) if sle.total_qty else 0.0,
# 			"bin": bin_no,
# 			"project": project_no
# 		}

# 	return opening_stock


# def get_closing_stock(warehouses, to_date, project_filter=None):
# 	"""
# 	Closing stock = actual stock balance from Stock Ledger Entry using Stock Balance logic.
# 	Matches ERPNext standard Stock Balance report exactly.
# 	When project_filter is applied, uses latest project assignment logic.
# 	"""
# 	closing_stock = defaultdict(lambda: defaultdict(lambda: defaultdict(
# 		lambda: {"qty": 0.0, "value": 0.0, "rate": 0.0, "bin": "", "project": ""}
# 	)))

# 	wh_placeholders = ','.join(['%s'] * len(warehouses))

# 	if project_filter:
# 		# When project filter is applied, use Stock Balance logic with project assignment
# 		# Step 1: Get stock balance data using exact Stock Balance report logic
# 		stock_balance_data = frappe.db.sql(f"""
# 			SELECT 
# 				item_code,
# 				warehouse,
# 				qty_after_transaction as closing_qty,
# 				valuation_rate,
# 				(qty_after_transaction * valuation_rate) as closing_value
# 			FROM (
# 				SELECT 
# 					item_code,
# 					warehouse,
# 					qty_after_transaction,
# 					valuation_rate,
# 					ROW_NUMBER() OVER (
# 						PARTITION BY item_code, warehouse
# 						ORDER BY posting_date DESC, posting_time DESC, name DESC
# 					) as rn
# 				FROM `tabStock Ledger Entry`
# 				WHERE warehouse IN ({wh_placeholders})
# 					AND posting_date <= %s
# 					AND is_cancelled = 0
# 					AND docstatus < 2
# 			) ranked
# 			WHERE rn = 1 AND qty_after_transaction != 0
# 		""", list(warehouses) + [to_date], as_dict=1)
		
# 		# Step 2: Get latest project assignment for each item-warehouse
# 		project_assignments = frappe.db.sql(f"""
# 			SELECT 
# 				item_code,
# 				warehouse,
# 				COALESCE(custom_project_no, '') as custom_project_no
# 			FROM (
# 				SELECT 
# 					item_code,
# 					warehouse,
# 					custom_project_no,
# 					ROW_NUMBER() OVER (
# 						PARTITION BY item_code, warehouse
# 						ORDER BY posting_date DESC, posting_time DESC, name DESC
# 					) as rn
# 				FROM `tabStock Ledger Entry`
# 				WHERE warehouse IN ({wh_placeholders})
# 					AND posting_date <= %s
# 					AND is_cancelled = 0
# 					AND docstatus < 2
# 					AND COALESCE(custom_project_no, '') != ''
# 			) ranked
# 			WHERE rn = 1
# 		""", list(warehouses) + [to_date], as_dict=1)
		
# 		# Create project assignment lookup
# 		assignment_lookup = {}
# 		for assignment in project_assignments:
# 			key = (assignment.item_code, assignment.warehouse)
# 			assignment_lookup[key] = assignment.custom_project_no
		
# 		# Step 3: Only include stock assigned to the filtered project
# 		for stock in stock_balance_data:
# 			key = (stock.item_code, stock.warehouse)
# 			assigned_project = assignment_lookup.get(key, "")
			
# 			if assigned_project == project_filter:
# 				bin_project_key = "|||"
# 				closing_stock[stock.item_code][stock.warehouse][bin_project_key] = {
# 					"qty": flt(stock.closing_qty, 3),
# 					"value": flt(stock.closing_value, 2),
# 					"rate": flt(stock.valuation_rate, 2) if stock.valuation_rate else 0.0,
# 					"bin": "", 
# 					"project": ""
# 				}
# 	else:
# 		# When no project filter, use tabBin for warehouse total (original logic)
# 		stock_data = frappe.db.sql(f"""
# 			SELECT 
# 				item_code, 
# 				warehouse,
# 				SUM(actual_qty) as total_qty,
# 				SUM(stock_value) as total_value
# 			FROM `tabBin`
# 			WHERE warehouse IN ({wh_placeholders})
# 				AND actual_qty != 0
# 			GROUP BY item_code, warehouse
# 		""", list(warehouses), as_dict=1)

# 		for stock in stock_data:
# 			bin_project_key = "|||"
# 			closing_stock[stock.item_code][stock.warehouse][bin_project_key] = {
# 				"qty": flt(stock.total_qty, 3),
# 				"value": flt(stock.total_value, 2),
# 				"rate": flt(stock.total_value / stock.total_qty, 2) if stock.total_qty else 0.0,
# 				"bin": "", "project": ""
# 			}

# 	return closing_stock


# def _build_transaction_data(sql, params):
# 	result = defaultdict(lambda: defaultdict(lambda: defaultdict(
# 		lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""}
# 	)))
# 	rows = frappe.db.sql(sql, params, as_dict=1)
# 	for r in rows:
# 		item_code = r.item_code
# 		warehouse = r.warehouse
# 		bin_no = r.get("custom_bin_no") or ""
# 		project_no = r.get("custom_project_no") or ""
# 		key = f"{bin_no}|||{project_no}"
# 		qty = flt(r.total_qty)
# 		amount = flt(r.total_amount)
# 		result[item_code][warehouse][key] = {
# 			"qty": qty,
# 			"amount": amount,
# 			"rate": flt(amount / qty, 2) if qty else 0.0,
# 			"bin": bin_no,
# 			"project": project_no
# 		}
# 	return result


# def get_receipt_data(warehouses, from_date, to_date, project_filter=None):
# 	proj_cond, proj_params = _project_condition(project_filter)
# 	wh_ph = ','.join(['%s'] * len(warehouses))
# 	sql = f"""
# 		SELECT sle.item_code, sle.warehouse,
# 			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
# 			COALESCE(sle.custom_project_no,'') as custom_project_no,
# 			SUM(sle.actual_qty) as total_qty,
# 			SUM(sle.actual_qty * sle.valuation_rate) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# 		WHERE sle.warehouse IN ({wh_ph})
# 			AND sle.posting_date >= %s AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Purchase Receipt'
# 			AND pr.is_return = 0 AND sle.actual_qty > 0
# 			AND sle.is_cancelled = 0 AND sle.docstatus < 2
# 			{proj_cond}
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	"""
# 	return _build_transaction_data(sql, list(warehouses) + [from_date, to_date] + proj_params)


# def get_return_data(warehouses, from_date, to_date, project_filter=None):
# 	proj_cond, proj_params = _project_condition(project_filter)
# 	wh_ph = ','.join(['%s'] * len(warehouses))
# 	sql = f"""
# 		SELECT sle.item_code, sle.warehouse,
# 			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
# 			COALESCE(sle.custom_project_no,'') as custom_project_no,
# 			SUM(ABS(sle.actual_qty)) as total_qty,
# 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# 		WHERE sle.warehouse IN ({wh_ph})
# 			AND sle.posting_date >= %s AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Purchase Receipt'
# 			AND pr.is_return = 1 AND sle.actual_qty < 0
# 			AND sle.is_cancelled = 0 AND sle.docstatus < 2
# 			{proj_cond}
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	"""
# 	return _build_transaction_data(sql, list(warehouses) + [from_date, to_date] + proj_params)


# def get_issue_data(warehouses, from_date, to_date, project_filter=None):
# 	proj_cond, proj_params = _project_condition(project_filter)
# 	wh_ph = ','.join(['%s'] * len(warehouses))
# 	sql = f"""
# 		SELECT sle.item_code, sle.warehouse,
# 			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
# 			COALESCE(sle.custom_project_no,'') as custom_project_no,
# 			SUM(ABS(sle.actual_qty)) as total_qty,
# 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		WHERE sle.warehouse IN ({wh_ph})
# 			AND sle.posting_date >= %s AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Delivery Note'
# 			AND sle.actual_qty < 0
# 			AND sle.is_cancelled = 0 AND sle.docstatus < 2
# 			{proj_cond}
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	"""
# 	return _build_transaction_data(sql, list(warehouses) + [from_date, to_date] + proj_params)


# def get_other_receipt_data(warehouses, from_date, to_date, project_filter=None):
# 	proj_cond, proj_params = _project_condition(project_filter)
# 	wh_ph = ','.join(['%s'] * len(warehouses))
# 	sql = f"""
# 		SELECT sle.item_code, sle.warehouse,
# 			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
# 			COALESCE(sle.custom_project_no,'') as custom_project_no,
# 			SUM(sle.actual_qty) as total_qty,
# 			SUM(sle.actual_qty * sle.valuation_rate) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 		WHERE sle.warehouse IN ({wh_ph})
# 			AND sle.posting_date >= %s AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Stock Entry'
# 			AND se.purpose = 'Material Receipt'
# 			AND sle.actual_qty > 0
# 			AND sle.is_cancelled = 0 AND sle.docstatus < 2
# 			{proj_cond}
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	"""
# 	return _build_transaction_data(sql, list(warehouses) + [from_date, to_date] + proj_params)


# def get_other_issue_data(warehouses, from_date, to_date, project_filter=None):
# 	proj_cond, proj_params = _project_condition(project_filter)
# 	wh_ph = ','.join(['%s'] * len(warehouses))

# 	sql_send = f"""
# 		SELECT sle.item_code, sle.warehouse,
# 			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
# 			COALESCE(sle.custom_project_no,'') as custom_project_no,
# 			SUM(ABS(sle.actual_qty)) as total_qty,
# 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 		WHERE sle.warehouse IN ({wh_ph})
# 			AND sle.posting_date >= %s AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Stock Entry'
# 			AND se.purpose = 'Send to Subcontractor'
# 			AND sle.actual_qty < 0
# 			AND sle.is_cancelled = 0 AND sle.docstatus < 2
# 			{proj_cond}
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	"""

# 	sql_transfer = f"""
# 		SELECT sle.item_code, sle.warehouse,
# 			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
# 			COALESCE(sle.custom_project_no,'') as custom_project_no,
# 			SUM(ABS(sle.actual_qty)) as total_qty,
# 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 		WHERE sle.warehouse IN ({wh_ph})
# 			AND sle.posting_date >= %s AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Stock Entry'
# 			AND se.purpose = 'Material Transfer'
# 			AND sle.actual_qty < 0
# 			AND sle.is_cancelled = 0 AND sle.docstatus < 2
# 			{proj_cond}
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	"""

# 	base_params = list(warehouses) + [from_date, to_date] + proj_params
# 	d1 = _build_transaction_data(sql_send, base_params)
# 	d2 = _build_transaction_data(sql_transfer, base_params)

# 	# Merge d2 into d1
# 	for item_code in d2:
# 		for warehouse in d2[item_code]:
# 			for key, vals in d2[item_code][warehouse].items():
# 				if key in d1[item_code][warehouse]:
# 					d1[item_code][warehouse][key]["qty"]    += vals["qty"]
# 					d1[item_code][warehouse][key]["amount"] += vals["amount"]
# 				else:
# 					d1[item_code][warehouse][key] = vals
# 	return d1


# def get_material_transfer_data(warehouses, from_date, to_date, project_filter=None):
# 	proj_cond, proj_params = _project_condition(project_filter)
# 	wh_ph = ','.join(['%s'] * len(warehouses))
# 	base_params = list(warehouses) + [from_date, to_date] + proj_params

# 	sql_factory = f"""
# 		SELECT sle.item_code, sle.warehouse,
# 			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
# 			COALESCE(sle.custom_project_no,'') as custom_project_no,
# 			SUM(sle.actual_qty) as total_qty,
# 			SUM(sle.actual_qty * sle.valuation_rate) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 		WHERE sle.warehouse IN ({wh_ph})
# 			AND sle.posting_date >= %s AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Stock Entry'
# 			AND se.purpose = 'Material Transfer'
# 			AND sle.actual_qty > 0
# 			AND sle.is_cancelled = 0 AND sle.docstatus < 2
# 			{proj_cond}
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	"""

# 	sql_jobwork = f"""
# 		SELECT sle.item_code, sed.t_warehouse as warehouse,
# 			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
# 			COALESCE(sle.custom_project_no,'') as custom_project_no,
# 			SUM(ABS(sle.actual_qty)) as total_qty,
# 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 		INNER JOIN `tabStock Entry Detail` sed ON se.name = sed.parent AND sle.item_code = sed.item_code
# 		WHERE sle.posting_date >= %s AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Stock Entry'
# 			AND se.purpose = 'Send to Subcontractor'
# 			AND sle.actual_qty < 0
# 			AND sle.is_cancelled = 0 AND sle.docstatus < 2
# 			{proj_cond}
# 		GROUP BY sle.item_code, sed.t_warehouse, sle.custom_bin_no, sle.custom_project_no
# 	"""

# 	wip_factory = _build_transaction_data(sql_factory, base_params)
# 	# jobwork query has no warehouse IN clause so params differ
# 	wip_jobwork = _build_transaction_data(sql_jobwork, [from_date, to_date] + proj_params)

# 	return wip_factory, wip_jobwork


# def get_stock_reconciliation_data(warehouses, to_date):
# 	recon_data = defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "rate": 0.0, "amount": 0.0}))
# 	wh_ph = ','.join(['%s'] * len(warehouses))
# 	data = frappe.db.sql(f"""
# 		SELECT DISTINCT sle.item_code, sle.warehouse,
# 			sle.qty_after_transaction as qty,
# 			sle.valuation_rate as rate,
# 			sle.qty_after_transaction * sle.valuation_rate as amount
# 		FROM `tabStock Ledger Entry` sle
# 		WHERE sle.warehouse IN ({wh_ph})
# 			AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Stock Reconciliation'
# 			AND sle.is_cancelled = 0 AND sle.docstatus < 2
# 			AND (sle.item_code, sle.warehouse, sle.posting_date) IN (
# 				SELECT sle2.item_code, sle2.warehouse, MAX(sle2.posting_date)
# 				FROM `tabStock Ledger Entry` sle2
# 				WHERE sle2.warehouse IN ({wh_ph})
# 					AND sle2.posting_date <= %s
# 					AND sle2.voucher_type = 'Stock Reconciliation'
# 					AND sle2.is_cancelled = 0 AND sle2.docstatus < 2
# 				GROUP BY sle2.item_code, sle2.warehouse
# 			)
# 	""", tuple(warehouses) + (to_date,) + tuple(warehouses) + (to_date,), as_dict=1)
# 	for row in data:
# 		recon_data[row.item_code][row.warehouse] = {
# 			"qty": flt(row.qty, 3), "rate": flt(row.rate, 2), "amount": flt(row.amount, 2)
# 		}
# 	return recon_data


# # ─────────────────────────────────────────────
# # DATA PREPARATION FUNCTIONS
# # ─────────────────────────────────────────────

# def prepare_item_wise_data(all_items, item_details, opening_stock, closing_stock,
# 							receipt_data, return_data, issue_data, other_receipt_data,
# 							other_issue_data, wip_factory_in_data, wip_job_work_data,
# 							stock_recon_data=None, from_date=None, to_date=None,
# 							project_filter=None):
# 	data = []

# 	for item_code in sorted(all_items):
# 		warehouses_for_item = set()
# 		for d in [opening_stock, closing_stock, receipt_data, return_data,
# 				  issue_data, other_receipt_data, other_issue_data,
# 				  wip_factory_in_data, wip_job_work_data]:
# 			if item_code in d:
# 				warehouses_for_item.update(d[item_code].keys())

# 		for warehouse in sorted(warehouses_for_item):
# 			def _sum(src):
# 				q, v = 0.0, 0.0
# 				for vals in src.get(item_code, {}).get(warehouse, {}).values():
# 					q += flt(vals.get("qty"), 3)
# 					v += flt(vals.get("amount") or vals.get("value"), 2)
# 				return q, v

# 			# Get opening values from the opening_stock data structure
# 			# which now properly contains project-specific transactions
# 			opening_value = sum(
# 				flt(v.get("value"), 2)
# 				for v in opening_stock.get(item_code, {}).get(warehouse, {}).values()
# 			)
# 			opening_qty = sum(
# 				flt(v.get("qty"), 3)
# 				for v in opening_stock.get(item_code, {}).get(warehouse, {}).values()
# 			)
# 			opening_rate = flt(opening_value / opening_qty, 2) if opening_qty else 0.0

# 			receipt_qty, receipt_amount = _sum(receipt_data)
# 			receipt_rate = flt(receipt_amount / receipt_qty, 2) if receipt_qty else 0.0

# 			return_qty, return_amount = _sum(return_data)
# 			return_rate = flt(return_amount / return_qty, 2) if return_qty else 0.0

# 			dc_qty, dc_amount = _sum(issue_data)
# 			dc_rate = flt(dc_amount / dc_qty, 2) if dc_qty else 0.0

# 			or_qty, or_amount = _sum(other_receipt_data)
# 			or_rate = flt(or_amount / or_qty, 2) if or_qty else 0.0

# 			oi_qty, oi_amount = _sum(other_issue_data)
# 			oi_rate = flt(oi_amount / oi_qty, 2) if oi_qty else 0.0

# 			wf_qty, wf_amount = _sum(wip_factory_in_data)
# 			wf_rate = flt(wf_amount / wf_qty, 2) if wf_qty else 0.0

# 			wj_qty, wj_amount = _sum(wip_job_work_data)
# 			wj_rate = flt(wj_amount / wj_qty, 2) if wj_qty else 0.0

# 			# Use actual closing stock data which now contains project-specific totals
# 			closing_qty = sum(
# 				flt(v.get("qty"), 3)
# 				for v in closing_stock.get(item_code, {}).get(warehouse, {}).values()
# 			)
# 			closing_value = sum(
# 				flt(v.get("value"), 2)
# 				for v in closing_stock.get(item_code, {}).get(warehouse, {}).values()
# 			)
# 			closing_rate = flt(closing_value / closing_qty, 2) if closing_qty else 0.0

# 			if not any([opening_qty, opening_value, receipt_qty, receipt_amount,
# 						return_qty, return_amount, dc_qty, dc_amount,
# 						or_qty, or_amount, oi_qty, oi_amount,
# 						wf_qty, wf_amount, wj_qty, wj_amount,
# 						closing_qty, closing_value]):
# 				continue

# 			item_info = item_details.get(item_code, {})
# 			bins_list, projects_list = get_bins_and_projects_for_item_warehouse(
# 				item_code, warehouse, from_date, to_date,
# 				project_filter=project_filter     # ← scoped to project
# 			)

# 			data.append({
# 				"item_code": item_code,
# 				"item_name": item_info.get("item_name", ""),
# 				"item_group": item_info.get("item_group", ""),
# 				"description": item_info.get("description", ""),
# 				"technical_description": item_info.get("technical_description", ""),
# 				"warehouse": warehouse,
# 				"bin_location": ", ".join(bins_list) if bins_list else "",
# 				"project_list": ", ".join(projects_list) if projects_list else "",
# 				"opening_qty": opening_qty,
# 				"opening_rate": opening_rate,
# 				"opening_value": flt(max(opening_value, 0), 2),
# 				"receipt_qty": receipt_qty,
# 				"receipt_rate": receipt_rate,
# 				"receipt_amount": flt(max(receipt_amount, 0), 2),
# 				"return_qty": return_qty,
# 				"return_rate": return_rate,
# 				"return_amount": flt(max(return_amount, 0), 2),
# 				"dc_to_customer_qty": dc_qty,
# 				"dc_to_customer_rate": dc_rate,
# 				"dc_to_customer_amount": flt(max(dc_amount, 0), 2),
# 				"other_receipt_qty": or_qty,
# 				"other_receipt_rate": or_rate,
# 				"other_receipt_amount": flt(max(or_amount, 0), 2),
# 				"other_issue_qty": oi_qty,
# 				"other_issue_rate": oi_rate,
# 				"other_issue_amount": flt(max(oi_amount, 0), 2),
# 				"wip_factory_qty": wf_qty,
# 				"wip_factory_rate": wf_rate,
# 				"wip_factory_amount": flt(max(wf_amount, 0), 2),
# 				"wip_job_work_qty": wj_qty,
# 				"wip_job_work_rate": wj_rate,
# 				"wip_job_work_amount": flt(max(wj_amount, 0), 2),
# 				"closing_qty": flt(max(closing_qty, 0), 3),
# 				"closing_rate": closing_rate,
# 				"closing_amount": flt(max(closing_value, 0), 2),
# 			})

# 	return data


# def prepare_item_group_wise_data(all_items, item_details, opening_stock, closing_stock,
# 								 receipt_data, return_data, issue_data, other_receipt_data,
# 								 other_issue_data, wip_factory_in_data, wip_job_work_data):
# 	"""Unchanged — project filter already scoped upstream via all_items + data dicts."""
# 	groups = defaultdict(lambda: defaultdict(float))

# 	for item_code in all_items:
# 		ig = item_details.get(item_code, {}).get("item_group", "Unknown")
# 		for warehouse in set(
# 			list(opening_stock.get(item_code, {}).keys()) +
# 			list(closing_stock.get(item_code, {}).keys())
# 		):
# 			def add(src, key_qty, key_amt):
# 				for v in src.get(item_code, {}).get(warehouse, {}).values():
# 					groups[ig][key_qty] += flt(v.get("qty"), 3)
# 					groups[ig][key_amt] += flt(v.get("amount") or v.get("value"), 2)

# 			for v in opening_stock.get(item_code, {}).get(warehouse, {}).values():
# 				groups[ig]["opening_qty"]   += flt(v.get("qty"), 3)
# 				groups[ig]["opening_value"] += flt(v.get("value"), 2)
# 			for v in closing_stock.get(item_code, {}).get(warehouse, {}).values():
# 				groups[ig]["closing_qty"]   += flt(v.get("qty"), 3)
# 				groups[ig]["closing_value"] += flt(v.get("value"), 2)
# 			add(receipt_data,       "receipt_qty",       "receipt_amount")
# 			add(return_data,        "return_qty",        "return_amount")
# 			add(issue_data,         "dc_to_customer_qty","dc_to_customer_amount")
# 			add(other_receipt_data, "other_receipt_qty", "other_receipt_amount")
# 			add(other_issue_data,   "other_issue_qty",   "other_issue_amount")
# 			add(wip_factory_in_data,"wip_factory_qty",   "wip_factory_amount")
# 			add(wip_job_work_data,  "wip_job_work_qty",  "wip_job_work_amount")

# 	data = []
# 	for ig, vals in sorted(groups.items()):
# 		oq = vals.get("opening_qty", 0)
# 		ov = vals.get("opening_value", 0)
# 		cq = vals.get("closing_qty", 0)
# 		cv = vals.get("closing_value", 0)
# 		data.append({
# 			"item_group": ig,
# 			"opening_qty": oq, "opening_rate": flt(ov/oq,2) if oq else 0, "opening_value": ov,
# 			"receipt_qty": vals.get("receipt_qty",0), "receipt_rate": 0, "receipt_amount": vals.get("receipt_amount",0),
# 			"return_qty": vals.get("return_qty",0), "return_rate": 0, "return_amount": vals.get("return_amount",0),
# 			"dc_to_customer_qty": vals.get("dc_to_customer_qty",0), "dc_to_customer_rate": 0, "dc_to_customer_amount": vals.get("dc_to_customer_amount",0),
# 			"other_receipt_qty": vals.get("other_receipt_qty",0), "other_receipt_rate": 0, "other_receipt_amount": vals.get("other_receipt_amount",0),
# 			"other_issue_qty": vals.get("other_issue_qty",0), "other_issue_rate": 0, "other_issue_amount": vals.get("other_issue_amount",0),
# 			"wip_factory_qty": vals.get("wip_factory_qty",0), "wip_factory_rate": 0, "wip_factory_amount": vals.get("wip_factory_amount",0),
# 			"wip_job_work_qty": vals.get("wip_job_work_qty",0), "wip_job_work_rate": 0, "wip_job_work_amount": vals.get("wip_job_work_amount",0),
# 			"closing_qty": cq, "closing_rate": flt(cv/cq,2) if cq else 0, "closing_amount": cv,
# 		})
# 	return data


# def prepare_warehouse_wise_data(all_items, item_details, opening_stock, closing_stock,
# 								receipt_data, return_data, issue_data, other_receipt_data,
# 								other_issue_data, wip_factory_in_data, wip_job_work_data):
# 	data = []
# 	all_warehouses = set()
# 	for item_code in all_items:
# 		for d in [opening_stock, closing_stock]:
# 			all_warehouses.update(d.get(item_code, {}).keys())

# 	for warehouse in sorted(all_warehouses):
# 		vals = defaultdict(float)
# 		for item_code in all_items:
# 			for v in opening_stock.get(item_code,{}).get(warehouse,{}).values():
# 				vals["opening_qty"]   += flt(v.get("qty"),3)
# 				vals["opening_value"] += flt(v.get("value"),2)
# 			for v in closing_stock.get(item_code,{}).get(warehouse,{}).values():
# 				vals["closing_qty"]   += flt(v.get("qty"),3)
# 				vals["closing_value"] += flt(v.get("value"),2)
# 			for src, kq, ka in [
# 				(receipt_data,"receipt_qty","receipt_amount"),
# 				(return_data,"return_qty","return_amount"),
# 				(issue_data,"dc_to_customer_qty","dc_to_customer_amount"),
# 				(other_receipt_data,"other_receipt_qty","other_receipt_amount"),
# 				(other_issue_data,"other_issue_qty","other_issue_amount"),
# 				(wip_factory_in_data,"wip_factory_qty","wip_factory_amount"),
# 				(wip_job_work_data,"wip_job_work_qty","wip_job_work_amount"),
# 			]:
# 				for v in src.get(item_code,{}).get(warehouse,{}).values():
# 					vals[kq] += flt(v.get("qty"),3)
# 					vals[ka] += flt(v.get("amount"),2)

# 		oq, ov = vals["opening_qty"], vals["opening_value"]
# 		cq, cv = vals["closing_qty"], vals["closing_value"]
# 		if not any(vals.values()):
# 			continue
# 		data.append({
# 			"warehouse": warehouse,
# 			"opening_qty": oq, "opening_rate": flt(ov/oq,2) if oq else 0, "opening_value": ov,
# 			"receipt_qty": vals["receipt_qty"], "receipt_rate": 0, "receipt_amount": vals["receipt_amount"],
# 			"return_qty": vals["return_qty"], "return_rate": 0, "return_amount": vals["return_amount"],
# 			"dc_to_customer_qty": vals["dc_to_customer_qty"], "dc_to_customer_rate": 0, "dc_to_customer_amount": vals["dc_to_customer_amount"],
# 			"other_receipt_qty": vals["other_receipt_qty"], "other_receipt_rate": 0, "other_receipt_amount": vals["other_receipt_amount"],
# 			"other_issue_qty": vals["other_issue_qty"], "other_issue_rate": 0, "other_issue_amount": vals["other_issue_amount"],
# 			"wip_factory_qty": vals["wip_factory_qty"], "wip_factory_rate": 0, "wip_factory_amount": vals["wip_factory_amount"],
# 			"wip_job_work_qty": vals["wip_job_work_qty"], "wip_job_work_rate": 0, "wip_job_work_amount": vals["wip_job_work_amount"],
# 			"closing_qty": cq, "closing_rate": flt(cv/cq,2) if cq else 0, "closing_amount": cv,
# 		})
# 	return data


# def prepare_bin_wise_data(all_items, item_details, opening_stock, closing_stock,
# 						  receipt_data, return_data, issue_data, other_receipt_data,
# 						  other_issue_data, wip_factory_in_data, wip_job_work_data):
# 	"""Unchanged from original — project filter scoped upstream."""
# 	data = []
# 	all_bins = set()
# 	for item_code in all_items:
# 		for warehouse in opening_stock.get(item_code, {}):
# 			for key in opening_stock[item_code][warehouse]:
# 				bin_no = key.split("|||")[0]
# 				if bin_no:
# 					all_bins.add(bin_no)

# 	for bin_name in sorted(all_bins):
# 		vals = defaultdict(float)
# 		for item_code in all_items:
# 			for d, kq, ka in [
# 				(opening_stock,"opening_qty","opening_value"),
# 				(receipt_data,"receipt_qty","receipt_amount"),
# 				(return_data,"return_qty","return_amount"),
# 				(issue_data,"dc_to_customer_qty","dc_to_customer_amount"),
# 				(other_receipt_data,"other_receipt_qty","other_receipt_amount"),
# 				(other_issue_data,"other_issue_qty","other_issue_amount"),
# 				(wip_factory_in_data,"wip_factory_qty","wip_factory_amount"),
# 				(wip_job_work_data,"wip_job_work_qty","wip_job_work_amount"),
# 			]:
# 				for warehouse in d.get(item_code, {}):
# 					for key, v in d[item_code][warehouse].items():
# 						if bin_name in key:
# 							vals[kq] += flt(v.get("qty"),3)
# 							vals[ka] += flt(v.get("amount") or v.get("value"),2)

# 		oq, ov = vals["opening_qty"], vals["opening_value"]
# 		cq = flt(oq + vals["receipt_qty"] + vals["other_receipt_qty"] + vals["wip_factory_qty"]
# 				 - vals["return_qty"] - vals["dc_to_customer_qty"] - vals["other_issue_qty"] - vals["wip_job_work_qty"], 3)
# 		ca = flt(ov + vals["receipt_amount"] + vals["other_receipt_amount"] + vals["wip_factory_amount"]
# 				 - vals["return_amount"] - vals["dc_to_customer_amount"] - vals["other_issue_amount"] - vals["wip_job_work_amount"], 2)
# 		if not any(vals.values()):
# 			continue
# 		data.append({
# 			"bin": bin_name,
# 			"opening_qty": oq, "opening_rate": flt(ov/oq,2) if oq else 0, "opening_value": ov,
# 			"receipt_qty": vals["receipt_qty"], "receipt_rate": 0, "receipt_amount": vals["receipt_amount"],
# 			"return_qty": vals["return_qty"], "return_rate": 0, "return_amount": vals["return_amount"],
# 			"dc_to_customer_qty": vals["dc_to_customer_qty"], "dc_to_customer_rate": 0, "dc_to_customer_amount": vals["dc_to_customer_amount"],
# 			"other_receipt_qty": vals["other_receipt_qty"], "other_receipt_rate": 0, "other_receipt_amount": vals["other_receipt_amount"],
# 			"other_issue_qty": vals["other_issue_qty"], "other_issue_rate": 0, "other_issue_amount": vals["other_issue_amount"],
# 			"wip_factory_qty": vals["wip_factory_qty"], "wip_factory_rate": 0, "wip_factory_amount": vals["wip_factory_amount"],
# 			"wip_job_work_qty": vals["wip_job_work_qty"], "wip_job_work_rate": 0, "wip_job_work_amount": vals["wip_job_work_amount"],
# 			"closing_qty": cq, "closing_rate": flt(ca/cq,2) if cq else 0, "closing_amount": ca,
# 		})
# 	return data


# def prepare_project_wise_data(all_items, item_details, opening_stock, closing_stock,
# 							  receipt_data, return_data, issue_data, other_receipt_data,
# 							  other_issue_data, wip_factory_in_data, wip_job_work_data):
# 	"""Unchanged from original — project filter scoped upstream."""
# 	data = []
# 	all_projects = set()
# 	for item_code in all_items:
# 		for warehouse in opening_stock.get(item_code, {}):
# 			for key in opening_stock[item_code][warehouse]:
# 				project_no = key.split("|||")[1]
# 				if project_no:
# 					all_projects.add(project_no)

# 	for project in sorted(all_projects):
# 		vals = defaultdict(float)
# 		for item_code in all_items:
# 			for d, kq, ka in [
# 				(opening_stock,"opening_qty","opening_value"),
# 				(receipt_data,"receipt_qty","receipt_amount"),
# 				(return_data,"return_qty","return_amount"),
# 				(issue_data,"dc_to_customer_qty","dc_to_customer_amount"),
# 				(other_receipt_data,"other_receipt_qty","other_receipt_amount"),
# 				(other_issue_data,"other_issue_qty","other_issue_amount"),
# 				(wip_factory_in_data,"wip_factory_qty","wip_factory_amount"),
# 				(wip_job_work_data,"wip_job_work_qty","wip_job_work_amount"),
# 			]:
# 				for warehouse in d.get(item_code, {}):
# 					for key, v in d[item_code][warehouse].items():
# 						if project in key:
# 							vals[kq] += flt(v.get("qty"),3)
# 							vals[ka] += flt(v.get("amount") or v.get("value"),2)

# 		oq, ov = vals["opening_qty"], vals["opening_value"]
# 		cq = flt(oq + vals["receipt_qty"] + vals["other_receipt_qty"] + vals["wip_factory_qty"]
# 				 - vals["return_qty"] - vals["dc_to_customer_qty"] - vals["other_issue_qty"] - vals["wip_job_work_qty"], 3)
# 		ca = flt(ov + vals["receipt_amount"] + vals["other_receipt_amount"] + vals["wip_factory_amount"]
# 				 - vals["return_amount"] - vals["dc_to_customer_amount"] - vals["other_issue_amount"] - vals["wip_job_work_amount"], 2)
# 		if not any(vals.values()):
# 			continue
# 		data.append({
# 			"project": project,
# 			"opening_qty": oq, "opening_rate": flt(ov/oq,2) if oq else 0, "opening_value": ov,
# 			"receipt_qty": vals["receipt_qty"], "receipt_rate": 0, "receipt_amount": vals["receipt_amount"],
# 			"return_qty": vals["return_qty"], "return_rate": 0, "return_amount": vals["return_amount"],
# 			"dc_to_customer_qty": vals["dc_to_customer_qty"], "dc_to_customer_rate": 0, "dc_to_customer_amount": vals["dc_to_customer_amount"],
# 			"other_receipt_qty": vals["other_receipt_qty"], "other_receipt_rate": 0, "other_receipt_amount": vals["other_receipt_amount"],
# 			"other_issue_qty": vals["other_issue_qty"], "other_issue_rate": 0, "other_issue_amount": vals["other_issue_amount"],
# 			"wip_factory_qty": vals["wip_factory_qty"], "wip_factory_rate": 0, "wip_factory_amount": vals["wip_factory_amount"],
# 			"wip_job_work_qty": vals["wip_job_work_qty"], "wip_job_work_rate": 0, "wip_job_work_amount": vals["wip_job_work_amount"],
# 			"closing_qty": cq, "closing_rate": flt(ca/cq,2) if cq else 0, "closing_amount": ca,
# 		})
# 	return data


# def filter_by_bin_project(data, bin=None, project=None):
# 	filtered = defaultdict(lambda: defaultdict(lambda: {}))
# 	for item_code in data:
# 		for warehouse in data[item_code]:
# 			for key, values in data[item_code][warehouse].items():
# 				bin_no = key.split("|||")[0]
# 				project_no = key.split("|||")[1]
# 				matches = True
# 				if bin and bin_no != bin:
# 					matches = False
# 				if project and project_no != project:
# 					matches = False
# 				if matches:
# 					filtered[item_code][warehouse][key] = values
# 	return filtered


# def get_closing_valuation_rate(item_code, warehouse):
# 	rate = frappe.db.sql("""
# 		SELECT valuation_rate FROM `tabStock Ledger Entry`
# 		WHERE item_code = %s AND warehouse = %s
# 			AND is_cancelled = 0 AND docstatus < 2
# 		ORDER BY posting_date DESC, creation DESC LIMIT 1
# 	""", (item_code, warehouse), as_list=1)
# 	return flt(rate[0][0], 2) if rate else 0.0


# # ========================= DETAIL DRILL-DOWN =========================

# def get_transaction_details(transaction_type, warehouse, from_date, to_date,
# 							include_child=1, show_items=0, bin=None, project=None):
# 	from_date = getdate(from_date)
# 	to_date   = getdate(to_date)
# 	include_child = int(include_child)
# 	show_items    = int(show_items)
# 	warehouses    = get_warehouses(warehouse, include_child)
# 	if not warehouses:
# 		return []

# 	fn_map = {
# 		"purchase_cost":    get_purchase_cost_details,
# 		"purchase_return":  get_purchase_return_details,
# 		"issue_cost":       get_issue_cost_details,
# 		"other_receipt":    get_other_receipt_details,
# 		"other_issue":      get_other_issue_details,
# 		"transfer_in":      get_transfer_in_details,
# 		"transfer_out":     get_transfer_out_details,
# 	}
# 	fn = fn_map.get(transaction_type)
# 	return fn(warehouses, from_date, to_date, show_items, bin, project) if fn else []


# def _detail_sql(base_select, from_clause, where_extra, group_by, warehouses,
# 				from_date, to_date, bin=None, project=None, show_items=False):
# 	"""
# 	Builds and runs a detail query.
# 	base_select: columns for item-wise or doc-wise
# 	where_extra: extra AND conditions (e.g. voucher_type, purpose)
# 	group_by: used only when not show_items
# 	"""
# 	proj_cond, proj_params = _project_condition(project)
# 	bin_cond  = " AND sle.custom_bin_no = %s "  if bin     else ""
# 	bin_params = [bin]                            if bin     else []
# 	wh_ph = ','.join(['%s'] * len(warehouses))

# 	sql = f"""
# 		{base_select}
# 		{from_clause}
# 		WHERE sle.warehouse IN ({wh_ph})
# 			AND sle.posting_date >= %s AND sle.posting_date <= %s
# 			{where_extra}
# 			AND sle.is_cancelled = 0 AND sle.docstatus < 2
# 			{bin_cond}
# 			{proj_cond}
# 		{"" if show_items else "GROUP BY " + group_by}
# 		ORDER BY sle.posting_date DESC, sle.voucher_no
# 	"""
# 	params = list(warehouses) + [from_date, to_date] + bin_params + proj_params
# 	return frappe.db.sql(sql, params, as_dict=1)


# def get_purchase_cost_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	if show_items:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, pr.supplier,
# 					sle.item_code, i.item_name, i.description, i.technical_description,
# 					sle.warehouse, sle.actual_qty as qty, sle.valuation_rate as rate,
# 					sle.actual_qty * sle.valuation_rate as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
# 	else:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, pr.supplier,
# 					SUM(sle.actual_qty * sle.valuation_rate) as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name"
# 	extra = "AND sle.voucher_type = 'Purchase Receipt' AND pr.is_return = 0 AND sle.actual_qty > 0"
# 	grp   = "sle.voucher_no, sle.posting_date, pr.supplier"
# 	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)


# def get_purchase_return_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	if show_items:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, pr.supplier,
# 					sle.item_code, i.item_name, i.description, i.technical_description,
# 					sle.warehouse, ABS(sle.actual_qty) as qty, sle.valuation_rate as rate,
# 					ABS(sle.actual_qty) * sle.valuation_rate as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
# 	else:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, pr.supplier,
# 					SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name"
# 	extra = "AND sle.voucher_type = 'Purchase Receipt' AND pr.is_return = 1 AND sle.actual_qty < 0"
# 	grp   = "sle.voucher_no, sle.posting_date, pr.supplier"
# 	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)


# def get_issue_cost_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	if show_items:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, dn.customer,
# 					sle.item_code, i.item_name, i.description, i.technical_description,
# 					sle.warehouse, ABS(sle.actual_qty) as qty, sle.valuation_rate as rate,
# 					ABS(sle.actual_qty) * sle.valuation_rate as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabDelivery Note` dn ON sle.voucher_no = dn.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
# 	else:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, dn.customer,
# 					SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabDelivery Note` dn ON sle.voucher_no = dn.name"
# 	extra = "AND sle.voucher_type = 'Delivery Note' AND sle.actual_qty < 0"
# 	grp   = "sle.voucher_no, sle.posting_date, dn.customer"
# 	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)


# def get_other_receipt_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	if show_items:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
# 					sle.item_code, i.item_name, i.description, i.technical_description,
# 					sle.warehouse, sle.actual_qty as qty, sle.valuation_rate as rate,
# 					sle.actual_qty * sle.valuation_rate as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
# 	else:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
# 					SUM(sle.actual_qty * sle.valuation_rate) as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name"
# 	extra = "AND sle.voucher_type = 'Stock Entry' AND se.purpose = 'Material Receipt' AND sle.actual_qty > 0"
# 	grp   = "sle.voucher_no, sle.posting_date, se.purpose"
# 	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)


# def get_other_issue_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	if show_items:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
# 					sle.item_code, i.item_name, i.description, i.technical_description,
# 					sle.warehouse, ABS(sle.actual_qty) as qty, sle.valuation_rate as rate,
# 					ABS(sle.actual_qty) * sle.valuation_rate as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
# 	else:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
# 					SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name"
# 	extra = "AND sle.voucher_type = 'Stock Entry' AND (se.purpose = 'Send to Subcontractor' OR se.purpose = 'Material Transfer') AND sle.actual_qty < 0"
# 	grp   = "sle.voucher_no, sle.posting_date, se.purpose"
# 	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)


# def get_transfer_in_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	if show_items:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
# 					sle.item_code, i.item_name, i.description, i.technical_description,
# 					sle.warehouse, sle.actual_qty as qty, sle.valuation_rate as rate,
# 					sle.actual_qty * sle.valuation_rate as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
# 	else:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
# 					SUM(sle.actual_qty * sle.valuation_rate) as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name"
# 	extra = "AND sle.voucher_type = 'Stock Entry' AND se.purpose = 'Material Transfer' AND sle.actual_qty > 0"
# 	grp   = "sle.voucher_no, sle.posting_date, se.purpose"
# 	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)


# def get_transfer_out_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	if show_items:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
# 					sle.item_code, i.item_name, i.description, i.technical_description,
# 					sle.warehouse, ABS(sle.actual_qty) as qty, sle.valuation_rate as rate,
# 					ABS(sle.actual_qty) * sle.valuation_rate as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
# 	else:
# 		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
# 					SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount"""
# 		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name"
# 	extra = "AND sle.voucher_type = 'Stock Entry' AND se.purpose = 'Send to Subcontractor' AND sle.actual_qty < 0"
# 	grp   = "sle.voucher_no, sle.posting_date, se.purpose"
# 	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)

import frappe
from frappe import _
from frappe.utils import flt, getdate, cstr
from collections import defaultdict

def execute(filters=None):
	if not filters:
		filters = {}

	columns = get_columns(filters)
	data = get_data(filters)

	return columns, data


def get_columns(filters):
	consolidate_by = filters.get("consolidate_by", "")

	columns = []

	if not consolidate_by:
		columns.append({
			"fieldname": "item_code",
			"label": _("Item Code"),
			"fieldtype": "Link",
			"options": "Item",
			"width": 150
		})

	if consolidate_by != "Warehouse Wise":
		columns.append({
			"fieldname": "item_group",
			"label": _("Item Group"),
			"fieldtype": "Link",
			"options": "Item Group",
			"width": 150
		})

	if not consolidate_by:
		columns.append({
			"fieldname": "description",
			"label": _("Description"),
			"fieldtype": "Data",
			"width": 200
		})

	if not consolidate_by:
		columns.append({
			"fieldname": "technical_description",
			"label": _("Technical Description"),
			"fieldtype": "Data",
			"width": 200
		})

	if consolidate_by not in ["Item Group Wise", "Bin Wise", "Project Wise"]:
		columns.append({
			"fieldname": "warehouse",
			"label": _("Warehouse"),
			"fieldtype": "Link",
			"options": "Warehouse",
			"width": 150
		})

	if not consolidate_by:
		columns.append({
			"fieldname": "bin_location",
			"label": _("Bin (Location)"),
			"fieldtype": "Data",
			"width": 200
		})

	if not consolidate_by:
		columns.append({
			"fieldname": "project_list",
			"label": _("Project"),
			"fieldtype": "Data",
			"width": 200
		})

	columns.append({
		"fieldname": "closing_qty",
		"label": _("Closing Qty"),
		"fieldtype": "Float",
		"width": 120
	})

	if consolidate_by == "Bin Wise":
		columns.append({
			"fieldname": "bin",
			"label": _("Bin"),
			"fieldtype": "Link",
			"options": "Physical Bin",
			"width": 150
		})

	if consolidate_by == "Project Wise":
		columns.append({
			"fieldname": "project",
			"label": _("Project"),
			"fieldtype": "Link",
			"options": "Project",
			"width": 150
		})

	columns.extend([
		{"fieldname": "opening_qty",      "label": _("Opening Qty"),                          "fieldtype": "Float",    "width": 120},
		{"fieldname": "opening_rate",     "label": _("Opening Rate"),                         "fieldtype": "Currency", "width": 120, "hidden": 1},
		{"fieldname": "opening_value",    "label": _("Opening Value"),                        "fieldtype": "Currency", "width": 150},
		{"fieldname": "receipt_qty",      "label": _("Receipt Qty"),                          "fieldtype": "Float",    "width": 120},
		{"fieldname": "receipt_rate",     "label": _("Receipt Rate"),                         "fieldtype": "Currency", "width": 120, "hidden": 1},
		{"fieldname": "receipt_amount",   "label": _("Receipt Amount"),                       "fieldtype": "Currency", "width": 150},
		{"fieldname": "return_qty",       "label": _("Return Qty"),                           "fieldtype": "Float",    "width": 120},
		{"fieldname": "return_rate",      "label": _("Return Rate"),                          "fieldtype": "Currency", "width": 120, "hidden": 1},
		{"fieldname": "return_amount",    "label": _("Return Amount"),                        "fieldtype": "Currency", "width": 150},
		{"fieldname": "dc_to_customer_qty",    "label": _("DC to Customer Qty"),              "fieldtype": "Float",    "width": 120},
		{"fieldname": "dc_to_customer_rate",   "label": _("DC to Customer Rate"),             "fieldtype": "Currency", "width": 120, "hidden": 1},
		{"fieldname": "dc_to_customer_amount", "label": _("DC to Customer Amount"),           "fieldtype": "Currency", "width": 150},
		{"fieldname": "other_receipt_qty",     "label": _("Other Receipt Qty"),               "fieldtype": "Float",    "width": 120},
		{"fieldname": "other_receipt_rate",    "label": _("Other Receipt Rate"),              "fieldtype": "Currency", "width": 120, "hidden": 1},
		{"fieldname": "other_receipt_amount",  "label": _("Other Receipt Amount"),            "fieldtype": "Currency", "width": 150},
		{"fieldname": "other_issue_qty",       "label": _("Other Issue Qty"),                 "fieldtype": "Float",    "width": 120},
		{"fieldname": "other_issue_rate",      "label": _("Other Issue Rate"),                "fieldtype": "Currency", "width": 120, "hidden": 1},
		{"fieldname": "other_issue_amount",    "label": _("Other Issue Amount"),              "fieldtype": "Currency", "width": 150},
		{"fieldname": "wip_factory_qty",       "label": _("WIP Factory (Material Transfer In) Qty"), "fieldtype": "Float", "width": 120},
		{"fieldname": "wip_factory_rate",      "label": _("WIP Factory Rate"),                "fieldtype": "Currency", "width": 120, "hidden": 1},
		{"fieldname": "wip_factory_amount",    "label": _("WIP Factory Amount"),              "fieldtype": "Currency", "width": 150},
		{"fieldname": "wip_job_work_qty",      "label": _("WIP Job Work (Send to Subcontractor) Qty"), "fieldtype": "Float", "width": 120},
		{"fieldname": "wip_job_work_rate",     "label": _("WIP Job Work Rate"),               "fieldtype": "Currency", "width": 120, "hidden": 1},
		{"fieldname": "wip_job_work_amount",   "label": _("WIP Job Work Amount"),             "fieldtype": "Currency", "width": 150},
		{"fieldname": "closing_rate",          "label": _("Closing Rate (Valuation Rate)"),   "fieldtype": "Currency", "width": 150},
		{"fieldname": "closing_amount",        "label": _("Closing Value"),                   "fieldtype": "Currency", "width": 150},
	])

	return columns


def get_data(filters):
	warehouse      = filters.get("warehouse")
	from_date      = getdate(filters.get("from_date"))
	to_date        = getdate(filters.get("to_date"))
	include_child  = filters.get("include_child_warehouses")
	consolidate_by = filters.get("consolidate_by")
	bin_filter     = filters.get("bin")
	rack_no_filter = filters.get("rack_no")
	project_filter = filters.get("project")   # ← key filter
	item_code_filter = filters.get("item_code")
	number_of_bins = filters.get("number_of_bins")
	item_wise_bin  = filters.get("item_wise_bin")
	project_wise_bin = filters.get("project_wise_bin")

	warehouses = get_warehouses(warehouse, include_child)
	if not warehouses:
		return []

	# ── When project_filter is set, scope all items to that project only ──
	all_items = get_all_items(
		warehouses, from_date, to_date,
		item_code_filter=item_code_filter,
		project_filter=project_filter        # NEW: passed through
	)
	item_details = get_item_details(all_items)

	# ── Fetch all transaction data, passing project_filter everywhere ──
	opening_stock      = get_opening_stock(warehouses, from_date, bin_filter, project_filter)
	closing_stock      = get_closing_stock(warehouses, to_date, project_filter)
	receipt_data       = get_receipt_data(warehouses, from_date, to_date, project_filter)
	return_data        = get_return_data(warehouses, from_date, to_date, project_filter)
	issue_data         = get_issue_data(warehouses, from_date, to_date, project_filter)
	other_receipt_data = get_other_receipt_data(warehouses, from_date, to_date, project_filter)
	other_issue_data   = get_other_issue_data(warehouses, from_date, to_date, project_filter)
	wip_factory_in_data, wip_job_work_data = get_material_transfer_data(
		warehouses, from_date, to_date, project_filter
	)
	stock_recon_data = get_stock_reconciliation_data(warehouses, to_date)

	if consolidate_by == "Item Group Wise":
		return prepare_item_group_wise_data(
			all_items, item_details, opening_stock, closing_stock,
			receipt_data, return_data, issue_data, other_receipt_data,
			other_issue_data, wip_factory_in_data, wip_job_work_data
		)
	elif consolidate_by == "Warehouse Wise":
		return prepare_warehouse_wise_data(
			all_items, item_details, opening_stock, closing_stock,
			receipt_data, return_data, issue_data, other_receipt_data,
			other_issue_data, wip_factory_in_data, wip_job_work_data
		)
	elif consolidate_by == "Bin Wise":
		return prepare_bin_wise_data(
			all_items, item_details, opening_stock, closing_stock,
			receipt_data, return_data, issue_data, other_receipt_data,
			other_issue_data, wip_factory_in_data, wip_job_work_data
		)
	elif consolidate_by == "Project Wise":
		return prepare_project_wise_data(
			all_items, item_details, opening_stock, closing_stock,
			receipt_data, return_data, issue_data, other_receipt_data,
			other_issue_data, wip_factory_in_data, wip_job_work_data
		)
	else:
		return prepare_item_wise_data(
			all_items, item_details, opening_stock, closing_stock,
			receipt_data, return_data, issue_data, other_receipt_data,
			other_issue_data, wip_factory_in_data, wip_job_work_data,
			from_date=from_date, to_date=to_date,
			stock_recon_data=stock_recon_data,
			project_filter=project_filter     # NEW: passed through
		)


# ─────────────────────────────────────────────
# HELPER: build project SQL condition + params
# ─────────────────────────────────────────────

def _project_condition(project_filter, alias="sle"):
	"""
	Returns (sql_snippet, params_list).
	When project_filter is set, restricts to rows where
	custom_project_no matches exactly.
	alias: table alias prefix (e.g. "sle"). Pass alias="" for
	       queries that have no table alias.
	"""
	if project_filter:
		col = f"{alias}.custom_project_no" if alias else "custom_project_no"
		return f" AND {col} = %s ", [project_filter]
	return "", []


# ─────────────────────────────────────────────
# WAREHOUSE HELPERS
# ─────────────────────────────────────────────

def get_warehouses(warehouse, include_child):
	if not warehouse:
		return []
	warehouses = [warehouse]
	if include_child:
		child_warehouses = frappe.db.sql("""
			SELECT name FROM `tabWarehouse`
			WHERE parent_warehouse = %s AND disabled = 0
		""", warehouse, as_list=1)
		warehouses.extend([w[0] for w in child_warehouses])
	return warehouses


# ─────────────────────────────────────────────
# ITEMS
# ─────────────────────────────────────────────

def get_all_items(warehouses, from_date, to_date, item_code_filter=None, project_filter=None):
	"""
	Get all items that have transactions OR closing stock in the period.
	When project_filter is set, only items that have at least one SLE
	with custom_project_no = project_filter are returned.
	"""
	proj_cond, proj_params = _project_condition(project_filter)

	item_cond = ""
	item_params = []
	if item_code_filter:
		item_cond = " AND sle.item_code = %s "
		item_params = [item_code_filter]

	wh_placeholders = ','.join(['%s'] * len(warehouses))

	# Items with transactions in period
	transaction_items = frappe.db.sql(f"""
		SELECT DISTINCT sle.item_code
		FROM `tabStock Ledger Entry` sle
		WHERE sle.warehouse IN ({wh_placeholders})
			AND sle.posting_date >= %s
			AND sle.posting_date <= %s
			AND sle.is_cancelled = 0
			AND sle.docstatus < 2
			{item_cond}
			{proj_cond}
		ORDER BY sle.item_code
	""", list(warehouses) + [from_date, to_date] + item_params + proj_params, as_list=1)

	# Items with closing stock as of to_date
	stock_items = frappe.db.sql(f"""
		SELECT DISTINCT sle.item_code
		FROM `tabStock Ledger Entry` sle
		WHERE sle.warehouse IN ({wh_placeholders})
			AND sle.posting_date <= %s
			AND sle.is_cancelled = 0
			AND sle.docstatus < 2
			AND sle.qty_after_transaction > 0
			{item_cond}
			{proj_cond}
		ORDER BY sle.item_code
	""", list(warehouses) + [to_date] + item_params + proj_params, as_list=1)

	all_items = list(set(
		[i[0] for i in transaction_items] + [i[0] for i in stock_items]
	))
	return sorted(all_items)


def get_item_details(item_codes):
	item_details = {}
	if not item_codes:
		return item_details
	items = frappe.db.sql("""
		SELECT name, item_group, description, item_name, technical_description
		FROM `tabItem`
		WHERE name IN ({})
	""".format(','.join(['%s'] * len(item_codes))), item_codes, as_dict=1)
	for item in items:
		item_details[item.name] = {
			"item_name": item.item_name or "",
			"item_group": item.item_group or "",
			"description": item.description or "",
			"technical_description": item.technical_description or ""
		}
	return item_details


def get_bins_and_projects_for_item_warehouse(item_code, warehouse, from_date, to_date, project_filter=None):
	# Use _project_condition with no alias since this query has no table alias
	proj_cond, proj_params = _project_condition(project_filter, alias="")
	sle_data = frappe.db.sql(f"""
		SELECT DISTINCT
			COALESCE(custom_bin_no, '') as custom_bin_no,
			COALESCE(custom_project_no, '') as custom_project_no
		FROM `tabStock Ledger Entry`
		WHERE item_code = %s
			AND warehouse = %s
			AND is_cancelled = 0
			AND docstatus < 2
			{proj_cond}
	""", [item_code, warehouse] + proj_params, as_dict=1)

	bins_set = set()
	projects_set = set()
	for sle in sle_data:
		if sle.get("custom_bin_no"):
			bins_set.add(sle["custom_bin_no"])
		if sle.get("custom_project_no"):
			projects_set.add(sle["custom_project_no"])
	return sorted(bins_set), sorted(projects_set)


# ─────────────────────────────────────────────
# STOCK DATA FETCHERS — all accept project_filter
# ─────────────────────────────────────────────

def get_opening_stock(warehouses, from_date, bin_filter=None, project_filter=None):
	"""
	Opening stock = sum of all project-specific transactions BEFORE from_date.
	When project_filter is set, only include transactions with that project.
	"""
	opening_stock = defaultdict(lambda: defaultdict(lambda: defaultdict(
		lambda: {"qty": 0.0, "value": 0.0, "rate": 0.0, "bin": "", "project": ""}
	)))

	proj_cond, proj_params = _project_condition(project_filter)
	wh_placeholders = ','.join(['%s'] * len(warehouses))

	# Get sum of all project-specific transactions before from_date
	sle_data = frappe.db.sql(f"""
		SELECT
			sle.item_code, sle.warehouse,
			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
			COALESCE(sle.custom_project_no, '') as custom_project_no,
			SUM(sle.actual_qty) as total_qty,
			SUM(sle.actual_qty * sle.valuation_rate) as total_value
		FROM `tabStock Ledger Entry` sle
		WHERE sle.warehouse IN ({wh_placeholders})
			AND sle.posting_date < %s
			AND sle.is_cancelled = 0
			AND sle.docstatus < 2
			{proj_cond}
		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
		HAVING SUM(sle.actual_qty) != 0
	""", list(warehouses) + [from_date] + proj_params, as_dict=1)

	for sle in sle_data:
		bin_no = sle.custom_bin_no or ""
		project_no = sle.custom_project_no or ""
		key = f"{bin_no}|||{project_no}"
		opening_stock[sle.item_code][sle.warehouse][key] = {
			"qty": flt(sle.total_qty, 3),
			"value": flt(sle.total_value, 2),
			"rate": flt(sle.total_value / sle.total_qty, 2) if sle.total_qty else 0.0,
			"bin": bin_no,
			"project": project_no
		}

	return opening_stock


def get_closing_stock(warehouses, to_date, project_filter=None):
	"""
	Closing stock = actual stock balance from Stock Ledger Entry using Stock Balance logic.
	Matches ERPNext standard Stock Balance report exactly.
	When project_filter is applied, uses latest project assignment logic.
	"""
	closing_stock = defaultdict(lambda: defaultdict(lambda: defaultdict(
		lambda: {"qty": 0.0, "value": 0.0, "rate": 0.0, "bin": "", "project": ""}
	)))

	wh_placeholders = ','.join(['%s'] * len(warehouses))

	if project_filter:
		# When project filter is applied, use Stock Balance logic with project assignment
		# Step 1: Get stock balance data using exact Stock Balance report logic
		stock_balance_data = frappe.db.sql(f"""
			SELECT 
				item_code,
				warehouse,
				qty_after_transaction as closing_qty,
				valuation_rate,
				(qty_after_transaction * valuation_rate) as closing_value
			FROM (
				SELECT 
					item_code,
					warehouse,
					qty_after_transaction,
					valuation_rate,
					ROW_NUMBER() OVER (
						PARTITION BY item_code, warehouse
						ORDER BY posting_date DESC, posting_time DESC, name DESC
					) as rn
				FROM `tabStock Ledger Entry`
				WHERE warehouse IN ({wh_placeholders})
					AND posting_date <= %s
					AND is_cancelled = 0
					AND docstatus < 2
			) ranked
			WHERE rn = 1 AND qty_after_transaction != 0
		""", list(warehouses) + [to_date], as_dict=1)
		
		# Step 2: Get latest project assignment for each item-warehouse
		project_assignments = frappe.db.sql(f"""
			SELECT 
				item_code,
				warehouse,
				COALESCE(custom_project_no, '') as custom_project_no
			FROM (
				SELECT 
					item_code,
					warehouse,
					custom_project_no,
					ROW_NUMBER() OVER (
						PARTITION BY item_code, warehouse
						ORDER BY posting_date DESC, posting_time DESC, name DESC
					) as rn
				FROM `tabStock Ledger Entry`
				WHERE warehouse IN ({wh_placeholders})
					AND posting_date <= %s
					AND is_cancelled = 0
					AND docstatus < 2
					AND COALESCE(custom_project_no, '') != ''
			) ranked
			WHERE rn = 1
		""", list(warehouses) + [to_date], as_dict=1)
		
		# Create project assignment lookup
		assignment_lookup = {}
		for assignment in project_assignments:
			key = (assignment.item_code, assignment.warehouse)
			assignment_lookup[key] = assignment.custom_project_no
		
		# Step 3: Only include stock assigned to the filtered project
		for stock in stock_balance_data:
			key = (stock.item_code, stock.warehouse)
			assigned_project = assignment_lookup.get(key, "")
			
			if assigned_project == project_filter:
				bin_project_key = "|||"
				closing_stock[stock.item_code][stock.warehouse][bin_project_key] = {
					"qty": flt(stock.closing_qty, 3),
					"value": flt(stock.closing_value, 2),
					"rate": flt(stock.valuation_rate, 2) if stock.valuation_rate else 0.0,
					"bin": "", 
					"project": ""
				}
	else:
		# When no project filter, use tabBin for warehouse total (original logic)
		stock_data = frappe.db.sql(f"""
			SELECT 
				item_code, 
				warehouse,
				SUM(actual_qty) as total_qty,
				SUM(stock_value) as total_value
			FROM `tabBin`
			WHERE warehouse IN ({wh_placeholders})
				AND actual_qty != 0
			GROUP BY item_code, warehouse
		""", list(warehouses), as_dict=1)

		for stock in stock_data:
			bin_project_key = "|||"
			closing_stock[stock.item_code][stock.warehouse][bin_project_key] = {
				"qty": flt(stock.total_qty, 3),
				"value": flt(stock.total_value, 2),
				"rate": flt(stock.total_value / stock.total_qty, 2) if stock.total_qty else 0.0,
				"bin": "", "project": ""
			}

	return closing_stock


def _build_transaction_data(sql, params):
	result = defaultdict(lambda: defaultdict(lambda: defaultdict(
		lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""}
	)))
	rows = frappe.db.sql(sql, params, as_dict=1)
	for r in rows:
		item_code = r.item_code
		warehouse = r.warehouse
		bin_no = r.get("custom_bin_no") or ""
		project_no = r.get("custom_project_no") or ""
		key = f"{bin_no}|||{project_no}"
		qty = flt(r.total_qty)
		amount = flt(r.total_amount)
		result[item_code][warehouse][key] = {
			"qty": qty,
			"amount": amount,
			"rate": flt(amount / qty, 2) if qty else 0.0,
			"bin": bin_no,
			"project": project_no
		}
	return result


def get_receipt_data(warehouses, from_date, to_date, project_filter=None):
	proj_cond, proj_params = _project_condition(project_filter)
	wh_ph = ','.join(['%s'] * len(warehouses))
	sql = f"""
		SELECT sle.item_code, sle.warehouse,
			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
			COALESCE(sle.custom_project_no,'') as custom_project_no,
			SUM(sle.actual_qty) as total_qty,
			SUM(sle.actual_qty * sle.valuation_rate) as total_amount
		FROM `tabStock Ledger Entry` sle
		INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
		WHERE sle.warehouse IN ({wh_ph})
			AND sle.posting_date >= %s AND sle.posting_date <= %s
			AND sle.voucher_type = 'Purchase Receipt'
			AND pr.is_return = 0 AND sle.actual_qty > 0
			AND sle.is_cancelled = 0 AND sle.docstatus < 2
			{proj_cond}
		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
	"""
	return _build_transaction_data(sql, list(warehouses) + [from_date, to_date] + proj_params)


def get_return_data(warehouses, from_date, to_date, project_filter=None):
	proj_cond, proj_params = _project_condition(project_filter)
	wh_ph = ','.join(['%s'] * len(warehouses))
	sql = f"""
		SELECT sle.item_code, sle.warehouse,
			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
			COALESCE(sle.custom_project_no,'') as custom_project_no,
			SUM(ABS(sle.actual_qty)) as total_qty,
			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
		FROM `tabStock Ledger Entry` sle
		INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
		WHERE sle.warehouse IN ({wh_ph})
			AND sle.posting_date >= %s AND sle.posting_date <= %s
			AND sle.voucher_type = 'Purchase Receipt'
			AND pr.is_return = 1 AND sle.actual_qty < 0
			AND sle.is_cancelled = 0 AND sle.docstatus < 2
			{proj_cond}
		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
	"""
	return _build_transaction_data(sql, list(warehouses) + [from_date, to_date] + proj_params)


def get_issue_data(warehouses, from_date, to_date, project_filter=None):
	proj_cond, proj_params = _project_condition(project_filter)
	wh_ph = ','.join(['%s'] * len(warehouses))
	sql = f"""
		SELECT sle.item_code, sle.warehouse,
			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
			COALESCE(sle.custom_project_no,'') as custom_project_no,
			SUM(ABS(sle.actual_qty)) as total_qty,
			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
		FROM `tabStock Ledger Entry` sle
		WHERE sle.warehouse IN ({wh_ph})
			AND sle.posting_date >= %s AND sle.posting_date <= %s
			AND sle.voucher_type = 'Delivery Note'
			AND sle.actual_qty < 0
			AND sle.is_cancelled = 0 AND sle.docstatus < 2
			{proj_cond}
		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
	"""
	return _build_transaction_data(sql, list(warehouses) + [from_date, to_date] + proj_params)


def get_other_receipt_data(warehouses, from_date, to_date, project_filter=None):
	proj_cond, proj_params = _project_condition(project_filter)
	wh_ph = ','.join(['%s'] * len(warehouses))
	sql = f"""
		SELECT sle.item_code, sle.warehouse,
			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
			COALESCE(sle.custom_project_no,'') as custom_project_no,
			SUM(sle.actual_qty) as total_qty,
			SUM(sle.actual_qty * sle.valuation_rate) as total_amount
		FROM `tabStock Ledger Entry` sle
		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
		WHERE sle.warehouse IN ({wh_ph})
			AND sle.posting_date >= %s AND sle.posting_date <= %s
			AND sle.voucher_type = 'Stock Entry'
			AND se.purpose = 'Material Receipt'
			AND sle.actual_qty > 0
			AND sle.is_cancelled = 0 AND sle.docstatus < 2
			{proj_cond}
		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
	"""
	return _build_transaction_data(sql, list(warehouses) + [from_date, to_date] + proj_params)


def get_other_issue_data(warehouses, from_date, to_date, project_filter=None):
	proj_cond, proj_params = _project_condition(project_filter)
	wh_ph = ','.join(['%s'] * len(warehouses))

	sql_send = f"""
		SELECT sle.item_code, sle.warehouse,
			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
			COALESCE(sle.custom_project_no,'') as custom_project_no,
			SUM(ABS(sle.actual_qty)) as total_qty,
			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
		FROM `tabStock Ledger Entry` sle
		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
		WHERE sle.warehouse IN ({wh_ph})
			AND sle.posting_date >= %s AND sle.posting_date <= %s
			AND sle.voucher_type = 'Stock Entry'
			AND se.purpose = 'Send to Subcontractor'
			AND sle.actual_qty < 0
			AND sle.is_cancelled = 0 AND sle.docstatus < 2
			{proj_cond}
		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
	"""

	sql_transfer = f"""
		SELECT sle.item_code, sle.warehouse,
			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
			COALESCE(sle.custom_project_no,'') as custom_project_no,
			SUM(ABS(sle.actual_qty)) as total_qty,
			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
		FROM `tabStock Ledger Entry` sle
		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
		WHERE sle.warehouse IN ({wh_ph})
			AND sle.posting_date >= %s AND sle.posting_date <= %s
			AND sle.voucher_type = 'Stock Entry'
			AND se.purpose = 'Material Transfer'
			AND sle.actual_qty < 0
			AND sle.is_cancelled = 0 AND sle.docstatus < 2
			{proj_cond}
		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
	"""

	base_params = list(warehouses) + [from_date, to_date] + proj_params
	d1 = _build_transaction_data(sql_send, base_params)
	d2 = _build_transaction_data(sql_transfer, base_params)

	# Merge d2 into d1
	for item_code in d2:
		for warehouse in d2[item_code]:
			for key, vals in d2[item_code][warehouse].items():
				if key in d1[item_code][warehouse]:
					d1[item_code][warehouse][key]["qty"]    += vals["qty"]
					d1[item_code][warehouse][key]["amount"] += vals["amount"]
				else:
					d1[item_code][warehouse][key] = vals
	return d1


def get_material_transfer_data(warehouses, from_date, to_date, project_filter=None):
	proj_cond, proj_params = _project_condition(project_filter)
	wh_ph = ','.join(['%s'] * len(warehouses))
	base_params = list(warehouses) + [from_date, to_date] + proj_params

	sql_factory = f"""
		SELECT sle.item_code, sle.warehouse,
			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
			COALESCE(sle.custom_project_no,'') as custom_project_no,
			SUM(sle.actual_qty) as total_qty,
			SUM(sle.actual_qty * sle.valuation_rate) as total_amount
		FROM `tabStock Ledger Entry` sle
		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
		WHERE sle.warehouse IN ({wh_ph})
			AND sle.posting_date >= %s AND sle.posting_date <= %s
			AND sle.voucher_type = 'Stock Entry'
			AND se.purpose = 'Material Transfer'
			AND sle.actual_qty > 0
			AND sle.is_cancelled = 0 AND sle.docstatus < 2
			{proj_cond}
		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
	"""

	sql_jobwork = f"""
		SELECT sle.item_code, sed.t_warehouse as warehouse,
			COALESCE(sle.custom_bin_no,'') as custom_bin_no,
			COALESCE(sle.custom_project_no,'') as custom_project_no,
			SUM(ABS(sle.actual_qty)) as total_qty,
			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
		FROM `tabStock Ledger Entry` sle
		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
		INNER JOIN `tabStock Entry Detail` sed ON se.name = sed.parent AND sle.item_code = sed.item_code
		WHERE sle.posting_date >= %s AND sle.posting_date <= %s
			AND sle.voucher_type = 'Stock Entry'
			AND se.purpose = 'Send to Subcontractor'
			AND sle.actual_qty < 0
			AND sle.is_cancelled = 0 AND sle.docstatus < 2
			{proj_cond}
		GROUP BY sle.item_code, sed.t_warehouse, sle.custom_bin_no, sle.custom_project_no
	"""

	wip_factory = _build_transaction_data(sql_factory, base_params)
	# jobwork query has no warehouse IN clause so params differ
	wip_jobwork = _build_transaction_data(sql_jobwork, [from_date, to_date] + proj_params)

	return wip_factory, wip_jobwork


def get_stock_reconciliation_data(warehouses, to_date):
	recon_data = defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "rate": 0.0, "amount": 0.0}))
	wh_ph = ','.join(['%s'] * len(warehouses))
	data = frappe.db.sql(f"""
		SELECT DISTINCT sle.item_code, sle.warehouse,
			sle.qty_after_transaction as qty,
			sle.valuation_rate as rate,
			sle.qty_after_transaction * sle.valuation_rate as amount
		FROM `tabStock Ledger Entry` sle
		WHERE sle.warehouse IN ({wh_ph})
			AND sle.posting_date <= %s
			AND sle.voucher_type = 'Stock Reconciliation'
			AND sle.is_cancelled = 0 AND sle.docstatus < 2
			AND (sle.item_code, sle.warehouse, sle.posting_date) IN (
				SELECT sle2.item_code, sle2.warehouse, MAX(sle2.posting_date)
				FROM `tabStock Ledger Entry` sle2
				WHERE sle2.warehouse IN ({wh_ph})
					AND sle2.posting_date <= %s
					AND sle2.voucher_type = 'Stock Reconciliation'
					AND sle2.is_cancelled = 0 AND sle2.docstatus < 2
				GROUP BY sle2.item_code, sle2.warehouse
			)
	""", tuple(warehouses) + (to_date,) + tuple(warehouses) + (to_date,), as_dict=1)
	for row in data:
		recon_data[row.item_code][row.warehouse] = {
			"qty": flt(row.qty, 3), "rate": flt(row.rate, 2), "amount": flt(row.amount, 2)
		}
	return recon_data


# ─────────────────────────────────────────────
# DATA PREPARATION FUNCTIONS
# ─────────────────────────────────────────────

def prepare_item_wise_data(all_items, item_details, opening_stock, closing_stock,
							receipt_data, return_data, issue_data, other_receipt_data,
							other_issue_data, wip_factory_in_data, wip_job_work_data,
							stock_recon_data=None, from_date=None, to_date=None,
							project_filter=None):
	data = []

	for item_code in sorted(all_items):
		warehouses_for_item = set()
		for d in [opening_stock, closing_stock, receipt_data, return_data,
				  issue_data, other_receipt_data, other_issue_data,
				  wip_factory_in_data, wip_job_work_data]:
			if item_code in d:
				warehouses_for_item.update(d[item_code].keys())

		for warehouse in sorted(warehouses_for_item):
			def _sum(src):
				q, v = 0.0, 0.0
				for vals in src.get(item_code, {}).get(warehouse, {}).values():
					q += flt(vals.get("qty"), 3)
					v += flt(vals.get("amount") or vals.get("value"), 2)
				return q, v

			# Get opening values from the opening_stock data structure
			# which now properly contains project-specific transactions
			opening_value = sum(
				flt(v.get("value"), 2)
				for v in opening_stock.get(item_code, {}).get(warehouse, {}).values()
			)
			opening_qty = sum(
				flt(v.get("qty"), 3)
				for v in opening_stock.get(item_code, {}).get(warehouse, {}).values()
			)
			opening_rate = flt(opening_value / opening_qty, 2) if opening_qty else 0.0

			receipt_qty, receipt_amount = _sum(receipt_data)
			receipt_rate = flt(receipt_amount / receipt_qty, 2) if receipt_qty else 0.0

			return_qty, return_amount = _sum(return_data)
			return_rate = flt(return_amount / return_qty, 2) if return_qty else 0.0

			dc_qty, dc_amount = _sum(issue_data)
			dc_rate = flt(dc_amount / dc_qty, 2) if dc_qty else 0.0

			or_qty, or_amount = _sum(other_receipt_data)
			or_rate = flt(or_amount / or_qty, 2) if or_qty else 0.0

			oi_qty, oi_amount = _sum(other_issue_data)
			oi_rate = flt(oi_amount / oi_qty, 2) if oi_qty else 0.0

			wf_qty, wf_amount = _sum(wip_factory_in_data)
			wf_rate = flt(wf_amount / wf_qty, 2) if wf_qty else 0.0

			wj_qty, wj_amount = _sum(wip_job_work_data)
			wj_rate = flt(wj_amount / wj_qty, 2) if wj_qty else 0.0

			# Use actual closing stock data which now contains project-specific totals
			closing_qty = sum(
				flt(v.get("qty"), 3)
				for v in closing_stock.get(item_code, {}).get(warehouse, {}).values()
			)
			closing_value = sum(
				flt(v.get("value"), 2)
				for v in closing_stock.get(item_code, {}).get(warehouse, {}).values()
			)
			closing_rate = flt(closing_value / closing_qty, 2) if closing_qty else 0.0

			# Only include rows where closing quantity is not 0
			if closing_qty == 0:
				continue

			if not any([opening_qty, opening_value, receipt_qty, receipt_amount,
						return_qty, return_amount, dc_qty, dc_amount,
						or_qty, or_amount, oi_qty, oi_amount,
						wf_qty, wf_amount, wj_qty, wj_amount,
						closing_qty, closing_value]):
				continue

			item_info = item_details.get(item_code, {})
			bins_list, projects_list = get_bins_and_projects_for_item_warehouse(
				item_code, warehouse, from_date, to_date,
				project_filter=project_filter     # ← scoped to project
			)

			data.append({
				"item_code": item_code,
				"item_name": item_info.get("item_name", ""),
				"item_group": item_info.get("item_group", ""),
				"description": item_info.get("description", ""),
				"technical_description": item_info.get("technical_description", ""),
				"warehouse": warehouse,
				"bin_location": ", ".join(bins_list) if bins_list else "",
				"project_list": ", ".join(projects_list) if projects_list else "",
				"opening_qty": opening_qty,
				"opening_rate": opening_rate,
				"opening_value": flt(max(opening_value, 0), 2),
				"receipt_qty": receipt_qty,
				"receipt_rate": receipt_rate,
				"receipt_amount": flt(max(receipt_amount, 0), 2),
				"return_qty": return_qty,
				"return_rate": return_rate,
				"return_amount": flt(max(return_amount, 0), 2),
				"dc_to_customer_qty": dc_qty,
				"dc_to_customer_rate": dc_rate,
				"dc_to_customer_amount": flt(max(dc_amount, 0), 2),
				"other_receipt_qty": or_qty,
				"other_receipt_rate": or_rate,
				"other_receipt_amount": flt(max(or_amount, 0), 2),
				"other_issue_qty": oi_qty,
				"other_issue_rate": oi_rate,
				"other_issue_amount": flt(max(oi_amount, 0), 2),
				"wip_factory_qty": wf_qty,
				"wip_factory_rate": wf_rate,
				"wip_factory_amount": flt(max(wf_amount, 0), 2),
				"wip_job_work_qty": wj_qty,
				"wip_job_work_rate": wj_rate,
				"wip_job_work_amount": flt(max(wj_amount, 0), 2),
				"closing_qty": flt(max(closing_qty, 0), 3),
				"closing_rate": closing_rate,
				"closing_amount": flt(max(closing_value, 0), 2),
			})

	return data


# ... rest of the code remains the same ...
def prepare_item_group_wise_data(all_items, item_details, opening_stock, closing_stock,
								 receipt_data, return_data, issue_data, other_receipt_data,
								 other_issue_data, wip_factory_in_data, wip_job_work_data):
	"""Unchanged — project filter already scoped upstream via all_items + data dicts."""
	groups = defaultdict(lambda: defaultdict(float))

	for item_code in all_items:
		ig = item_details.get(item_code, {}).get("item_group", "Unknown")
		for warehouse in set(
			list(opening_stock.get(item_code, {}).keys()) +
			list(closing_stock.get(item_code, {}).keys())
		):
			def add(src, key_qty, key_amt):
				for v in src.get(item_code, {}).get(warehouse, {}).values():
					groups[ig][key_qty] += flt(v.get("qty"), 3)
					groups[ig][key_amt] += flt(v.get("amount") or v.get("value"), 2)

			for v in opening_stock.get(item_code, {}).get(warehouse, {}).values():
				groups[ig]["opening_qty"]   += flt(v.get("qty"), 3)
				groups[ig]["opening_value"] += flt(v.get("value"), 2)
			for v in closing_stock.get(item_code, {}).get(warehouse, {}).values():
				groups[ig]["closing_qty"]   += flt(v.get("qty"), 3)
				groups[ig]["closing_value"] += flt(v.get("value"), 2)
			add(receipt_data,       "receipt_qty",       "receipt_amount")
			add(return_data,        "return_qty",        "return_amount")
			add(issue_data,         "dc_to_customer_qty","dc_to_customer_amount")
			add(other_receipt_data, "other_receipt_qty", "other_receipt_amount")
			add(other_issue_data,   "other_issue_qty",   "other_issue_amount")
			add(wip_factory_in_data,"wip_factory_qty",   "wip_factory_amount")
			add(wip_job_work_data,  "wip_job_work_qty",  "wip_job_work_amount")

	data = []
	for ig, vals in sorted(groups.items()):
		oq = vals.get("opening_qty", 0)
		ov = vals.get("opening_value", 0)
		cq = vals.get("closing_qty", 0)
		cv = vals.get("closing_value", 0)
		
		# Only include rows where closing quantity is not 0
		if cq == 0:
			continue
			
		data.append({
			"item_group": ig,
			"opening_qty": oq, "opening_rate": flt(ov/oq,2) if oq else 0, "opening_value": ov,
			"receipt_qty": vals.get("receipt_qty",0), "receipt_rate": 0, "receipt_amount": vals.get("receipt_amount",0),
			"return_qty": vals.get("return_qty",0), "return_rate": 0, "return_amount": vals.get("return_amount",0),
			"dc_to_customer_qty": vals.get("dc_to_customer_qty",0), "dc_to_customer_rate": 0, "dc_to_customer_amount": vals.get("dc_to_customer_amount",0),
			"other_receipt_qty": vals.get("other_receipt_qty",0), "other_receipt_rate": 0, "other_receipt_amount": vals.get("other_receipt_amount",0),
			"other_issue_qty": vals.get("other_issue_qty",0), "other_issue_rate": 0, "other_issue_amount": vals.get("other_issue_amount",0),
			"wip_factory_qty": vals.get("wip_factory_qty",0), "wip_factory_rate": 0, "wip_factory_amount": vals.get("wip_factory_amount",0),
			"wip_job_work_qty": vals.get("wip_job_work_qty",0), "wip_job_work_rate": 0, "wip_job_work_amount": vals.get("wip_job_work_amount",0),
			"closing_qty": cq, "closing_rate": flt(cv/cq,2) if cq else 0, "closing_amount": cv,
		})
	return data


def prepare_warehouse_wise_data(all_items, item_details, opening_stock, closing_stock,
								receipt_data, return_data, issue_data, other_receipt_data,
								other_issue_data, wip_factory_in_data, wip_job_work_data):
	data = []
	all_warehouses = set()
	for item_code in all_items:
		for d in [opening_stock, closing_stock]:
			all_warehouses.update(d.get(item_code, {}).keys())

	for warehouse in sorted(all_warehouses):
		vals = defaultdict(float)
		for item_code in all_items:
			for v in opening_stock.get(item_code,{}).get(warehouse,{}).values():
				vals["opening_qty"]   += flt(v.get("qty"),3)
				vals["opening_value"] += flt(v.get("value"),2)
			for v in closing_stock.get(item_code,{}).get(warehouse,{}).values():
				vals["closing_qty"]   += flt(v.get("qty"),3)
				vals["closing_value"] += flt(v.get("value"),2)
			for src, kq, ka in [
				(receipt_data,"receipt_qty","receipt_amount"),
				(return_data,"return_qty","return_amount"),
				(issue_data,"dc_to_customer_qty","dc_to_customer_amount"),
				(other_receipt_data,"other_receipt_qty","other_receipt_amount"),
				(other_issue_data,"other_issue_qty","other_issue_amount"),
				(wip_factory_in_data,"wip_factory_qty","wip_factory_amount"),
				(wip_job_work_data,"wip_job_work_qty","wip_job_work_amount"),
			]:
				for v in src.get(item_code,{}).get(warehouse,{}).values():
					vals[kq] += flt(v.get("qty"),3)
					vals[ka] += flt(v.get("amount"),2)

		oq, ov = vals["opening_qty"], vals["opening_value"]
		cq, cv = vals["closing_qty"], vals["closing_value"]
		
		# Only include rows where closing quantity is not 0
		if cq == 0:
			continue
			
		# Only include rows where closing quantity is not 0
		if cq == 0:
			continue

		if not any(vals.values()):
			continue
		data.append({
			"warehouse": warehouse,
			"opening_qty": oq, "opening_rate": flt(ov/oq,2) if oq else 0, "opening_value": ov,
			"receipt_qty": vals["receipt_qty"], "receipt_rate": 0, "receipt_amount": vals["receipt_amount"],
			"return_qty": vals["return_qty"], "return_rate": 0, "return_amount": vals["return_amount"],
			"dc_to_customer_qty": vals["dc_to_customer_qty"], "dc_to_customer_rate": 0, "dc_to_customer_amount": vals["dc_to_customer_amount"],
			"other_receipt_qty": vals["other_receipt_qty"], "other_receipt_rate": 0, "other_receipt_amount": vals["other_receipt_amount"],
			"other_issue_qty": vals["other_issue_qty"], "other_issue_rate": 0, "other_issue_amount": vals["other_issue_amount"],
			"wip_factory_qty": vals["wip_factory_qty"], "wip_factory_rate": 0, "wip_factory_amount": vals["wip_factory_amount"],
			"wip_job_work_qty": vals["wip_job_work_qty"], "wip_job_work_rate": 0, "wip_job_work_amount": vals["wip_job_work_amount"],
			"closing_qty": cq, "closing_rate": flt(cv/cq,2) if cq else 0, "closing_amount": cv,
		})
	return data


def prepare_bin_wise_data(all_items, item_details, opening_stock, closing_stock,
						  receipt_data, return_data, issue_data, other_receipt_data,
						  other_issue_data, wip_factory_in_data, wip_job_work_data):
	"""Unchanged from original — project filter scoped upstream."""
	data = []
	all_bins = set()
	for item_code in all_items:
		for warehouse in opening_stock.get(item_code, {}):
			for key in opening_stock[item_code][warehouse]:
				bin_no = key.split("|||")[0]
				if bin_no:
					all_bins.add(bin_no)

	for bin_name in sorted(all_bins):
		vals = defaultdict(float)
		for item_code in all_items:
			for d, kq, ka in [
				(opening_stock,"opening_qty","opening_value"),
				(receipt_data,"receipt_qty","receipt_amount"),
				(return_data,"return_qty","return_amount"),
				(issue_data,"dc_to_customer_qty","dc_to_customer_amount"),
				(other_receipt_data,"other_receipt_qty","other_receipt_amount"),
				(other_issue_data,"other_issue_qty","other_issue_amount"),
				(wip_factory_in_data,"wip_factory_qty","wip_factory_amount"),
				(wip_job_work_data,"wip_job_work_qty","wip_job_work_amount"),
			]:
				for warehouse in d.get(item_code, {}):
					for key, v in d[item_code][warehouse].items():
						if bin_name in key:
							vals[kq] += flt(v.get("qty"),3)
							vals[ka] += flt(v.get("amount") or v.get("value"),2)

		oq, ov = vals["opening_qty"], vals["opening_value"]
		cq = flt(oq + vals["receipt_qty"] + vals["other_receipt_qty"] + vals["wip_factory_qty"]
				 - vals["return_qty"] - vals["dc_to_customer_qty"] - vals["other_issue_qty"] - vals["wip_job_work_qty"], 3)
		ca = flt(ov + vals["receipt_amount"] + vals["other_receipt_amount"] + vals["wip_factory_amount"]
				 - vals["return_amount"] - vals["dc_to_customer_amount"] - vals["other_issue_amount"] - vals["wip_job_work_amount"], 2)
		# Only include rows where closing quantity is not 0
		if cq == 0:
			continue

		if not any(vals.values()):
			continue
		data.append({
			"bin": bin_name,
			"opening_qty": oq, "opening_rate": flt(ov/oq,2) if oq else 0, "opening_value": ov,
			"receipt_qty": vals["receipt_qty"], "receipt_rate": 0, "receipt_amount": vals["receipt_amount"],
			"return_qty": vals["return_qty"], "return_rate": 0, "return_amount": vals["return_amount"],
			"dc_to_customer_qty": vals["dc_to_customer_qty"], "dc_to_customer_rate": 0, "dc_to_customer_amount": vals["dc_to_customer_amount"],
			"other_receipt_qty": vals["other_receipt_qty"], "other_receipt_rate": 0, "other_receipt_amount": vals["other_receipt_amount"],
			"other_issue_qty": vals["other_issue_qty"], "other_issue_rate": 0, "other_issue_amount": vals["other_issue_amount"],
			"wip_factory_qty": vals["wip_factory_qty"], "wip_factory_rate": 0, "wip_factory_amount": vals["wip_factory_amount"],
			"wip_job_work_qty": vals["wip_job_work_qty"], "wip_job_work_rate": 0, "wip_job_work_amount": vals["wip_job_work_amount"],
			"closing_qty": cq, "closing_rate": flt(ca/cq,2) if cq else 0, "closing_amount": ca,
		})
	return data


def prepare_project_wise_data(all_items, item_details, opening_stock, closing_stock,
							  receipt_data, return_data, issue_data, other_receipt_data,
							  other_issue_data, wip_factory_in_data, wip_job_work_data):
	"""Unchanged from original — project filter scoped upstream."""
	data = []
	all_projects = set()
	for item_code in all_items:
		for warehouse in opening_stock.get(item_code, {}):
			for key in opening_stock[item_code][warehouse]:
				project_no = key.split("|||")[1]
				if project_no:
					all_projects.add(project_no)

	for project in sorted(all_projects):
		vals = defaultdict(float)
		for item_code in all_items:
			for d, kq, ka in [
				(opening_stock,"opening_qty","opening_value"),
				(receipt_data,"receipt_qty","receipt_amount"),
				(return_data,"return_qty","return_amount"),
				(issue_data,"dc_to_customer_qty","dc_to_customer_amount"),
				(other_receipt_data,"other_receipt_qty","other_receipt_amount"),
				(other_issue_data,"other_issue_qty","other_issue_amount"),
				(wip_factory_in_data,"wip_factory_qty","wip_factory_amount"),
				(wip_job_work_data,"wip_job_work_qty","wip_job_work_amount"),
			]:
				for warehouse in d.get(item_code, {}):
					for key, v in d[item_code][warehouse].items():
						if project in key:
							vals[kq] += flt(v.get("qty"),3)
							vals[ka] += flt(v.get("amount") or v.get("value"),2)

		oq, ov = vals["opening_qty"], vals["opening_value"]
		cq = flt(oq + vals["receipt_qty"] + vals["other_receipt_qty"] + vals["wip_factory_qty"]
				 - vals["return_qty"] - vals["dc_to_customer_qty"] - vals["other_issue_qty"] - vals["wip_job_work_qty"], 3)
		ca = flt(ov + vals["receipt_amount"] + vals["other_receipt_amount"] + vals["wip_factory_amount"]
				 - vals["return_amount"] - vals["dc_to_customer_amount"] - vals["other_issue_amount"] - vals["wip_job_work_amount"], 2)
		# Only include rows where closing quantity is not 0
		if cq == 0:
			continue

		if not any(vals.values()):
			continue
		data.append({
			"project": project,
			"opening_qty": oq, "opening_rate": flt(ov/oq,2) if oq else 0, "opening_value": ov,
			"receipt_qty": vals["receipt_qty"], "receipt_rate": 0, "receipt_amount": vals["receipt_amount"],
			"return_qty": vals["return_qty"], "return_rate": 0, "return_amount": vals["return_amount"],
			"dc_to_customer_qty": vals["dc_to_customer_qty"], "dc_to_customer_rate": 0, "dc_to_customer_amount": vals["dc_to_customer_amount"],
			"other_receipt_qty": vals["other_receipt_qty"], "other_receipt_rate": 0, "other_receipt_amount": vals["other_receipt_amount"],
			"other_issue_qty": vals["other_issue_qty"], "other_issue_rate": 0, "other_issue_amount": vals["other_issue_amount"],
			"wip_factory_qty": vals["wip_factory_qty"], "wip_factory_rate": 0, "wip_factory_amount": vals["wip_factory_amount"],
			"wip_job_work_qty": vals["wip_job_work_qty"], "wip_job_work_rate": 0, "wip_job_work_amount": vals["wip_job_work_amount"],
			"closing_qty": cq, "closing_rate": flt(ca/cq,2) if cq else 0, "closing_amount": ca,
		})
	return data


def filter_by_bin_project(data, bin=None, project=None):
	filtered = defaultdict(lambda: defaultdict(lambda: {}))
	for item_code in data:
		for warehouse in data[item_code]:
			for key, values in data[item_code][warehouse].items():
				bin_no = key.split("|||")[0]
				project_no = key.split("|||")[1]
				matches = True
				if bin and bin_no != bin:
					matches = False
				if project and project_no != project:
					matches = False
				if matches:
					filtered[item_code][warehouse][key] = values
	return filtered


def get_closing_valuation_rate(item_code, warehouse):
	rate = frappe.db.sql("""
		SELECT valuation_rate FROM `tabStock Ledger Entry`
		WHERE item_code = %s AND warehouse = %s
			AND is_cancelled = 0 AND docstatus < 2
		ORDER BY posting_date DESC, creation DESC LIMIT 1
	""", (item_code, warehouse), as_list=1)
	return flt(rate[0][0], 2) if rate else 0.0


# ========================= DETAIL DRILL-DOWN =========================

def get_transaction_details(transaction_type, warehouse, from_date, to_date,
							include_child=1, show_items=0, bin=None, project=None):
	from_date = getdate(from_date)
	to_date   = getdate(to_date)
	include_child = int(include_child)
	show_items    = int(show_items)
	warehouses    = get_warehouses(warehouse, include_child)
	if not warehouses:
		return []

	fn_map = {
		"purchase_cost":    get_purchase_cost_details,
		"purchase_return":  get_purchase_return_details,
		"issue_cost":       get_issue_cost_details,
		"other_receipt":    get_other_receipt_details,
		"other_issue":      get_other_issue_details,
		"transfer_in":      get_transfer_in_details,
		"transfer_out":     get_transfer_out_details,
	}
	fn = fn_map.get(transaction_type)
	return fn(warehouses, from_date, to_date, show_items, bin, project) if fn else []


def _detail_sql(base_select, from_clause, where_extra, group_by, warehouses,
				from_date, to_date, bin=None, project=None, show_items=False):
	"""
	Builds and runs a detail query.
	base_select: columns for item-wise or doc-wise
	where_extra: extra AND conditions (e.g. voucher_type, purpose)
	group_by: used only when not show_items
	"""
	proj_cond, proj_params = _project_condition(project)
	bin_cond  = " AND sle.custom_bin_no = %s "  if bin     else ""
	bin_params = [bin]                            if bin     else []
	wh_ph = ','.join(['%s'] * len(warehouses))

	sql = f"""
		{base_select}
		{from_clause}
		WHERE sle.warehouse IN ({wh_ph})
			AND sle.posting_date >= %s AND sle.posting_date <= %s
			{where_extra}
			AND sle.is_cancelled = 0 AND sle.docstatus < 2
			{bin_cond}
			{proj_cond}
		{"" if show_items else "GROUP BY " + group_by}
		ORDER BY sle.posting_date DESC, sle.voucher_no
	"""
	params = list(warehouses) + [from_date, to_date] + bin_params + proj_params
	return frappe.db.sql(sql, params, as_dict=1)


def get_purchase_cost_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
	if show_items:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, pr.supplier,
					sle.item_code, i.item_name, i.description, i.technical_description,
					sle.warehouse, sle.actual_qty as qty, sle.valuation_rate as rate,
					sle.actual_qty * sle.valuation_rate as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
	else:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, pr.supplier,
					SUM(sle.actual_qty * sle.valuation_rate) as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name"
	extra = "AND sle.voucher_type = 'Purchase Receipt' AND pr.is_return = 0 AND sle.actual_qty > 0"
	grp   = "sle.voucher_no, sle.posting_date, pr.supplier"
	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)


def get_purchase_return_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
	if show_items:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, pr.supplier,
					sle.item_code, i.item_name, i.description, i.technical_description,
					sle.warehouse, ABS(sle.actual_qty) as qty, sle.valuation_rate as rate,
					ABS(sle.actual_qty) * sle.valuation_rate as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
	else:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, pr.supplier,
					SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name"
	extra = "AND sle.voucher_type = 'Purchase Receipt' AND pr.is_return = 1 AND sle.actual_qty < 0"
	grp   = "sle.voucher_no, sle.posting_date, pr.supplier"
	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)


def get_issue_cost_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
	if show_items:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, dn.customer,
					sle.item_code, i.item_name, i.description, i.technical_description,
					sle.warehouse, ABS(sle.actual_qty) as qty, sle.valuation_rate as rate,
					ABS(sle.actual_qty) * sle.valuation_rate as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabDelivery Note` dn ON sle.voucher_no = dn.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
	else:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, dn.customer,
					SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabDelivery Note` dn ON sle.voucher_no = dn.name"
	extra = "AND sle.voucher_type = 'Delivery Note' AND sle.actual_qty < 0"
	grp   = "sle.voucher_no, sle.posting_date, dn.customer"
	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)


def get_other_receipt_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
	if show_items:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
					sle.item_code, i.item_name, i.description, i.technical_description,
					sle.warehouse, sle.actual_qty as qty, sle.valuation_rate as rate,
					sle.actual_qty * sle.valuation_rate as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
	else:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
					SUM(sle.actual_qty * sle.valuation_rate) as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name"
	extra = "AND sle.voucher_type = 'Stock Entry' AND se.purpose = 'Material Receipt' AND sle.actual_qty > 0"
	grp   = "sle.voucher_no, sle.posting_date, se.purpose"
	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)


def get_other_issue_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
	if show_items:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
					sle.item_code, i.item_name, i.description, i.technical_description,
					sle.warehouse, ABS(sle.actual_qty) as qty, sle.valuation_rate as rate,
					ABS(sle.actual_qty) * sle.valuation_rate as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
	else:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
					SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name"
	extra = "AND sle.voucher_type = 'Stock Entry' AND (se.purpose = 'Send to Subcontractor' OR se.purpose = 'Material Transfer') AND sle.actual_qty < 0"
	grp   = "sle.voucher_no, sle.posting_date, se.purpose"
	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)


def get_transfer_in_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
	if show_items:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
					sle.item_code, i.item_name, i.description, i.technical_description,
					sle.warehouse, sle.actual_qty as qty, sle.valuation_rate as rate,
					sle.actual_qty * sle.valuation_rate as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
	else:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
					SUM(sle.actual_qty * sle.valuation_rate) as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name"
	extra = "AND sle.voucher_type = 'Stock Entry' AND se.purpose = 'Material Transfer' AND sle.actual_qty > 0"
	grp   = "sle.voucher_no, sle.posting_date, se.purpose"
	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)


def get_transfer_out_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
	if show_items:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
					sle.item_code, i.item_name, i.description, i.technical_description,
					sle.warehouse, ABS(sle.actual_qty) as qty, sle.valuation_rate as rate,
					ABS(sle.actual_qty) * sle.valuation_rate as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name LEFT JOIN `tabItem` i ON sle.item_code = i.name"
	else:
		select = """SELECT sle.voucher_no as document_name, sle.posting_date, se.purpose,
					SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount"""
		frm    = "FROM `tabStock Ledger Entry` sle INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name"
	extra = "AND sle.voucher_type = 'Stock Entry' AND se.purpose = 'Send to Subcontractor' AND sle.actual_qty < 0"
	grp   = "sle.voucher_no, sle.posting_date, se.purpose"
	return _detail_sql(select, frm, extra, grp, warehouses, from_date, to_date, bin, project, show_items)
