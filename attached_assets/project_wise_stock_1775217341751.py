# # import frappe
# # from frappe import _
# # from frappe.utils import flt, getdate, cstr
# # from collections import defaultdict

# # def execute(filters=None):
# # 	if not filters:
# # 		filters = {}
# # 	columns = get_columns(filters)
# # 	data = get_data(filters)
# # 	return columns, data

# # def get_columns(filters):
# # 	"""Define report columns - dynamically hide columns based on consolidate_by filter"""
# # 	consolidate_by = filters.get("consolidate_by", "")
	
# # 	columns = []
	
# # 	# 1. Item Code - hide for both Item Group Wise and Warehouse Wise
# # 	if not consolidate_by:
# # 		columns.append({
# # 			"fieldname": "item_code",
# # 			"label": _("Item Code"),
# # 			"fieldtype": "Link",
# # 			"options": "Item",
# # 			"width": 150
# # 		})
	
# # 	# 2. Item Group - show only for default and Item Group Wise (hide for Warehouse Wise)
# # 	if consolidate_by != "Warehouse Wise":
# # 		columns.append({
# # 			"fieldname": "item_group",
# # 			"label": _("Item Group"),
# # 			"fieldtype": "Link",
# # 			"options": "Item Group",
# # 			"width": 150
# # 		})
	
# # 	# 3. Description - hide for both Item Group Wise and Warehouse Wise
# # 	if not consolidate_by:
# # 		columns.append({
# # 			"fieldname": "description",
# # 			"label": _("Description"),
# # 			"fieldtype": "Data",
# # 			"width": 200
# # 		})
	
# # 	# 4. Technical Description - hide for both Item Group Wise and Warehouse Wise
# # 	if not consolidate_by:
# # 		columns.append({
# # 			"fieldname": "technical_description",
# # 			"label": _("Technical Description"),
# # 			"fieldtype": "Data",
# # 			"width": 200
# # 		})
	
# # 	# 5. Warehouse - show only for default and Warehouse Wise (hide for Item Group Wise, Bin Wise, Project Wise)
# # 	if consolidate_by not in ["Item Group Wise", "Bin Wise", "Project Wise"]:
# # 		columns.append({
# # 			"fieldname": "warehouse",
# # 			"label": _("Warehouse"),
# # 			"fieldtype": "Link",
# # 			"options": "Warehouse",
# # 			"width": 150
# # 		})
	
# # 	# 6. Bin (Location) - show for default item-wise report (comma-separated)
# # 	if not consolidate_by:
# # 		columns.append({
# # 			"fieldname": "bin_location",
# # 			"label": _("Bin (Location)"),
# # 			"fieldtype": "Data",
# # 			"width": 200
# # 		})

	
# # 	# 7. Project - show for default item-wise report (comma-separated)
# # 	if not consolidate_by:
# # 		columns.append({
# # 			"fieldname": "project_list",
# # 			"label": _("Project"),
# # 			"fieldtype": "Data",
# # 			"width": 200
# # 		})

# # 	columns.append({
# # 		"fieldname": "closing_qty",
# # 		"label": _("Closing Qty"),
# # 		"fieldtype": "Float",
# # 		"width": 120
# # 	})
	
# # 	# Bin - show only for Bin Wise
# # 	if consolidate_by == "Bin Wise":
# # 		columns.append({
# # 			"fieldname": "bin",
# # 			"label": _("Bin"),
# # 			"fieldtype": "Link",
# # 			"options": "Physical Bin",
# # 			"width": 150
# # 		})
	
# # 	# Project - show only for Project Wise
# # 	if consolidate_by == "Project Wise":
# # 		columns.append({
# # 			"fieldname": "project",
# # 			"label": _("Project"),
# # 			"fieldtype": "Link",
# # 			"options": "Project",
# # 			"width": 150
# # 		})

# # 	columns.extend([
# # 		{
# # 			"fieldname": "opening_qty",
# # 			"label": _("Opening Qty"),
# # 			"fieldtype": "Float",
# # 			"width": 120
# # 		},
# # 		{
# # 			"fieldname": "opening_rate",
# # 			"label": _("Opening Rate"),
# # 			"fieldtype": "Currency",
# # 			"width": 120,
# # 			"hidden":1
# # 		},
# # 		{
# # 			"fieldname": "opening_value",
# # 			"label": _("Opening Value"),
# # 			"fieldtype": "Currency",
# # 			"width": 150
# # 		},
# # 		{
# # 			"fieldname": "receipt_qty",
# # 			"label": _("Receipt Qty"),
# # 			"fieldtype": "Float",
# # 			"width": 120
# # 		},
# # 		{
# # 			"fieldname": "receipt_rate",
# # 			"label": _("Receipt Rate"),
# # 			"fieldtype": "Currency",
# # 			"width": 120,
# # 			"hidden":1
# # 		},
# # 		{
# # 			"fieldname": "receipt_amount",
# # 			"label": _("Receipt Amount"),
# # 			"fieldtype": "Currency",
# # 			"width": 150
# # 		},
# # 		{
# # 			"fieldname": "return_qty",
# # 			"label": _("Return Qty"),
# # 			"fieldtype": "Float",
# # 			"width": 120
# # 		},
# # 		{
# # 			"fieldname": "return_rate",
# # 			"label": _("Return Rate"),
# # 			"fieldtype": "Currency",
# # 			"width": 120,
# # 			"hidden":1
# # 		},
# # 		{
# # 			"fieldname": "return_amount",
# # 			"label": _("Return Amount"),
# # 			"fieldtype": "Currency",
# # 			"width": 150
# # 		},
# # 		{
# # 			"fieldname": "dc_to_customer_qty",
# # 			"label": _("DC to Customer Qty"),
# # 			"fieldtype": "Float",
# # 			"width": 120
# # 		},
# # 		{
# # 			"fieldname": "dc_to_customer_rate",
# # 			"label": _("DC to Customer Rate"),
# # 			"fieldtype": "Currency",
# # 			"width": 120,
# # 			"hidden":1
# # 		},
# # 		{
# # 			"fieldname": "dc_to_customer_amount",
# # 			"label": _("DC to Customer Amount"),
# # 			"fieldtype": "Currency",
# # 			"width": 150
# # 		},
# # 		{
# # 			"fieldname": "other_receipt_qty",
# # 			"label": _("Other Receipt Qty"),
# # 			"fieldtype": "Float",
# # 			"width": 120
# # 		},
# # 		{
# # 			"fieldname": "other_receipt_rate",
# # 			"label": _("Other Receipt Rate"),
# # 			"fieldtype": "Currency",
# # 			"width": 120,
# # 			"hidden":1
# # 		},
# # 		{
# # 			"fieldname": "other_receipt_amount",
# # 			"label": _("Other Receipt Amount"),
# # 			"fieldtype": "Currency",
# # 			"width": 150
# # 		},
# # 		{
# # 			"fieldname": "other_issue_qty",
# # 			"label": _("Other Issue Qty"),
# # 			"fieldtype": "Float",
# # 			"width": 120
# # 		},
# # 		{
# # 			"fieldname": "other_issue_rate",
# # 			"label": _("Other Issue Rate"),
# # 			"fieldtype": "Currency",
# # 			"width": 120,
# # 			"hidden":1
# # 		},
# # 		{
# # 			"fieldname": "other_issue_amount",
# # 			"label": _("Other Issue Amount"),
# # 			"fieldtype": "Currency",
# # 			"width": 150
# # 		},
# # 		{
# # 			"fieldname": "wip_factory_qty",
# # 			"label": _("WIP Factory (Material Transfer In) Qty"),
# # 			"fieldtype": "Float",
# # 			"width": 120
# # 		},
# # 		{
# # 			"fieldname": "wip_factory_rate",
# # 			"label": _("WIP Factory Rate"),
# # 			"fieldtype": "Currency",
# # 			"width": 120,
# # 			"hidden":1
# # 		},
# # 		{
# # 			"fieldname": "wip_factory_amount",
# # 			"label": _("WIP Factory Amount"),
# # 			"fieldtype": "Currency",
# # 			"width": 150
# # 		},
# # 		{
# # 			"fieldname": "wip_job_work_qty",
# # 			"label": _("WIP Job Work (Send to Subcontractor) Qty"),
# # 			"fieldtype": "Float",
# # 			"width": 120
# # 		},
# # 		{
# # 			"fieldname": "wip_job_work_rate",
# # 			"label": _("WIP Job Work Rate"),
# # 			"fieldtype": "Currency",
# # 			"width": 120,
# # 			"hidden":1
# # 		},
# # 		{
# # 			"fieldname": "wip_job_work_amount",
# # 			"label": _("WIP Job Work Amount"),
# # 			"fieldtype": "Currency",
# # 			"width": 150
# # 		},
# # 		{
# # 			"fieldname": "closing_rate",
# # 			"label": _("Closing Rate (Valuation Rate)"),
# # 			"fieldtype": "Currency",
# # 			"width": 150
# # 		},
# # 		{
# # 			"fieldname": "closing_amount",
# # 			"label": _("Closing Value"),
# # 			"fieldtype": "Currency",
# # 			"width": 150
# # 		}
# # 	])
	
# # 	return columns


# # def get_data(filters):
# # 	"""Get opening stock data for items in the warehouse"""
# # 	warehouse = filters.get("warehouse")
# # 	from_date = getdate(filters.get("from_date"))
# # 	include_child = filters.get("include_child_warehouses")
# # 	consolidate_by = filters.get("consolidate_by")
# # 	bin_filter = filters.get("bin")
# # 	rack_no_filter = filters.get("rack_no")
# # 	project_filter = filters.get("project")
# # 	number_of_bins = filters.get("number_of_bins")
# # 	item_code_filter = filters.get("item_code")
# # 	item_wise_bin = filters.get("item_wise_bin")
# # 	project_wise_bin = filters.get("project_wise_bin")
# # 	to_date = getdate(filters.get("to_date"))
	
# # 	warehouses = get_warehouses(warehouse, include_child)
# # 	if not warehouses:
# # 		return []
	
# # 	# Get item details (item_code, item_group, description, etc.)
# # 	all_items = get_all_items(warehouses, from_date, to_date, item_code_filter)
# # 	item_details = get_item_details(all_items)
	
# # 	# Get all stock transactions for the period
# # 	opening_stock = get_opening_stock(warehouses, from_date, bin_filter, project_filter)
# # 	closing_stock = get_closing_stock(warehouses, to_date)
# # 	receipt_data = get_receipt_data(warehouses, from_date, to_date)
# # 	return_data = get_return_data(warehouses, from_date, to_date)
# # 	issue_data = get_issue_data(warehouses, from_date, to_date)
# # 	other_receipt_data = get_other_receipt_data(warehouses, from_date, to_date)
# # 	other_issue_data = get_other_issue_data(warehouses, from_date, to_date)
# # 	wip_factory_in_data, wip_job_work_data = get_material_transfer_data(warehouses, from_date, to_date)
# # 	stock_recon_data = get_stock_reconciliation_data(warehouses, to_date)
	
# # 	# Prepare data based on consolidation type
# # 	if consolidate_by == "Item Group Wise":
# # 		return prepare_item_group_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data,
# # 										   issue_data, other_receipt_data, other_issue_data, wip_factory_in_data, wip_job_work_data)
# # 	elif consolidate_by == "Warehouse Wise":
# # 		return prepare_warehouse_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data,
# # 										  issue_data, other_receipt_data, other_issue_data, wip_factory_in_data, wip_job_work_data)
# # 	elif consolidate_by == "Bin Wise":
# # 		return prepare_bin_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data,
# # 									  issue_data, other_receipt_data, other_issue_data, wip_factory_in_data, wip_job_work_data)
# # 	elif consolidate_by == "Project Wise":
# # 		return prepare_project_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data,
# # 										issue_data, other_receipt_data, other_issue_data, wip_factory_in_data, wip_job_work_data)
# # 	else:
# # 		# Default: Item-wise with bins and projects
# # 		return prepare_item_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data,
# # 									   issue_data, other_receipt_data, other_issue_data, wip_factory_in_data, wip_job_work_data,
# # 									   from_date=from_date, to_date=to_date,
# # 									   stock_recon_data=stock_recon_data)


# # def get_warehouses(warehouse, include_child):
# # 	"""Get list of warehouses including children if requested"""
# # 	if not warehouse:
# # 		return []
	
# # 	warehouses = [warehouse]
# # 	if include_child:
# # 		child_warehouses = frappe.db.sql("""
# # 			SELECT name FROM `tabWarehouse` 
# # 			WHERE parent_warehouse = %s AND disabled = 0
# # 		""", warehouse, as_list=1)
# # 		warehouses.extend([w[0] for w in child_warehouses])
	
# # 	return warehouses


# # def get_bins_and_projects_for_item_warehouse(item_code, warehouse, from_date, to_date):
# # 	"""
# # 	Get all distinct bins and projects used for an item in a warehouse during the period
# # 	Used for display purposes (comma-separated lists)
# # 	"""
# # 	bins_set = set()
# # 	projects_set = set()
	
# # 	# Query all transactions for this item-warehouse combo in the period (including before and after)
# # 	# to get all bins and projects ever used
# # 	sle_data = frappe.db.sql("""
# # 		SELECT DISTINCT
# # 			COALESCE(custom_bin_no, '') as custom_bin_no,
# # 			COALESCE(custom_project_no, '') as custom_project_no
# # 		FROM `tabStock Ledger Entry`
# # 		WHERE item_code = %s
# # 			AND warehouse = %s
# # 			AND is_cancelled = 0
# # 			AND docstatus < 2
# # 	""", (item_code, warehouse), as_dict=1)
	
# # 	for sle in sle_data:
# # 		bin_no = sle.get("custom_bin_no") or ""
# # 		project_no = sle.get("custom_project_no") or ""
# # 		if bin_no:
# # 			bins_set.add(bin_no)
# # 		if project_no:
# # 			projects_set.add(project_no)
	
# # 	return sorted(bins_set), sorted(projects_set)


# # def get_all_items(warehouses, from_date, to_date, item_code_filter=None):
# # 	"""Get all items that either:
# # 	1. Have stock transactions in the period, OR
# # 	2. Have actual closing stock (inventory) as of to_date
# # 	This ensures items with stock show every month until stock is 0"""
# # 	condition = ""
# # 	params = list(warehouses) + [from_date, to_date]
	
# # 	if item_code_filter:
# # 		condition = "AND sle.item_code = %s"
# # 		params.append(item_code_filter)
	
# # 	# Get items with transactions in the period
# # 	transaction_items = frappe.db.sql(f"""
# # 		SELECT DISTINCT sle.item_code
# # 		FROM `tabStock Ledger Entry` sle
# # 		WHERE sle.warehouse IN ({','.join(['%s'] * len(warehouses))})
# # 			AND sle.posting_date >= %s
# # 			AND sle.posting_date <= %s
# # 			AND sle.is_cancelled = 0
# # 			AND sle.docstatus < 2
# # 			{condition}
# # 		ORDER BY sle.item_code
# # 	""", params, as_list=1)
	
# # 	# Get items with closing stock (actual inventory) as of to_date
# # 	stock_items_params = list(warehouses) + [to_date]
# # 	if item_code_filter:
# # 		stock_items_params.append(item_code_filter)
# # 		stock_condition = "AND sle.item_code = %s"
# # 	else:
# # 		stock_condition = ""
	
# # 	stock_items = frappe.db.sql(f"""
# # 		SELECT DISTINCT sle.item_code
# # 		FROM `tabStock Ledger Entry` sle
# # 		WHERE sle.warehouse IN ({','.join(['%s'] * len(warehouses))})
# # 			AND sle.posting_date <= %s
# # 			AND sle.is_cancelled = 0
# # 			AND sle.docstatus < 2
# # 			AND sle.qty_after_transaction > 0
# # 			{stock_condition}
# # 		ORDER BY sle.item_code
# # 	""", stock_items_params, as_list=1)
	
# # 	# Combine both lists and remove duplicates
# # 	all_items = list(set([item[0] for item in transaction_items] + [item[0] for item in stock_items]))
	
# # 	return sorted(all_items)


# # def get_item_details(item_codes):
# # 	"""Get item master details (name, group, description, etc.)"""
# # 	item_details = {}
	
# # 	if not item_codes:
# # 		return item_details
	
# # 	items = frappe.db.sql("""
# # 		SELECT name, item_group, description, item_name, technical_description
# # 		FROM `tabItem`
# # 		WHERE name IN ({})
# # 	""".format(','.join(['%s'] * len(item_codes))), 
# # 	item_codes, as_dict=1)
	
# # 	for item in items:
# # 		item_details[item.name] = {
# # 			"item_name": item.item_name or "",
# # 			"item_group": item.item_group or "",
# # 			"description": item.description or "",
# # 			"technical_description": item.technical_description or ""
# # 		}
	
# # 	return item_details


# # def prepare_item_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data, 
# # 							issue_data, other_receipt_data, other_issue_data, 
# # 							wip_factory_in_data, wip_job_work_data, stock_recon_data=None, 
# # 							from_date=None, to_date=None):
# # 	"""
# # 	Prepare default item-wise data with bin and project details
# # 	Uses ACTUAL closing stock from Stock Ledger Entry qty_after_transaction
# # 	"""
# # 	data = []
	
# # 	for item_code in sorted(all_items):
# # 		# Get all warehouses for this item from opening stock
# # 		warehouses_for_item = set()
# # 		if item_code in opening_stock:
# # 			warehouses_for_item.update(opening_stock[item_code].keys())
# # 		if item_code in closing_stock:
# # 			warehouses_for_item.update(closing_stock[item_code].keys())
# # 		if item_code in receipt_data:
# # 			warehouses_for_item.update(receipt_data[item_code].keys())
# # 		if item_code in return_data:
# # 			warehouses_for_item.update(return_data[item_code].keys())
# # 		if item_code in issue_data:
# # 			warehouses_for_item.update(issue_data[item_code].keys())
# # 		if item_code in other_receipt_data:
# # 			warehouses_for_item.update(other_receipt_data[item_code].keys())
# # 		if item_code in other_issue_data:
# # 			warehouses_for_item.update(other_issue_data[item_code].keys())
# # 		if item_code in wip_factory_in_data:
# # 			warehouses_for_item.update(wip_factory_in_data[item_code].keys())
# # 		if item_code in wip_job_work_data:
# # 			warehouses_for_item.update(wip_job_work_data[item_code].keys())
		
# # 		for warehouse in sorted(warehouses_for_item):
# # 			# Aggregate all bin-project combinations for opening stock
# # 			opening_qty = 0.0
# # 			opening_value = 0.0
			
# # 			for bin_project_key, values in opening_stock.get(item_code, {}).get(warehouse, {}).items():
# # 				opening_qty += flt(values.get("qty"), 3)
# # 				opening_value += flt(values.get("value"), 2)
			
# # 			# Keep actual value (don't force abs() here - we need real opening to calculate closing correctly)
# # 			# e.g., if opening was negative, closing formula must account for it
# # 			opening_qty = flt(opening_qty, 3)
# # 			opening_value = flt(opening_value, 2)
# # 			# Opening rate = opening_value / opening_qty (always positive now)
# # 			opening_rate = flt(opening_value / opening_qty, 2) if opening_qty != 0 else 0.0
			
# # 			# Receipt data - use valuation rate from Stock Ledger Entry
# # 			receipt_qty = 0.0
# # 			receipt_amount = 0.0
# # 			for bin_project_key, values in receipt_data.get(item_code, {}).get(warehouse, {}).items():
# # 				receipt_qty += flt(values.get("qty"), 3)
# # 				receipt_amount += flt(values.get("amount"), 2)
# # 			receipt_rate = flt(receipt_amount / receipt_qty, 2) if receipt_qty != 0 else 0.0
			
# # 			# Return data
# # 			return_qty = 0.0
# # 			return_amount = 0.0
# # 			for bin_project_key, values in return_data.get(item_code, {}).get(warehouse, {}).items():
# # 				return_qty += flt(values.get("qty"), 3)
# # 				return_amount += flt(values.get("amount"), 2)
# # 			return_rate = flt(return_amount / return_qty, 2) if return_qty != 0 else 0.0
			
# # 			# DC to Customer (Issue) data
# # 			dc_to_customer_qty = 0.0
# # 			dc_to_customer_amount = 0.0
# # 			for bin_project_key, values in issue_data.get(item_code, {}).get(warehouse, {}).items():
# # 				dc_to_customer_qty += flt(values.get("qty"), 3)
# # 				dc_to_customer_amount += flt(values.get("amount"), 2)
# # 			dc_to_customer_rate = flt(dc_to_customer_amount / dc_to_customer_qty, 2) if dc_to_customer_qty != 0 else 0.0
			
# # 			# Other Receipt data
# # 			other_receipt_qty = 0.0
# # 			other_receipt_amount = 0.0
# # 			for bin_project_key, values in other_receipt_data.get(item_code, {}).get(warehouse, {}).items():
# # 				other_receipt_qty += flt(values.get("qty"), 3)
# # 				other_receipt_amount += flt(values.get("amount"), 2)
# # 			other_receipt_rate = flt(other_receipt_amount / other_receipt_qty, 2) if other_receipt_qty != 0 else 0.0
			
# # 			# Other Issue data
# # 			other_issue_qty = 0.0
# # 			other_issue_amount = 0.0
# # 			for bin_project_key, values in other_issue_data.get(item_code, {}).get(warehouse, {}).items():
# # 				other_issue_qty += flt(values.get("qty"), 3)
# # 				other_issue_amount += flt(values.get("amount"), 2)
# # 			other_issue_rate = flt(other_issue_amount / other_issue_qty, 2) if other_issue_qty != 0 else 0.0
			
# # 			# WIP Factory (Material Transfer In) data
# # 			wip_factory_qty = 0.0
# # 			wip_factory_amount = 0.0
# # 			for bin_project_key, values in wip_factory_in_data.get(item_code, {}).get(warehouse, {}).items():
# # 				wip_factory_qty += flt(values.get("qty"), 3)
# # 				wip_factory_amount += flt(values.get("amount"), 2)
# # 			wip_factory_rate = flt(wip_factory_amount / wip_factory_qty, 2) if wip_factory_qty != 0 else 0.0
			
# # 			# WIP Job Work (Send to Subcontractor) data
# # 			wip_job_work_qty = 0.0
# # 			wip_job_work_amount = 0.0
# # 			for bin_project_key, values in wip_job_work_data.get(item_code, {}).get(warehouse, {}).items():
# # 				wip_job_work_qty += flt(values.get("qty"), 3)
# # 				wip_job_work_amount += flt(values.get("amount"), 2)
# # 			wip_job_work_rate = flt(wip_job_work_amount / wip_job_work_qty, 2) if wip_job_work_qty != 0 else 0.0
			
# # 			# CORRECT closing stock CALCULATION: Opening + All Period Transactions = Closing
# # 			# This ensures math always works: Opening + Receipts - Issues = Closing
			
# # 			# Get closing stock from database
# # 			closing_qty_db = 0.0
# # 			closing_value_db = 0.0
			
# # 			for bin_project_key, values in closing_stock.get(item_code, {}).get(warehouse, {}).items():
# # 				closing_qty_db += flt(values.get("qty"), 3)
# # 				closing_value_db += flt(values.get("value"), 2)
			
# # 			# Use ACTUAL closing qty from database (this is the real on-hand inventory)
# # 			closing_qty = closing_qty_db
# # 			closing_value = closing_value_db
# # 			closing_rate = flt(closing_value / closing_qty, 2) if closing_qty != 0 else 0.0
# # 			closing_amount = flt(max(closing_value, 0), 2)
			
# # 			# Only show rows with non-zero values
# # 			if any([opening_qty, opening_value, receipt_qty, receipt_amount, return_qty, return_amount,
# # 				   dc_to_customer_qty, dc_to_customer_amount, other_receipt_qty, other_receipt_amount,
# # 				   other_issue_qty, other_issue_amount, wip_factory_qty, wip_factory_amount,
# # 				   wip_job_work_qty, wip_job_work_amount, closing_qty, closing_amount]):
				
# # 				# Get item info BEFORE using it
# # 				item_info = item_details.get(item_code, {})
				
# # 				# Ensure all amounts show as 0 if negative (not negative values)
# # 				opening_value_display = flt(max(opening_value, 0), 2)
# # 				receipt_amount_display = flt(max(receipt_amount, 0), 2)
# # 				return_amount_display = flt(max(return_amount, 0), 2)
# # 				dc_to_customer_amount_display = flt(max(dc_to_customer_amount, 0), 2)
# # 				other_receipt_amount_display = flt(max(other_receipt_amount, 0), 2)
# # 				other_issue_amount_display = flt(max(other_issue_amount, 0), 2)
# # 				wip_factory_amount_display = flt(max(wip_factory_amount, 0), 2)
# # 				wip_job_work_amount_display = flt(max(wip_job_work_amount, 0), 2)
# # 				closing_amount_display = flt(max(closing_amount, 0), 2)
				
# # 				# Get distinct bins and projects for this item-warehouse from database
# # 				bins_list, projects_list = get_bins_and_projects_for_item_warehouse(
# # 					item_code, warehouse, from_date, to_date
# # 				)
				
# # 				data.append({
# # 						"item_code": item_code,
# # 						"item_name": item_info.get("item_name", ""),
# # 						"item_group": item_info.get("item_group", ""),
# # 						"description": item_info.get("description", ""),
# # 						"technical_description": item_info.get("technical_description", ""),
# # 						"warehouse": warehouse,
# # 						"bin_location": ", ".join(bins_list) if bins_list else "",
# # 						"project_list": ", ".join(projects_list) if projects_list else "",
# # 						"opening_qty": opening_qty,
# # 						"opening_rate": opening_rate,
# # 						"opening_value": opening_value_display,
# # 						"receipt_qty": receipt_qty,
# # 						"receipt_rate": receipt_rate,
# # 						"receipt_amount": receipt_amount_display,
# # 						"return_qty": return_qty,
# # 						"return_rate": return_rate,
# # 						"return_amount": return_amount_display,
# # 						"dc_to_customer_qty": dc_to_customer_qty,
# # 						"dc_to_customer_rate": dc_to_customer_rate,
# # 						"dc_to_customer_amount": dc_to_customer_amount_display,
# # 						"other_receipt_qty": other_receipt_qty,
# # 						"other_receipt_rate": other_receipt_rate,
# # 						"other_receipt_amount": other_receipt_amount_display,
# # 						"other_issue_qty": other_issue_qty,
# # 						"other_issue_rate": other_issue_rate,
# # 						"other_issue_amount": other_issue_amount_display,
# # 						"wip_factory_qty": wip_factory_qty,
# # 						"wip_factory_rate": wip_factory_rate,
# # 						"wip_factory_amount": wip_factory_amount_display,
# # 						"wip_job_work_qty": wip_job_work_qty,
# # 						"wip_job_work_rate": wip_job_work_rate,
# # 						"wip_job_work_amount": wip_job_work_amount_display,
# # 					"closing_qty": flt(max(closing_qty, 0), 3),
# # 					"closing_rate": closing_rate,
# # 					"closing_amount": closing_amount_display
# # 				})
	
# # 	return data


# # def prepare_warehouse_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data,
# # 								issue_data, other_receipt_data, other_issue_data, wip_factory_in_data, wip_job_work_data):
# # 	"""Prepare warehouse-wise consolidated data using actual closing stock"""
# # 	data = []
	
# # 	# Get all warehouses
# # 	all_warehouses = set()
# # 	for item_code in all_items:
# # 		if item_code in opening_stock:
# # 			all_warehouses.update(opening_stock[item_code].keys())
# # 		if item_code in closing_stock:
# # 			all_warehouses.update(closing_stock[item_code].keys())
	
# # 	for warehouse in sorted(all_warehouses):
# # 		opening_qty = 0.0
# # 		opening_value = 0.0
# # 		receipt_qty = 0.0
# # 		receipt_amount = 0.0
# # 		return_qty = 0.0
# # 		return_amount = 0.0
# # 		dc_to_customer_qty = 0.0
# # 		dc_to_customer_amount = 0.0
# # 		other_receipt_qty = 0.0
# # 		other_receipt_amount = 0.0
# # 		other_issue_qty = 0.0
# # 		other_issue_amount = 0.0
# # 		wip_factory_qty = 0.0
# # 		wip_factory_amount = 0.0
# # 		wip_job_work_qty = 0.0
# # 		wip_job_work_amount = 0.0
		
# # 		for item_code in all_items:
# # 			for bin_project_key, values in opening_stock.get(item_code, {}).get(warehouse, {}).items():
# # 				opening_qty += flt(values.get("qty"), 3)
# # 				opening_value += flt(values.get("value"), 2)
			
# # 			for bin_project_key, values in receipt_data.get(item_code, {}).get(warehouse, {}).items():
# # 				receipt_qty += flt(values.get("qty"), 3)
# # 				receipt_amount += flt(values.get("amount"), 2)
			
# # 			for bin_project_key, values in return_data.get(item_code, {}).get(warehouse, {}).items():
# # 				return_qty += flt(values.get("qty"), 3)
# # 				return_amount += flt(values.get("amount"), 2)
			
# # 			for bin_project_key, values in issue_data.get(item_code, {}).get(warehouse, {}).items():
# # 				dc_to_customer_qty += flt(values.get("qty"), 3)
# # 				dc_to_customer_amount += flt(values.get("amount"), 2)
			
# # 			for bin_project_key, values in other_receipt_data.get(item_code, {}).get(warehouse, {}).items():
# # 				other_receipt_qty += flt(values.get("qty"), 3)
# # 				other_receipt_amount += flt(values.get("amount"), 2)
			
# # 			for bin_project_key, values in other_issue_data.get(item_code, {}).get(warehouse, {}).items():
# # 				other_issue_qty += flt(values.get("qty"), 3)
# # 				other_issue_amount += flt(values.get("amount"), 2)
			
# # 			for bin_project_key, values in wip_factory_in_data.get(item_code, {}).get(warehouse, {}).items():
# # 				wip_factory_qty += flt(values.get("qty"), 3)
# # 				wip_factory_amount += flt(values.get("amount"), 2)
			
# # 			for bin_project_key, values in wip_job_work_data.get(item_code, {}).get(warehouse, {}).items():
# # 				wip_job_work_qty += flt(values.get("qty"), 3)
# # 				wip_job_work_amount += flt(values.get("amount"), 2)
		
# # 		opening_rate = flt(opening_value / opening_qty, 2) if opening_qty != 0 else 0.0
# # 		receipt_rate = flt(receipt_amount / receipt_qty, 2) if receipt_qty != 0 else 0.0
# # 		return_rate = flt(return_amount / return_qty, 2) if return_qty != 0 else 0.0
# # 		dc_to_customer_rate = flt(dc_to_customer_amount / dc_to_customer_qty, 2) if dc_to_customer_qty != 0 else 0.0
# # 		other_receipt_rate = flt(other_receipt_amount / other_receipt_qty, 2) if other_receipt_qty != 0 else 0.0
# # 		other_issue_rate = flt(other_issue_amount / other_issue_qty, 2) if other_issue_qty != 0 else 0.0
# # 		wip_factory_rate = flt(wip_factory_amount / wip_factory_qty, 2) if wip_factory_qty != 0 else 0.0
# # 		wip_job_work_rate = flt(wip_job_work_amount / wip_job_work_qty, 2) if wip_job_work_qty != 0 else 0.0
		
# # 		# Get ACTUAL closing stock from closing_stock (based on qty_after_transaction at to_date)
# # 		closing_qty = 0.0
# # 		closing_value = 0.0
# # 		for item_code in all_items:
# # 			for bin_project_key, values in closing_stock.get(item_code, {}).get(warehouse, {}).items():
# # 				closing_qty += flt(values.get("qty"), 3)
# # 				closing_value += flt(values.get("value"), 2)
		
# # 		closing_rate = flt(closing_value / closing_qty, 2) if closing_qty != 0 else 0.0
		
# # 		if any([opening_qty, opening_value, receipt_qty, receipt_amount, return_qty, return_amount,
# # 			   dc_to_customer_qty, dc_to_customer_amount, other_receipt_qty, other_receipt_amount,
# # 			   other_issue_qty, other_issue_amount, wip_factory_qty, wip_factory_amount,
# # 			   wip_job_work_qty, wip_job_work_amount, closing_qty, closing_value]):
			
# # 			data.append({
# # 				"warehouse": warehouse,
# # 				"opening_qty": opening_qty,
# # 				"opening_rate": opening_rate,
# # 				"opening_value": opening_value,
# # 				"receipt_qty": receipt_qty,
# # 				"receipt_rate": receipt_rate,
# # 				"receipt_amount": receipt_amount,
# # 				"return_qty": return_qty,
# # 				"return_rate": return_rate,
# # 				"return_amount": return_amount,
# # 				"dc_to_customer_qty": dc_to_customer_qty,
# # 				"dc_to_customer_rate": dc_to_customer_rate,
# # 				"dc_to_customer_amount": dc_to_customer_amount,
# # 				"other_receipt_qty": other_receipt_qty,
# # 				"other_receipt_rate": other_receipt_rate,
# # 				"other_receipt_amount": other_receipt_amount,
# # 				"other_issue_qty": other_issue_qty,
# # 				"other_issue_rate": other_issue_rate,
# # 				"other_issue_amount": other_issue_amount,
# # 				"wip_factory_qty": wip_factory_qty,
# # 				"wip_factory_rate": wip_factory_rate,
# # 				"wip_factory_amount": wip_factory_amount,
# # 				"wip_job_work_qty": wip_job_work_qty,
# # 				"wip_job_work_rate": wip_job_work_rate,
# # 				"wip_job_work_amount": wip_job_work_amount,
# # 				"closing_qty": closing_qty,
# # 				"closing_rate": closing_rate,
# # 				"closing_amount": closing_value
# # 			})
	
# # 	return data


# # def prepare_bin_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data, 
# # 						  issue_data, other_receipt_data, other_issue_data, 
# # 						  wip_factory_in_data, wip_job_work_data):
# # 	"""Prepare bin-wise consolidated data - aggregate all items per bin"""
# # 	data = []
	
# # 	# Get all bins
# # 	all_bins = set()
# # 	for item_code in all_items:
# # 		for warehouse in opening_stock.get(item_code, {}):
# # 			for bin_project_key in opening_stock[item_code][warehouse]:
# # 				bin_no = bin_project_key.split("|||")[0]
# # 				if bin_no:
# # 					all_bins.add(bin_no)
	
# # 	for bin_name in sorted(all_bins):
# # 		opening_qty = 0.0
# # 		opening_value = 0.0
# # 		receipt_qty = 0.0
# # 		receipt_amount = 0.0
# # 		return_qty = 0.0
# # 		return_amount = 0.0
# # 		dc_to_customer_qty = 0.0
# # 		dc_to_customer_amount = 0.0
# # 		other_receipt_qty = 0.0
# # 		other_receipt_amount = 0.0
# # 		other_issue_qty = 0.0
# # 		other_issue_amount = 0.0
# # 		wip_factory_qty = 0.0
# # 		wip_factory_amount = 0.0
# # 		wip_job_work_qty = 0.0
# # 		wip_job_work_amount = 0.0
		
# # 		for item_code in all_items:
# # 			for warehouse in opening_stock.get(item_code, {}):
# # 				for bin_project_key, values in opening_stock[item_code].get(warehouse, {}).items():
# # 					if bin_name in bin_project_key:
# # 						opening_qty += flt(values.get("qty"), 3)
# # 						opening_value += flt(values.get("value"), 2)
			
# # 			for warehouse in receipt_data.get(item_code, {}):
# # 				for bin_project_key, values in receipt_data[item_code].get(warehouse, {}).items():
# # 					if bin_name in bin_project_key:
# # 						receipt_qty += flt(values.get("qty"), 3)
# # 						receipt_amount += flt(values.get("amount"), 2)
			
# # 			for warehouse in return_data.get(item_code, {}):
# # 				for bin_project_key, values in return_data[item_code].get(warehouse, {}).items():
# # 					if bin_name in bin_project_key:
# # 						return_qty += flt(values.get("qty"), 3)
# # 						return_amount += flt(values.get("amount"), 2)
			
# # 			for warehouse in issue_data.get(item_code, {}):
# # 				for bin_project_key, values in issue_data[item_code].get(warehouse, {}).items():
# # 					if bin_name in bin_project_key:
# # 						dc_to_customer_qty += flt(values.get("qty"), 3)
# # 						dc_to_customer_amount += flt(values.get("amount"), 2)
			
# # 			for warehouse in other_receipt_data.get(item_code, {}):
# # 				for bin_project_key, values in other_receipt_data[item_code].get(warehouse, {}).items():
# # 					if bin_name in bin_project_key:
# # 						other_receipt_qty += flt(values.get("qty"), 3)
# # 						other_receipt_amount += flt(values.get("amount"), 2)
			
# # 			for warehouse in other_issue_data.get(item_code, {}):
# # 				for bin_project_key, values in other_issue_data[item_code].get(warehouse, {}).items():
# # 					if bin_name in bin_project_key:
# # 						other_issue_qty += flt(values.get("qty"), 3)
# # 						other_issue_amount += flt(values.get("amount"), 2)
			
# # 			for warehouse in wip_factory_in_data.get(item_code, {}):
# # 				for bin_project_key, values in wip_factory_in_data[item_code].get(warehouse, {}).items():
# # 					if bin_name in bin_project_key:
# # 						wip_factory_qty += flt(values.get("qty"), 3)
# # 						wip_factory_amount += flt(values.get("amount"), 2)
			
# # 			for warehouse in wip_job_work_data.get(item_code, {}):
# # 				for bin_project_key, values in wip_job_work_data[item_code].get(warehouse, {}).items():
# # 					if bin_name in bin_project_key:
# # 						wip_job_work_qty += flt(values.get("qty"), 3)
# # 						wip_job_work_amount += flt(values.get("amount"), 2)
		
# # 		opening_rate = flt(opening_value / opening_qty, 2) if opening_qty != 0 else 0.0
# # 		receipt_rate = flt(receipt_amount / receipt_qty, 2) if receipt_qty != 0 else 0.0
# # 		return_rate = flt(return_amount / return_qty, 2) if return_qty != 0 else 0.0
# # 		dc_to_customer_rate = flt(dc_to_customer_amount / dc_to_customer_qty, 2) if dc_to_customer_qty != 0 else 0.0
# # 		other_receipt_rate = flt(other_receipt_amount / other_receipt_qty, 2) if other_receipt_qty != 0 else 0.0
# # 		other_issue_rate = flt(other_issue_amount / other_issue_qty, 2) if other_issue_qty != 0 else 0.0
# # 		wip_factory_rate = flt(wip_factory_amount / wip_factory_qty, 2) if wip_factory_qty != 0 else 0.0
# # 		wip_job_work_rate = flt(wip_job_work_amount / wip_job_work_qty, 2) if wip_job_work_qty != 0 else 0.0
		
# # 		closing_qty = flt(opening_qty + receipt_qty + other_receipt_qty + wip_factory_qty - 
# # 						 return_qty - dc_to_customer_qty - other_issue_qty - wip_job_work_qty, 3)
# # 		closing_amount = flt(opening_value + receipt_amount + other_receipt_amount + wip_factory_amount - 
# # 						   return_amount - dc_to_customer_amount - other_issue_amount - wip_job_work_amount, 2)
# # 		closing_rate = flt(closing_amount / closing_qty, 2) if closing_qty != 0 else 0.0
		
# # 		if any([opening_qty, opening_value, receipt_qty, receipt_amount, return_qty, return_amount,
# # 			   dc_to_customer_qty, dc_to_customer_amount, other_receipt_qty, other_receipt_amount,
# # 			   other_issue_qty, other_issue_amount, wip_factory_qty, wip_factory_amount,
# # 			   wip_job_work_qty, wip_job_work_amount, closing_qty, closing_amount]):
			
# # 			data.append({
# # 				"bin": bin_name,
# # 				"opening_qty": opening_qty,
# # 				"opening_rate": opening_rate,
# # 				"opening_value": opening_value,
# # 				"receipt_qty": receipt_qty,
# # 				"receipt_rate": receipt_rate,
# # 				"receipt_amount": receipt_amount,
# # 				"return_qty": return_qty,
# # 				"return_rate": return_rate,
# # 				"return_amount": return_amount,
# # 				"dc_to_customer_qty": dc_to_customer_qty,
# # 				"dc_to_customer_rate": dc_to_customer_rate,
# # 				"dc_to_customer_amount": dc_to_customer_amount,
# # 				"other_receipt_qty": other_receipt_qty,
# # 				"other_receipt_rate": other_receipt_rate,
# # 				"other_receipt_amount": other_receipt_amount,
# # 				"other_issue_qty": other_issue_qty,
# # 				"other_issue_rate": other_issue_rate,
# # 				"other_issue_amount": other_issue_amount,
# # 				"wip_factory_qty": wip_factory_qty,
# # 				"wip_factory_rate": wip_factory_rate,
# # 				"wip_factory_amount": wip_factory_amount,
# # 				"wip_job_work_qty": wip_job_work_qty,
# # 				"wip_job_work_rate": wip_job_work_rate,
# # 				"wip_job_work_amount": wip_job_work_amount,
# # 				"closing_qty": closing_qty,
# # 				"closing_rate": closing_rate,
# # 				"closing_amount": closing_amount
# # 			})
	
# # 	return data


# # def prepare_project_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data,
# # 							  issue_data, other_receipt_data, other_issue_data, wip_factory_in_data, wip_job_work_data):
# # 	"""Prepare project-wise consolidated data using actual closing stock"""
# # 	data = []
	
# # 	# Get all projects
# # 	all_projects = set()
# # 	for item_code in all_items:
# # 		for warehouse in opening_stock.get(item_code, {}):
# # 			for bin_project_key in opening_stock[item_code][warehouse]:
# # 				project_no = bin_project_key.split("|||")[1]
# # 				if project_no:
# # 					all_projects.add(project_no)
	
# # 	for project in sorted(all_projects):
# # 		opening_qty = 0.0
# # 		opening_value = 0.0
# # 		receipt_qty = 0.0
# # 		receipt_amount = 0.0
# # 		return_qty = 0.0
# # 		return_amount = 0.0
# # 		dc_to_customer_qty = 0.0
# # 		dc_to_customer_amount = 0.0
# # 		other_receipt_qty = 0.0
# # 		other_receipt_amount = 0.0
# # 		other_issue_qty = 0.0
# # 		other_issue_amount = 0.0
# # 		wip_factory_qty = 0.0
# # 		wip_factory_amount = 0.0
# # 		wip_job_work_qty = 0.0
# # 		wip_job_work_amount = 0.0
		
# # 		for item_code in all_items:
# # 			for warehouse in opening_stock.get(item_code, {}):
# # 				for bin_project_key, values in opening_stock[item_code].get(warehouse, {}).items():
# # 					if project in bin_project_key:
# # 						opening_qty += flt(values.get("qty"), 3)
# # 						opening_value += flt(values.get("value"), 2)
			
# # 			for warehouse in receipt_data.get(item_code, {}):
# # 				for bin_project_key, values in receipt_data[item_code].get(warehouse, {}).items():
# # 					if project in bin_project_key:
# # 						receipt_qty += flt(values.get("qty"), 3)
# # 						receipt_amount += flt(values.get("amount"), 2)
			
# # 			for warehouse in return_data.get(item_code, {}):
# # 				for bin_project_key, values in return_data[item_code].get(warehouse, {}).items():
# # 					if project in bin_project_key:
# # 						return_qty += flt(values.get("qty"), 3)
# # 						return_amount += flt(values.get("amount"), 2)
			
# # 			for warehouse in issue_data.get(item_code, {}):
# # 				for bin_project_key, values in issue_data[item_code].get(warehouse, {}).items():
# # 					if project in bin_project_key:
# # 						dc_to_customer_qty += flt(values.get("qty"), 3)
# # 						dc_to_customer_amount += flt(values.get("amount"), 2)
			
# # 			for warehouse in other_receipt_data.get(item_code, {}):
# # 				for bin_project_key, values in other_receipt_data[item_code].get(warehouse, {}).items():
# # 					if project in bin_project_key:
# # 						other_receipt_qty += flt(values.get("qty"), 3)
# # 						other_receipt_amount += flt(values.get("amount"), 2)
			
# # 			for warehouse in other_issue_data.get(item_code, {}):
# # 				for bin_project_key, values in other_issue_data[item_code].get(warehouse, {}).items():
# # 					if project in bin_project_key:
# # 						other_issue_qty += flt(values.get("qty"), 3)
# # 						other_issue_amount += flt(values.get("amount"), 2)
			
# # 			for warehouse in wip_factory_in_data.get(item_code, {}):
# # 				for bin_project_key, values in wip_factory_in_data[item_code].get(warehouse, {}).items():
# # 					if project in bin_project_key:
# # 						wip_factory_qty += flt(values.get("qty"), 3)
# # 						wip_factory_amount += flt(values.get("amount"), 2)
			
# # 			for warehouse in wip_job_work_data.get(item_code, {}):
# # 				for bin_project_key, values in wip_job_work_data[item_code].get(warehouse, {}).items():
# # 					if project in bin_project_key:
# # 						wip_job_work_qty += flt(values.get("qty"), 3)
# # 						wip_job_work_amount += flt(values.get("amount"), 2)
		
# # 		opening_rate = flt(opening_value / opening_qty, 2) if opening_qty != 0 else 0.0
# # 		receipt_rate = flt(receipt_amount / receipt_qty, 2) if receipt_qty != 0 else 0.0
# # 		return_rate = flt(return_amount / return_qty, 2) if return_qty != 0 else 0.0
# # 		dc_to_customer_rate = flt(dc_to_customer_amount / dc_to_customer_qty, 2) if dc_to_customer_qty != 0 else 0.0
# # 		other_receipt_rate = flt(other_receipt_amount / other_receipt_qty, 2) if other_receipt_qty != 0 else 0.0
# # 		other_issue_rate = flt(other_issue_amount / other_issue_qty, 2) if other_issue_qty != 0 else 0.0
# # 		wip_factory_rate = flt(wip_factory_amount / wip_factory_qty, 2) if wip_factory_qty != 0 else 0.0
# # 		wip_job_work_rate = flt(wip_job_work_amount / wip_job_work_qty, 2) if wip_job_work_qty != 0 else 0.0
		
# # 		closing_qty = flt(opening_qty + receipt_qty + other_receipt_qty + wip_factory_qty - 
# # 						 return_qty - dc_to_customer_qty - other_issue_qty - wip_job_work_qty, 3)
# # 		closing_amount = flt(opening_value + receipt_amount + other_receipt_amount + wip_factory_amount - 
# # 						   return_amount - dc_to_customer_amount - other_issue_amount - wip_job_work_amount, 2)
# # 		closing_rate = flt(closing_amount / closing_qty, 2) if closing_qty != 0 else 0.0
		
# # 		if any([opening_qty, opening_value, receipt_qty, receipt_amount, return_qty, return_amount,
# # 			   dc_to_customer_qty, dc_to_customer_amount, other_receipt_qty, other_receipt_amount,
# # 			   other_issue_qty, other_issue_amount, wip_factory_qty, wip_factory_amount,
# # 			   wip_job_work_qty, wip_job_work_amount, closing_qty, closing_amount]):
			
# # 			data.append({
# # 				"project": project,
# # 				"opening_qty": opening_qty,
# # 				"opening_rate": opening_rate,
# # 				"opening_value": opening_value,
# # 				"receipt_qty": receipt_qty,
# # 				"receipt_rate": receipt_rate,
# # 				"receipt_amount": receipt_amount,
# # 				"return_qty": return_qty,
# # 				"return_rate": return_rate,
# # 				"return_amount": return_amount,
# # 				"dc_to_customer_qty": dc_to_customer_qty,
# # 				"dc_to_customer_rate": dc_to_customer_rate,
# # 				"dc_to_customer_amount": dc_to_customer_amount,
# # 				"other_receipt_qty": other_receipt_qty,
# # 				"other_receipt_rate": other_receipt_rate,
# # 				"other_receipt_amount": other_receipt_amount,
# # 				"other_issue_qty": other_issue_qty,
# # 				"other_issue_rate": other_issue_rate,
# # 				"other_issue_amount": other_issue_amount,
# # 				"wip_factory_qty": wip_factory_qty,
# # 				"wip_factory_rate": wip_factory_rate,
# # 				"wip_factory_amount": wip_factory_amount,
# # 				"wip_job_work_qty": wip_job_work_qty,
# # 				"wip_job_work_rate": wip_job_work_rate,
# # 				"wip_job_work_amount": wip_job_work_amount,
# # 				"closing_qty": closing_qty,
# # 				"closing_rate": closing_rate,
# # 				"closing_amount": closing_amount
# # 			})
	
# # 	return data


# # def filter_by_bin_project(data, bin=None, project=None):
# # 	"""Filter data by bin and/or project"""
# # 	filtered = defaultdict(lambda: defaultdict(lambda: {}))
	
# # 	for item_code in data:
# # 		for warehouse in data[item_code]:
# # 			for bin_project_key, values in data[item_code][warehouse].items():
# # 				bin_no = bin_project_key.split("|||")[0]
# # 				project_no = bin_project_key.split("|||")[1]
				
# # 				matches = True
# # 				if bin and bin_no != bin:
# # 					matches = False
# # 				if project and project_no != project:
# # 					matches = False
				
# # 				if matches:
# # 					filtered[item_code][warehouse][bin_project_key] = values
	
# # 	return filtered


# # def get_opening_stock(warehouses, from_date, bin_filter=None, project_filter=None):
# # 	"""
# # 	Calculate opening stock (qty and value) as of JUST BEFORE from_date
# # 	Uses the LAST transaction's qty_after_transaction per item-warehouse ONLY
# # 	Does NOT break down by bin-project (that's just for display)
# # 	This correctly represents total inventory at warehouse level
# # 	"""
# # 	opening_stock = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "value": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# # 	# Get the LAST SLE for each item-warehouse BEFORE from_date
# # 	# The qty_after_transaction IS the total on-hand qty for that item in that warehouse
# # 	sle_data = frappe.db.sql("""
# # 		SELECT 
# # 			item_code,
# # 			warehouse,
# # 			qty_after_transaction as total_qty,
# # 			(qty_after_transaction * valuation_rate) as total_value,
# # 			valuation_rate
# # 		FROM (
# # 			SELECT 
# # 				item_code,
# # 				warehouse,
# # 				qty_after_transaction,
# # 				valuation_rate,
# # 				ROW_NUMBER() OVER (
# # 					PARTITION BY item_code, warehouse
# # 					ORDER BY posting_date DESC, posting_time DESC, name DESC
# # 				) as rn
# # 			FROM `tabStock Ledger Entry`
# # 			WHERE warehouse IN ({warehouses})
# # 				AND posting_date < %s
# # 				AND is_cancelled = 0
# # 				AND docstatus < 2
# # 		) ranked
# # 		WHERE rn = 1
# # 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# # 	list(warehouses) + [from_date], as_dict=1)
	
# # 	for sle in sle_data:
# # 		item_code = sle.item_code
# # 		warehouse = sle.warehouse
		
# # 		# Use a single key for warehouse aggregation
# # 		bin_project_key = "|||"  # Empty bin and project = warehouse total
		
# # 		qty = flt(sle.total_qty)
# # 		value = flt(sle.total_value)
# # 		rate = flt(sle.valuation_rate, 2)
		
# # 		opening_stock[item_code][warehouse][bin_project_key] = {
# # 			"qty": qty,
# # 			"value": value,
# # 			"rate": rate,
# # 			"bin": "",
# # 			"project": ""
# # 		}
	
# # 	return opening_stock


# # def get_closing_stock(warehouses, to_date):
# # 	"""
# # 	Get ACTUAL closing stock (qty and value) as of to_date
# # 	Uses the LAST transaction's qty_after_transaction per item-warehouse ONLY
# # 	Does NOT break down by bin-project (that's just for display)
# # 	This ensures the reported closing qty matches the actual total inventory
# # 	"""
# # 	closing_stock = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "value": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# # 	# Get the LAST SLE for each item-warehouse UP TO to_date
# # 	# The qty_after_transaction IS the exact total on-hand quantity at that warehouse
# # 	sle_data = frappe.db.sql("""
# # 		SELECT 
# # 			item_code,
# # 			warehouse,
# # 			qty_after_transaction as total_qty,
# # 			(qty_after_transaction * valuation_rate) as total_value,
# # 			valuation_rate
# # 		FROM (
# # 			SELECT 
# # 				item_code,
# # 				warehouse,
# # 				qty_after_transaction,
# # 				valuation_rate,
# # 				ROW_NUMBER() OVER (
# # 					PARTITION BY item_code, warehouse
# # 					ORDER BY posting_date DESC, posting_time DESC, name DESC
# # 				) as rn
# # 			FROM `tabStock Ledger Entry`
# # 			WHERE warehouse IN ({warehouses})
# # 				AND posting_date <= %s
# # 				AND is_cancelled = 0
# # 				AND docstatus < 2
# # 		) ranked
# # 		WHERE rn = 1
# # 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# # 	list(warehouses) + [to_date], as_dict=1)
	
# # 	for sle in sle_data:
# # 		item_code = sle.item_code
# # 		warehouse = sle.warehouse
		
# # 		# Use a single key for warehouse aggregation
# # 		bin_project_key = "|||"  # Empty bin and project = warehouse total
		
# # 		qty = flt(sle.total_qty)
# # 		value = flt(sle.total_value)
# # 		rate = flt(sle.valuation_rate, 2)
		
# # 		closing_stock[item_code][warehouse][bin_project_key] = {
# # 			"qty": qty,
# # 			"value": value,
# # 			"rate": rate,
# # 			"bin": "",
# # 			"project": ""
# # 		}
	
# # 	return closing_stock


# # def get_receipt_data(warehouses, from_date, to_date):
# # 	"""
# # 	Get purchase receipt transactions
# # 	Amount = SUM(actual_qty * valuation_rate) for accurate moving average valuation
# # 	"""
# # 	receipt_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# # 	sle_receipts = frappe.db.sql("""
# # 		SELECT 
# # 			sle.item_code,
# # 			sle.warehouse,
# # 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# # 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# # 			SUM(sle.actual_qty) as total_qty,
# # 			SUM(sle.actual_qty * sle.valuation_rate) as total_amount
# # 		FROM `tabStock Ledger Entry` sle
# # 		INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# # 		WHERE sle.warehouse IN ({warehouses})
# # 			AND sle.posting_date >= %s
# # 			AND sle.posting_date <= %s
# # 			AND sle.voucher_type = 'Purchase Receipt'
# # 			AND pr.is_return = 0
# # 			AND sle.actual_qty > 0
# # 			AND sle.is_cancelled = 0
# # 			AND sle.docstatus < 2
# # 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# # 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# # 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# # 	for sle in sle_receipts:
# # 		item_code = sle.item_code
# # 		warehouse = sle.warehouse
# # 		bin_no = sle.get("custom_bin_no") or ""
# # 		project_no = sle.get("custom_project_no") or ""
# # 		bin_project_key = f"{bin_no}|||{project_no}"
		
# # 		qty = flt(sle.total_qty)
# # 		amount = flt(sle.total_amount)
# # 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# # 		receipt_data[item_code][warehouse][bin_project_key] = {
# # 			"qty": qty,
# # 			"amount": amount,
# # 			"rate": rate,
# # 			"bin": bin_no,
# # 			"project": project_no
# # 		}
	
# # 	return receipt_data


# # def get_return_data(warehouses, from_date, to_date):
# # 	"""Get purchase return transactions"""
# # 	return_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# # 	sle_returns = frappe.db.sql("""
# # 		SELECT 
# # 			sle.item_code,
# # 			sle.warehouse,
# # 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# # 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# # 			SUM(ABS(sle.actual_qty)) as total_qty,
# # 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# # 		FROM `tabStock Ledger Entry` sle
# # 		INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# # 		WHERE sle.warehouse IN ({warehouses})
# # 			AND sle.posting_date >= %s
# # 			AND sle.posting_date <= %s
# # 			AND sle.voucher_type = 'Purchase Receipt'
# # 			AND pr.is_return = 1
# # 			AND sle.actual_qty < 0
# # 			AND sle.is_cancelled = 0
# # 			AND sle.docstatus < 2
# # 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# # 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# # 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# # 	for sle in sle_returns:
# # 		item_code = sle.item_code
# # 		warehouse = sle.warehouse
# # 		bin_no = sle.get("custom_bin_no") or ""
# # 		project_no = sle.get("custom_project_no") or ""
# # 		bin_project_key = f"{bin_no}|||{project_no}"
		
# # 		qty = flt(sle.total_qty)
# # 		amount = flt(sle.total_amount)
# # 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# # 		return_data[item_code][warehouse][bin_project_key] = {
# # 			"qty": qty,
# # 			"amount": amount,
# # 			"rate": rate,
# # 			"bin": bin_no,
# # 			"project": project_no
# # 		}
	
# # 	return return_data


# # def get_issue_data(warehouses, from_date, to_date):
# # 	"""Get delivery note (issue) transactions"""
# # 	issue_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# # 	sle_issues = frappe.db.sql("""
# # 		SELECT 
# # 			sle.item_code,
# # 			sle.warehouse,
# # 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# # 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# # 			SUM(ABS(sle.actual_qty)) as total_qty,
# # 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# # 		FROM `tabStock Ledger Entry` sle
# # 		WHERE sle.warehouse IN ({warehouses})
# # 			AND sle.posting_date >= %s
# # 			AND sle.posting_date <= %s
# # 			AND sle.voucher_type = 'Delivery Note'
# # 			AND sle.actual_qty < 0
# # 			AND sle.is_cancelled = 0
# # 			AND sle.docstatus < 2
# # 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# # 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# # 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# # 	for sle in sle_issues:
# # 		item_code = sle.item_code
# # 		warehouse = sle.warehouse
# # 		bin_no = sle.get("custom_bin_no") or ""
# # 		project_no = sle.get("custom_project_no") or ""
# # 		bin_project_key = f"{bin_no}|||{project_no}"
		
# # 		qty = flt(sle.total_qty)
# # 		amount = flt(sle.total_amount)
# # 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# # 		issue_data[item_code][warehouse][bin_project_key] = {
# # 			"qty": qty,
# # 			"amount": amount,
# # 			"rate": rate,
# # 			"bin": bin_no,
# # 			"project": project_no
# # 		}
	
# # 	return issue_data


# # def get_other_receipt_data(warehouses, from_date, to_date):
# # 	"""Get stock entry other receipt (Material Receipt) transactions"""
# # 	other_receipt_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# # 	sle_data = frappe.db.sql("""
# # 		SELECT 
# # 			sle.item_code,
# # 			sle.warehouse,
# # 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# # 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# # 			SUM(sle.actual_qty) as total_qty,
# # 			SUM(sle.actual_qty * sle.valuation_rate) as total_amount
# # 		FROM `tabStock Ledger Entry` sle
# # 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# # 		WHERE sle.warehouse IN ({warehouses})
# # 			AND sle.posting_date >= %s
# # 			AND sle.posting_date <= %s
# # 			AND sle.voucher_type = 'Stock Entry'
# # 			AND se.purpose = 'Material Receipt'
# # 			AND sle.actual_qty > 0
# # 			AND sle.is_cancelled = 0
# # 			AND sle.docstatus < 2
# # 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# # 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# # 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# # 	for sle in sle_data:
# # 		item_code = sle.item_code
# # 		warehouse = sle.warehouse
# # 		bin_no = sle.get("custom_bin_no") or ""
# # 		project_no = sle.get("custom_project_no") or ""
# # 		bin_project_key = f"{bin_no}|||{project_no}"
		
# # 		qty = flt(sle.total_qty)
# # 		amount = flt(sle.total_amount)
# # 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# # 		other_receipt_data[item_code][warehouse][bin_project_key] = {
# # 			"qty": qty,
# # 			"amount": amount,
# # 			"rate": rate,
# # 			"bin": bin_no,
# # 			"project": project_no
# # 		}
	
# # 	return other_receipt_data


# # def get_other_issue_data(warehouses, from_date, to_date):
# # 	"""
# # 	Get stock entry other issue transactions:
# # 	- Send to Subcontractor (SE purpose = Send to Subcontractor, track by SOURCE warehouse where items leave from)
# # 	- Material Transfer out (SE purpose = Material Transfer, track by source warehouse)
# # 	"""
# # 	other_issue_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# # 	# For Send to Subcontractor - use source warehouse (sle.warehouse - where items are sent FROM)
# # 	sle_send_to_sub = frappe.db.sql("""
# # 		SELECT 
# # 			sle.item_code,
# # 			sle.warehouse,
# # 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# # 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# # 			SUM(ABS(sle.actual_qty)) as total_qty,
# # 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# # 		FROM `tabStock Ledger Entry` sle
# # 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# # 		WHERE sle.warehouse IN ({warehouses})
# # 			AND sle.posting_date >= %s
# # 			AND sle.posting_date <= %s
# # 			AND sle.voucher_type = 'Stock Entry'
# # 			AND se.purpose = 'Send to Subcontractor'
# # 			AND sle.actual_qty < 0
# # 			AND sle.is_cancelled = 0
# # 			AND sle.docstatus < 2
# # 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# # 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# # 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# # 	# For Material Transfer out - use source warehouse
# # 	sle_material_transfer = frappe.db.sql("""
# # 		SELECT 
# # 			sle.item_code,
# # 			sle.warehouse,
# # 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# # 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# # 			SUM(ABS(sle.actual_qty)) as total_qty,
# # 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# # 		FROM `tabStock Ledger Entry` sle
# # 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# # 		WHERE sle.warehouse IN ({warehouses})
# # 			AND sle.posting_date >= %s
# # 			AND sle.posting_date <= %s
# # 			AND sle.voucher_type = 'Stock Entry'
# # 			AND se.purpose = 'Material Transfer'
# # 			AND sle.actual_qty < 0
# # 			AND sle.is_cancelled = 0
# # 			AND sle.docstatus < 2
# # 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# # 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# # 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# # 	# Combine both queries
# # 	sle_data = sle_send_to_sub + sle_material_transfer
	
# # 	for sle in sle_data:
# # 		item_code = sle.item_code
# # 		warehouse = sle.warehouse
# # 		bin_no = sle.get("custom_bin_no") or ""
# # 		project_no = sle.get("custom_project_no") or ""
# # 		bin_project_key = f"{bin_no}|||{project_no}"
		
# # 		qty = flt(sle.total_qty)
# # 		amount = flt(sle.total_amount)
# # 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# # 		other_issue_data[item_code][warehouse][bin_project_key] = {
# # 			"qty": qty,
# # 			"amount": amount,
# # 			"rate": rate,
# # 			"bin": bin_no,
# # 			"project": project_no
# # 		}
	
# # 	return other_issue_data


# # def get_material_transfer_data(warehouses, from_date, to_date):
# # 	"""
# # 	Get material transfer data split by purpose:
# # 	- WIP Factory (Material Transfer inbound - positive actual_qty in target warehouse)
# # 	- WIP Job Work (Send to Subcontractor outbound - negative actual_qty in source warehouse)
# # 	"""
# # 	wip_factory_in_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
# # 	wip_job_work_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# # 	# WIP Factory (Material Transfer inbound)
# # 	sle_wip_factory = frappe.db.sql("""
# # 		SELECT 
# # 			sle.item_code,
# # 			sle.warehouse,
# # 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# # 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# # 			SUM(sle.actual_qty) as total_qty,
# # 			SUM(sle.actual_qty * sle.valuation_rate) as total_amount
# # 		FROM `tabStock Ledger Entry` sle
# # 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# # 		WHERE sle.warehouse IN ({warehouses})
# # 			AND sle.posting_date >= %s
# # 			AND sle.posting_date <= %s
# # 			AND sle.voucher_type = 'Stock Entry'
# # 			AND se.purpose = 'Material Transfer'
# # 			AND sle.actual_qty > 0
# # 			AND sle.is_cancelled = 0
# # 			AND sle.docstatus < 2
# # 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# # 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# # 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# # 	for sle in sle_wip_factory:
# # 		item_code = sle.item_code
# # 		warehouse = sle.warehouse
# # 		bin_no = sle.get("custom_bin_no") or ""
# # 		project_no = sle.get("custom_project_no") or ""
# # 		bin_project_key = f"{bin_no}|||{project_no}"
		
# # 		qty = flt(sle.total_qty)
# # 		amount = flt(sle.total_amount)
# # 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# # 		wip_factory_in_data[item_code][warehouse][bin_project_key] = {
# # 			"qty": qty,
# # 			"amount": amount,
# # 			"rate": rate,
# # 			"bin": bin_no,
# # 			"project": project_no
# # 		}
	
# # 	# WIP Job Work (Send to Subcontractor - track by target/supplier warehouse)
# # 	# Use target warehouse (t_warehouse) from Stock Entry Detail so items to different suppliers show separately
# # 	# Items sent to subcontractor are ADDED to subcontractor warehouse, so use positive values
# # 	sle_wip_job_work = frappe.db.sql("""
# # 		SELECT 
# # 			sle.item_code,
# # 			sed.t_warehouse as warehouse,
# # 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# # 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# # 			SUM(ABS(sle.actual_qty)) as total_qty,
# # 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# # 		FROM `tabStock Ledger Entry` sle
# # 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# # 		INNER JOIN `tabStock Entry Detail` sed ON se.name = sed.parent AND sle.item_code = sed.item_code
# # 		WHERE sle.posting_date >= %s
# # 			AND sle.posting_date <= %s
# # 			AND sle.voucher_type = 'Stock Entry'
# # 			AND se.purpose = 'Send to Subcontractor'
# # 			AND sle.actual_qty < 0
# # 			AND sle.is_cancelled = 0
# # 			AND sle.docstatus < 2
# # 		GROUP BY sle.item_code, sed.t_warehouse, sle.custom_bin_no, sle.custom_project_no
# # 	""", [from_date, to_date], as_dict=1)
	
# # 	for sle in sle_wip_job_work:
# # 		item_code = sle.item_code
# # 		warehouse = sle.warehouse
# # 		bin_no = sle.get("custom_bin_no") or ""
# # 		project_no = sle.get("custom_project_no") or ""
# # 		bin_project_key = f"{bin_no}|||{project_no}"
		
# # 		qty = flt(sle.total_qty)
# # 		amount = flt(sle.total_amount)
# # 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# # 		wip_job_work_data[item_code][warehouse][bin_project_key] = {
# # 			"qty": qty,
# # 			"amount": amount,
# # 			"rate": rate,
# # 			"bin": bin_no,
# # 			"project": project_no
# # 		}
	
# # 	return wip_factory_in_data, wip_job_work_data


# # def get_stock_reconciliation_data(warehouses, to_date):
# # 	"""Get stock reconciliation data - latest reconciliation per item-warehouse"""
# # 	recon_data = defaultdict(lambda: defaultdict(lambda: {
# # 		"qty": 0.0,
# # 		"rate": 0.0,
# # 		"amount": 0.0
# # 	}))
	
# # 	data = frappe.db.sql("""
# # 		SELECT DISTINCT
# # 			sle.item_code,
# # 			sle.warehouse,
# # 			sle.qty_after_transaction as qty,
# # 			sle.valuation_rate as rate,
# # 			sle.qty_after_transaction * sle.valuation_rate as amount
# # 		FROM `tabStock Ledger Entry` sle
# # 		WHERE sle.warehouse IN ({warehouses})
# # 			AND sle.posting_date <= %s
# # 			AND sle.voucher_type = 'Stock Reconciliation'
# # 			AND sle.is_cancelled = 0
# # 			AND sle.docstatus < 2
# # 			AND (sle.item_code, sle.warehouse, sle.posting_date) IN (
# # 				SELECT sle2.item_code, sle2.warehouse, MAX(sle2.posting_date)
# # 				FROM `tabStock Ledger Entry` sle2
# # 				WHERE sle2.warehouse IN ({warehouses})
# # 					AND sle2.posting_date <= %s
# # 					AND sle2.voucher_type = 'Stock Reconciliation'
# # 					AND sle2.is_cancelled = 0
# # 					AND sle2.docstatus < 2
# # 				GROUP BY sle2.item_code, sle2.warehouse
# # 			)
# # 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# # 	tuple(warehouses) + (to_date,) + tuple(warehouses) + (to_date,), as_dict=1)
	
# # 	for row in data:
# # 		recon_data[row.item_code][row.warehouse] = {
# # 			"qty": flt(row.qty, 3),
# # 			"rate": flt(row.rate, 2),
# # 			"amount": flt(row.amount, 2)
# # 		}
	
# # 	return recon_data


# # def get_closing_valuation_rate(item_code, warehouse):
# # 	"""Get the latest moving average valuation rate from Stock Ledger Entry"""
# # 	rate = frappe.db.sql("""
# # 		SELECT valuation_rate 
# # 		FROM `tabStock Ledger Entry`
# # 		WHERE item_code = %s 
# # 			AND warehouse = %s 
# # 			AND is_cancelled = 0
# # 			AND docstatus < 2
# # 		ORDER BY posting_date DESC, creation DESC
# # 		LIMIT 1
# # 	""", (item_code, warehouse), as_list=1)
	
# # 	return flt(rate[0][0], 2) if rate else 0.0


# # # ========================= DETAIL FUNCTIONS FOR DRILL-DOWN =========================

# # def get_transaction_details(transaction_type, warehouse, from_date, to_date, include_child=1, show_items=0, bin=None, project=None):
# # 	"""
# # 	Get detailed breakdown of transactions by document and optionally by items
# # 	Transaction types: purchase_cost, purchase_return, issue_cost, other_receipt, other_issue, transfer_in, transfer_out
# # 	"""
# # 	from_date = getdate(from_date)
# # 	to_date = getdate(to_date)
# # 	include_child = int(include_child)
# # 	show_items = int(show_items)
	
# # 	warehouses = get_warehouses(warehouse, include_child)
	
# # 	if not warehouses:
# # 		return []
	
# # 	# Route to appropriate function based on transaction type
# # 	if transaction_type == "purchase_cost":
# # 		return get_purchase_cost_details(warehouses, from_date, to_date, show_items, bin, project)
# # 	elif transaction_type == "purchase_return":
# # 		return get_purchase_return_details(warehouses, from_date, to_date, show_items, bin, project)
# # 	elif transaction_type == "issue_cost":
# # 		return get_issue_cost_details(warehouses, from_date, to_date, show_items, bin, project)
# # 	elif transaction_type == "other_receipt":
# # 		return get_other_receipt_details(warehouses, from_date, to_date, show_items, bin, project)
# # 	elif transaction_type == "other_issue":
# # 		return get_other_issue_details(warehouses, from_date, to_date, show_items, bin, project)
# # 	elif transaction_type == "transfer_in":
# # 		return get_transfer_in_details(warehouses, from_date, to_date, show_items, bin, project)
# # 	elif transaction_type == "transfer_out":
# # 		return get_transfer_out_details(warehouses, from_date, to_date, show_items, bin, project)
# # 	else:
# # 		return []


# # def get_purchase_cost_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# # 	"""Get Purchase Receipt details"""
# # 	bin_condition = ""
# # 	project_condition = ""
# # 	additional_params = []
	
# # 	if bin:
# # 		bin_condition = "AND sle.custom_bin_no = %s"
# # 		additional_params.append(bin)
# # 	if project:
# # 		project_condition = "AND sle.custom_project_no = %s"
# # 		additional_params.append(project)
	
# # 	if show_items:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				pr.supplier,
# # 				sle.item_code,
# # 				i.item_name,
# # 				i.description,
# # 				i.technical_description,
# # 				sle.warehouse,
# # 				sle.actual_qty as qty,
# # 				sle.valuation_rate as rate,
# # 				sle.actual_qty * sle.valuation_rate as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# # 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Purchase Receipt'
# # 				AND pr.is_return = 0
# # 				AND sle.actual_qty > 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# # 	else:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				pr.supplier,
# # 				SUM(sle.actual_qty * sle.valuation_rate) as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Purchase Receipt'
# # 				AND pr.is_return = 0
# # 				AND sle.actual_qty > 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			GROUP BY sle.voucher_no, sle.posting_date, pr.supplier
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# # 	return data


# # def get_purchase_return_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# # 	"""Get Purchase Return details"""
# # 	bin_condition = ""
# # 	project_condition = ""
# # 	additional_params = []
	
# # 	if bin:
# # 		bin_condition = "AND sle.custom_bin_no = %s"
# # 		additional_params.append(bin)
# # 	if project:
# # 		project_condition = "AND sle.custom_project_no = %s"
# # 		additional_params.append(project)
	
# # 	if show_items:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				pr.supplier,
# # 				sle.item_code,
# # 				i.item_name,
# # 				i.description,
# # 				i.technical_description,
# # 				sle.warehouse,
# # 				ABS(sle.actual_qty) as qty,
# # 				sle.valuation_rate as rate,
# # 				ABS(sle.actual_qty) * sle.valuation_rate as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# # 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Purchase Receipt'
# # 				AND pr.is_return = 1
# # 				AND sle.actual_qty < 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# # 	else:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				pr.supplier,
# # 				SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Purchase Receipt'
# # 				AND pr.is_return = 1
# # 				AND sle.actual_qty < 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			GROUP BY sle.voucher_no, sle.posting_date, pr.supplier
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# # 	return data


# # def get_issue_cost_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# # 	"""Get Delivery Note (Issue/DC to Customer) details"""
# # 	bin_condition = ""
# # 	project_condition = ""
# # 	additional_params = []
	
# # 	if bin:
# # 		bin_condition = "AND sle.custom_bin_no = %s"
# # 		additional_params.append(bin)
# # 	if project:
# # 		project_condition = "AND sle.custom_project_no = %s"
# # 		additional_params.append(project)
	
# # 	if show_items:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				dn.customer,
# # 				sle.item_code,
# # 				i.item_name,
# # 				i.description,
# # 				i.technical_description,
# # 				sle.warehouse,
# # 				ABS(sle.actual_qty) as qty,
# # 				sle.valuation_rate as rate,
# # 				ABS(sle.actual_qty) * sle.valuation_rate as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabDelivery Note` dn ON sle.voucher_no = dn.name
# # 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Delivery Note'
# # 				AND sle.actual_qty < 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# # 	else:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				dn.customer,
# # 				SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabDelivery Note` dn ON sle.voucher_no = dn.name
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Delivery Note'
# # 				AND sle.actual_qty < 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			GROUP BY sle.voucher_no, sle.posting_date, dn.customer
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# # 	return data


# # def get_other_receipt_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# # 	"""Get Stock Entry Material Receipt details"""
# # 	bin_condition = ""
# # 	project_condition = ""
# # 	additional_params = []
	
# # 	if bin:
# # 		bin_condition = "AND sle.custom_bin_no = %s"
# # 		additional_params.append(bin)
# # 	if project:
# # 		project_condition = "AND sle.custom_project_no = %s"
# # 		additional_params.append(project)
	
# # 	if show_items:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				se.purpose,
# # 				sle.item_code,
# # 				i.item_name,
# # 				i.description,
# # 				i.technical_description,
# # 				sle.warehouse,
# # 				sle.actual_qty as qty,
# # 				sle.valuation_rate as rate,
# # 				sle.actual_qty * sle.valuation_rate as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# # 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Stock Entry'
# # 				AND se.purpose = 'Material Receipt'
# # 				AND sle.actual_qty > 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# # 	else:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				se.purpose,
# # 				SUM(sle.actual_qty * sle.valuation_rate) as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Stock Entry'
# # 				AND se.purpose = 'Material Receipt'
# # 				AND sle.actual_qty > 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			GROUP BY sle.voucher_no, sle.posting_date, se.purpose
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# # 	return data


# # def get_other_issue_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# # 	"""Get Stock Entry other issue details (Send to Subcontractor, Material Transfer out)"""
# # 	bin_condition = ""
# # 	project_condition = ""
# # 	additional_params = []
	
# # 	if bin:
# # 		bin_condition = "AND sle.custom_bin_no = %s"
# # 		additional_params.append(bin)
# # 	if project:
# # 		project_condition = "AND sle.custom_project_no = %s"
# # 		additional_params.append(project)
	
# # 	if show_items:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				se.purpose,
# # 				sle.item_code,
# # 				i.item_name,
# # 				i.description,
# # 				i.technical_description,
# # 				sle.warehouse,
# # 				ABS(sle.actual_qty) as qty,
# # 				sle.valuation_rate as rate,
# # 				ABS(sle.actual_qty) * sle.valuation_rate as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# # 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Stock Entry'
# # 				AND (se.purpose = 'Send to Subcontractor' OR se.purpose = 'Material Transfer')
# # 				AND sle.actual_qty < 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# # 	else:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				se.purpose,
# # 				SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Stock Entry'
# # 				AND (se.purpose = 'Send to Subcontractor' OR se.purpose = 'Material Transfer')
# # 				AND sle.actual_qty < 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			GROUP BY sle.voucher_no, sle.posting_date, se.purpose
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# # 	return data


# # def get_transfer_in_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# # 	"""Get Material Transfer IN (WIP Factory) details"""
# # 	bin_condition = ""
# # 	project_condition = ""
# # 	additional_params = []
	
# # 	if bin:
# # 		bin_condition = "AND sle.custom_bin_no = %s"
# # 		additional_params.append(bin)
# # 	if project:
# # 		project_condition = "AND sle.custom_project_no = %s"
# # 		additional_params.append(project)
	
# # 	if show_items:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				se.purpose,
# # 				sle.item_code,
# # 				i.item_name,
# # 				i.description,
# # 				i.technical_description,
# # 				sle.warehouse,
# # 				sle.actual_qty as qty,
# # 				sle.valuation_rate as rate,
# # 				sle.actual_qty * sle.valuation_rate as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# # 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Stock Entry'
# # 				AND se.purpose = 'Material Transfer'
# # 				AND sle.actual_qty > 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# # 	else:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				se.purpose,
# # 				SUM(sle.actual_qty * sle.valuation_rate) as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Stock Entry'
# # 				AND se.purpose = 'Material Transfer'
# # 				AND sle.actual_qty > 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			GROUP BY sle.voucher_no, sle.posting_date, se.purpose
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# # 	return data


# # def get_transfer_out_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# # 	"""Get Material Transfer OUT (WIP Job Work) details"""
# # 	bin_condition = ""
# # 	project_condition = ""
# # 	additional_params = []
	
# # 	if bin:
# # 		bin_condition = "AND sle.custom_bin_no = %s"
# # 		additional_params.append(bin)
# # 	if project:
# # 		project_condition = "AND sle.custom_project_no = %s"
# # 		additional_params.append(project)
	
# # 	if show_items:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				se.purpose,
# # 				sle.item_code,
# # 				i.item_name,
# # 				i.description,
# # 				i.technical_description,
# # 				sle.warehouse,
# # 				ABS(sle.actual_qty) as qty,
# # 				sle.valuation_rate as rate,
# # 				ABS(sle.actual_qty) * sle.valuation_rate as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# # 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Stock Entry'
# # 				AND se.purpose = 'Send to Subcontractor'
# # 				AND sle.actual_qty < 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# # 	else:
# # 		data = frappe.db.sql("""
# # 			SELECT 
# # 				sle.voucher_no as document_name,
# # 				sle.posting_date,
# # 				se.purpose,
# # 				SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount
# # 			FROM `tabStock Ledger Entry` sle
# # 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# # 			WHERE sle.warehouse IN ({warehouses})
# # 				AND sle.posting_date >= %s
# # 				AND sle.posting_date <= %s
# # 				AND sle.voucher_type = 'Stock Entry'
# # 				AND se.purpose = 'Send to Subcontractor'
# # 				AND sle.actual_qty < 0
# # 				AND sle.is_cancelled = 0
# # 				AND sle.docstatus < 2
# # 				{bin_condition}
# # 				{project_condition}
# # 			GROUP BY sle.voucher_no, sle.posting_date, se.purpose
# # 			ORDER BY sle.posting_date DESC, sle.voucher_no
# # 		""".format(
# # 			warehouses=', '.join(['%s'] * len(warehouses)),
# # 			bin_condition=bin_condition,
# # 			project_condition=project_condition
# # 		), 
# # 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# # 	return data

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
# 	"""Define report columns"""
	
# 	columns = [
# 		{
# 			"fieldname": "project",
# 			"label": _("Project"),
# 			"fieldtype": "Link",
# 			"options": "Project",
# 			"width": 150
# 		},
# 		{
# 			"fieldname": "project_name",
# 			"label": _("Project Name"),
# 			"fieldtype": "Data",
# 			"width": 200
# 		},
# 		{
# 			"fieldname": "closing_qty",
# 			"label": _("Closing Qty"),
# 			"fieldtype": "Float",
# 			"width": 120
# 		},
# 		{
# 			"fieldname": "closing_amount",
# 			"label": _("Closing Amount"),
# 			"fieldtype": "Currency",
# 			"width": 150
# 		}
# 	]
	
# 	return columns


# def get_data(filters):
# 	"""Get opening stock data for items in the warehouse"""
# 	warehouse = filters.get("warehouse")
# 	from_date = getdate(filters.get("from_date"))
# 	to_date = getdate(filters.get("to_date"))
# 	include_child = 1  # Always include child warehouses
	
# 	warehouses = get_warehouses(warehouse, include_child)
# 	if not warehouses:
# 		return []
	
# 	# Get item details (item_code, item_group, description, etc.)
# 	all_items = get_all_items(warehouses, from_date, to_date)
# 	item_details = get_item_details(all_items)
	
# 	# Get all stock transactions for the period
# 	opening_stock = get_opening_stock(warehouses, from_date)
# 	closing_stock = get_closing_stock(warehouses, to_date)
# 	receipt_data = get_receipt_data(warehouses, from_date, to_date)
# 	return_data = get_return_data(warehouses, from_date, to_date)
# 	issue_data = get_issue_data(warehouses, from_date, to_date)
# 	other_receipt_data = get_other_receipt_data(warehouses, from_date, to_date)
# 	other_issue_data = get_other_issue_data(warehouses, from_date, to_date)
# 	wip_factory_in_data, wip_job_work_data = get_material_transfer_data(warehouses, from_date, to_date)
	
# 	# Always prepare project-wise data
# 	return prepare_project_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data,
# 									issue_data, other_receipt_data, other_issue_data, wip_factory_in_data, wip_job_work_data)


# def get_warehouses(warehouse, include_child):
# 	"""Get list of warehouses including children if requested"""
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


# def get_bins_and_projects_for_item_warehouse(item_code, warehouse, from_date, to_date):
# 	"""
# 	Get all distinct bins and projects used for an item in a warehouse during the period
# 	Used for display purposes (comma-separated lists)
# 	"""
# 	bins_set = set()
# 	projects_set = set()
	
# 	# Query all transactions for this item-warehouse combo in the period (including before and after)
# 	# to get all bins and projects ever used
# 	sle_data = frappe.db.sql("""
# 		SELECT DISTINCT
# 			COALESCE(custom_bin_no, '') as custom_bin_no,
# 			COALESCE(custom_project_no, '') as custom_project_no
# 		FROM `tabStock Ledger Entry`
# 		WHERE item_code = %s
# 			AND warehouse = %s
# 			AND is_cancelled = 0
# 			AND docstatus < 2
# 	""", (item_code, warehouse), as_dict=1)
	
# 	for sle in sle_data:
# 		bin_no = sle.get("custom_bin_no") or ""
# 		project_no = sle.get("custom_project_no") or ""
# 		if bin_no:
# 			bins_set.add(bin_no)
# 		if project_no:
# 			projects_set.add(project_no)
	
# 	return sorted(bins_set), sorted(projects_set)


# def get_all_items(warehouses, from_date, to_date):
# 	"""Get all items that either:
# 	1. Have stock transactions in the period, OR
# 	2. Have actual closing stock (inventory) as of to_date
# 	This ensures items with stock show every month until stock is 0"""
# 	params = list(warehouses) + [from_date, to_date]
	
# 	# Get items with transactions in the period
# 	transaction_items = frappe.db.sql(f"""
# 		SELECT DISTINCT sle.item_code
# 		FROM `tabStock Ledger Entry` sle
# 		WHERE sle.warehouse IN ({','.join(['%s'] * len(warehouses))})
# 			AND sle.posting_date >= %s
# 			AND sle.posting_date <= %s
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 		ORDER BY sle.item_code
# 	""", params, as_list=1)
	
# 	# Get items with closing stock (actual inventory) as of to_date
# 	stock_items = frappe.db.sql(f"""
# 		SELECT DISTINCT sle.item_code
# 		FROM `tabStock Ledger Entry` sle
# 		WHERE sle.warehouse IN ({','.join(['%s'] * len(warehouses))})
# 			AND sle.posting_date <= %s
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 			AND sle.qty_after_transaction > 0
# 		ORDER BY sle.item_code
# 	""", list(warehouses) + [to_date], as_list=1)
	
# 	# Combine both lists and remove duplicates
# 	all_items = list(set([item[0] for item in transaction_items] + [item[0] for item in stock_items]))
	
# 	return sorted(all_items)


# def get_item_details(item_codes):
# 	"""Get item master details (name, group, description, etc.)"""
# 	item_details = {}
	
# 	if not item_codes:
# 		return item_details
	
# 	items = frappe.db.sql("""
# 		SELECT name, item_group, description, item_name, technical_description
# 		FROM `tabItem`
# 		WHERE name IN ({})
# 	""".format(','.join(['%s'] * len(item_codes))), 
# 	item_codes, as_dict=1)
	
# 	for item in items:
# 		item_details[item.name] = {
# 			"item_name": item.item_name or "",
# 			"item_group": item.item_group or "",
# 			"description": item.description or "",
# 			"technical_description": item.technical_description or ""
# 		}
	
# 	return item_details


# def prepare_item_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data, 
# 							issue_data, other_receipt_data, other_issue_data, 
# 							wip_factory_in_data, wip_job_work_data, stock_recon_data=None, 
# 							from_date=None, to_date=None):
# 	"""
# 	Prepare default item-wise data with bin and project details
# 	Uses ACTUAL closing stock from Stock Ledger Entry qty_after_transaction
# 	"""
# 	data = []
	
# 	for item_code in sorted(all_items):
# 		# Get all warehouses for this item from opening stock
# 		warehouses_for_item = set()
# 		if item_code in opening_stock:
# 			warehouses_for_item.update(opening_stock[item_code].keys())
# 		if item_code in closing_stock:
# 			warehouses_for_item.update(closing_stock[item_code].keys())
# 		if item_code in receipt_data:
# 			warehouses_for_item.update(receipt_data[item_code].keys())
# 		if item_code in return_data:
# 			warehouses_for_item.update(return_data[item_code].keys())
# 		if item_code in issue_data:
# 			warehouses_for_item.update(issue_data[item_code].keys())
# 		if item_code in other_receipt_data:
# 			warehouses_for_item.update(other_receipt_data[item_code].keys())
# 		if item_code in other_issue_data:
# 			warehouses_for_item.update(other_issue_data[item_code].keys())
# 		if item_code in wip_factory_in_data:
# 			warehouses_for_item.update(wip_factory_in_data[item_code].keys())
# 		if item_code in wip_job_work_data:
# 			warehouses_for_item.update(wip_job_work_data[item_code].keys())
		
# 		for warehouse in sorted(warehouses_for_item):
# 			# Aggregate all bin-project combinations for opening stock
# 			opening_qty = 0.0
# 			opening_value = 0.0
			
# 			for bin_project_key, values in opening_stock.get(item_code, {}).get(warehouse, {}).items():
# 				opening_qty += flt(values.get("qty"), 3)
# 				opening_value += flt(values.get("value"), 2)
			
# 			# Keep actual value (don't force abs() here - we need real opening to calculate closing correctly)
# 			# e.g., if opening was negative, closing formula must account for it
# 			opening_qty = flt(opening_qty, 3)
# 			opening_value = flt(opening_value, 2)
# 			# Opening rate = opening_value / opening_qty (always positive now)
# 			opening_rate = flt(opening_value / opening_qty, 2) if opening_qty != 0 else 0.0
			
# 			# Receipt data - use valuation rate from Stock Ledger Entry
# 			receipt_qty = 0.0
# 			receipt_amount = 0.0
# 			for bin_project_key, values in receipt_data.get(item_code, {}).get(warehouse, {}).items():
# 				receipt_qty += flt(values.get("qty"), 3)
# 				receipt_amount += flt(values.get("amount"), 2)
# 			receipt_rate = flt(receipt_amount / receipt_qty, 2) if receipt_qty != 0 else 0.0
			
# 			# Return data
# 			return_qty = 0.0
# 			return_amount = 0.0
# 			for bin_project_key, values in return_data.get(item_code, {}).get(warehouse, {}).items():
# 				return_qty += flt(values.get("qty"), 3)
# 				return_amount += flt(values.get("amount"), 2)
# 			return_rate = flt(return_amount / return_qty, 2) if return_qty != 0 else 0.0
			
# 			# DC to Customer (Issue) data
# 			dc_to_customer_qty = 0.0
# 			dc_to_customer_amount = 0.0
# 			for bin_project_key, values in issue_data.get(item_code, {}).get(warehouse, {}).items():
# 				dc_to_customer_qty += flt(values.get("qty"), 3)
# 				dc_to_customer_amount += flt(values.get("amount"), 2)
# 			dc_to_customer_rate = flt(dc_to_customer_amount / dc_to_customer_qty, 2) if dc_to_customer_qty != 0 else 0.0
			
# 			# Other Receipt data
# 			other_receipt_qty = 0.0
# 			other_receipt_amount = 0.0
# 			for bin_project_key, values in other_receipt_data.get(item_code, {}).get(warehouse, {}).items():
# 				other_receipt_qty += flt(values.get("qty"), 3)
# 				other_receipt_amount += flt(values.get("amount"), 2)
# 			other_receipt_rate = flt(other_receipt_amount / other_receipt_qty, 2) if other_receipt_qty != 0 else 0.0
			
# 			# Other Issue data
# 			other_issue_qty = 0.0
# 			other_issue_amount = 0.0
# 			for bin_project_key, values in other_issue_data.get(item_code, {}).get(warehouse, {}).items():
# 				other_issue_qty += flt(values.get("qty"), 3)
# 				other_issue_amount += flt(values.get("amount"), 2)
# 			other_issue_rate = flt(other_issue_amount / other_issue_qty, 2) if other_issue_qty != 0 else 0.0
			
# 			# WIP Factory (Material Transfer In) data
# 			wip_factory_qty = 0.0
# 			wip_factory_amount = 0.0
# 			for bin_project_key, values in wip_factory_in_data.get(item_code, {}).get(warehouse, {}).items():
# 				wip_factory_qty += flt(values.get("qty"), 3)
# 				wip_factory_amount += flt(values.get("amount"), 2)
# 			wip_factory_rate = flt(wip_factory_amount / wip_factory_qty, 2) if wip_factory_qty != 0 else 0.0
			
# 			# WIP Job Work (Send to Subcontractor) data
# 			wip_job_work_qty = 0.0
# 			wip_job_work_amount = 0.0
# 			for bin_project_key, values in wip_job_work_data.get(item_code, {}).get(warehouse, {}).items():
# 				wip_job_work_qty += flt(values.get("qty"), 3)
# 				wip_job_work_amount += flt(values.get("amount"), 2)
# 			wip_job_work_rate = flt(wip_job_work_amount / wip_job_work_qty, 2) if wip_job_work_qty != 0 else 0.0
			
# 			# CORRECT closing stock CALCULATION: Opening + All Period Transactions = Closing
# 			# This ensures math always works: Opening + Receipts - Issues = Closing
			
# 			# Get closing stock from database
# 			closing_qty_db = 0.0
# 			closing_value_db = 0.0
			
# 			for bin_project_key, values in closing_stock.get(item_code, {}).get(warehouse, {}).items():
# 				closing_qty_db += flt(values.get("qty"), 3)
# 				closing_value_db += flt(values.get("value"), 2)
			
# 			# Use ACTUAL closing qty from database (this is the real on-hand inventory)
# 			closing_qty = closing_qty_db
# 			closing_value = closing_value_db
# 			closing_rate = flt(closing_value / closing_qty, 2) if closing_qty != 0 else 0.0
# 			closing_amount = flt(max(closing_value, 0), 2)
			
# 			# Only show rows with non-zero values
# 			if any([opening_qty, opening_value, receipt_qty, receipt_amount, return_qty, return_amount,
# 				   dc_to_customer_qty, dc_to_customer_amount, other_receipt_qty, other_receipt_amount,
# 				   other_issue_qty, other_issue_amount, wip_factory_qty, wip_factory_amount,
# 				   wip_job_work_qty, wip_job_work_amount, closing_qty, closing_amount]):
				
# 				# Get item info BEFORE using it
# 				item_info = item_details.get(item_code, {})
				
# 				# Ensure all amounts show as 0 if negative (not negative values)
# 				opening_value_display = flt(max(opening_value, 0), 2)
# 				receipt_amount_display = flt(max(receipt_amount, 0), 2)
# 				return_amount_display = flt(max(return_amount, 0), 2)
# 				dc_to_customer_amount_display = flt(max(dc_to_customer_amount, 0), 2)
# 				other_receipt_amount_display = flt(max(other_receipt_amount, 0), 2)
# 				other_issue_amount_display = flt(max(other_issue_amount, 0), 2)
# 				wip_factory_amount_display = flt(max(wip_factory_amount, 0), 2)
# 				wip_job_work_amount_display = flt(max(wip_job_work_amount, 0), 2)
# 				closing_amount_display = flt(max(closing_amount, 0), 2)
				
# 				# Get distinct bins and projects for this item-warehouse from database
# 				bins_list, projects_list = get_bins_and_projects_for_item_warehouse(
# 					item_code, warehouse, from_date, to_date
# 				)
				
# 				data.append({
# 						"item_code": item_code,
# 						"item_name": item_info.get("item_name", ""),
# 						"item_group": item_info.get("item_group", ""),
# 						"description": item_info.get("description", ""),
# 						"technical_description": item_info.get("technical_description", ""),
# 						"warehouse": warehouse,
# 						"bin_location": ", ".join(bins_list) if bins_list else "",
# 						"project_list": ", ".join(projects_list) if projects_list else "",
# 						"opening_qty": opening_qty,
# 						"opening_rate": opening_rate,
# 						"opening_value": opening_value_display,
# 						"receipt_qty": receipt_qty,
# 						"receipt_rate": receipt_rate,
# 						"receipt_amount": receipt_amount_display,
# 						"return_qty": return_qty,
# 						"return_rate": return_rate,
# 						"return_amount": return_amount_display,
# 						"dc_to_customer_qty": dc_to_customer_qty,
# 						"dc_to_customer_rate": dc_to_customer_rate,
# 						"dc_to_customer_amount": dc_to_customer_amount_display,
# 						"other_receipt_qty": other_receipt_qty,
# 						"other_receipt_rate": other_receipt_rate,
# 						"other_receipt_amount": other_receipt_amount_display,
# 						"other_issue_qty": other_issue_qty,
# 						"other_issue_rate": other_issue_rate,
# 						"other_issue_amount": other_issue_amount_display,
# 						"wip_factory_qty": wip_factory_qty,
# 						"wip_factory_rate": wip_factory_rate,
# 						"wip_factory_amount": wip_factory_amount_display,
# 						"wip_job_work_qty": wip_job_work_qty,
# 						"wip_job_work_rate": wip_job_work_rate,
# 						"wip_job_work_amount": wip_job_work_amount_display,
# 					"closing_qty": flt(max(closing_qty, 0), 3),
# 					"closing_rate": closing_rate,
# 					"closing_amount": closing_amount_display
# 				})
	
# 	return data


# def prepare_warehouse_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data,
# 								issue_data, other_receipt_data, other_issue_data, wip_factory_in_data, wip_job_work_data):
# 	"""Prepare warehouse-wise consolidated data using actual closing stock"""
# 	data = []
	
# 	# Get all warehouses
# 	all_warehouses = set()
# 	for item_code in all_items:
# 		if item_code in opening_stock:
# 			all_warehouses.update(opening_stock[item_code].keys())
# 		if item_code in closing_stock:
# 			all_warehouses.update(closing_stock[item_code].keys())
	
# 	for warehouse in sorted(all_warehouses):
# 		opening_qty = 0.0
# 		opening_value = 0.0
# 		receipt_qty = 0.0
# 		receipt_amount = 0.0
# 		return_qty = 0.0
# 		return_amount = 0.0
# 		dc_to_customer_qty = 0.0
# 		dc_to_customer_amount = 0.0
# 		other_receipt_qty = 0.0
# 		other_receipt_amount = 0.0
# 		other_issue_qty = 0.0
# 		other_issue_amount = 0.0
# 		wip_factory_qty = 0.0
# 		wip_factory_amount = 0.0
# 		wip_job_work_qty = 0.0
# 		wip_job_work_amount = 0.0
		
# 		for item_code in all_items:
# 			for bin_project_key, values in opening_stock.get(item_code, {}).get(warehouse, {}).items():
# 				opening_qty += flt(values.get("qty"), 3)
# 				opening_value += flt(values.get("value"), 2)
			
# 			for bin_project_key, values in receipt_data.get(item_code, {}).get(warehouse, {}).items():
# 				receipt_qty += flt(values.get("qty"), 3)
# 				receipt_amount += flt(values.get("amount"), 2)
			
# 			for bin_project_key, values in return_data.get(item_code, {}).get(warehouse, {}).items():
# 				return_qty += flt(values.get("qty"), 3)
# 				return_amount += flt(values.get("amount"), 2)
			
# 			for bin_project_key, values in issue_data.get(item_code, {}).get(warehouse, {}).items():
# 				dc_to_customer_qty += flt(values.get("qty"), 3)
# 				dc_to_customer_amount += flt(values.get("amount"), 2)
			
# 			for bin_project_key, values in other_receipt_data.get(item_code, {}).get(warehouse, {}).items():
# 				other_receipt_qty += flt(values.get("qty"), 3)
# 				other_receipt_amount += flt(values.get("amount"), 2)
			
# 			for bin_project_key, values in other_issue_data.get(item_code, {}).get(warehouse, {}).items():
# 				other_issue_qty += flt(values.get("qty"), 3)
# 				other_issue_amount += flt(values.get("amount"), 2)
			
# 			for bin_project_key, values in wip_factory_in_data.get(item_code, {}).get(warehouse, {}).items():
# 				wip_factory_qty += flt(values.get("qty"), 3)
# 				wip_factory_amount += flt(values.get("amount"), 2)
			
# 			for bin_project_key, values in wip_job_work_data.get(item_code, {}).get(warehouse, {}).items():
# 				wip_job_work_qty += flt(values.get("qty"), 3)
# 				wip_job_work_amount += flt(values.get("amount"), 2)
		
# 		opening_rate = flt(opening_value / opening_qty, 2) if opening_qty != 0 else 0.0
# 		receipt_rate = flt(receipt_amount / receipt_qty, 2) if receipt_qty != 0 else 0.0
# 		return_rate = flt(return_amount / return_qty, 2) if return_qty != 0 else 0.0
# 		dc_to_customer_rate = flt(dc_to_customer_amount / dc_to_customer_qty, 2) if dc_to_customer_qty != 0 else 0.0
# 		other_receipt_rate = flt(other_receipt_amount / other_receipt_qty, 2) if other_receipt_qty != 0 else 0.0
# 		other_issue_rate = flt(other_issue_amount / other_issue_qty, 2) if other_issue_qty != 0 else 0.0
# 		wip_factory_rate = flt(wip_factory_amount / wip_factory_qty, 2) if wip_factory_qty != 0 else 0.0
# 		wip_job_work_rate = flt(wip_job_work_amount / wip_job_work_qty, 2) if wip_job_work_qty != 0 else 0.0
		
# 		# Get ACTUAL closing stock from closing_stock (based on qty_after_transaction at to_date)
# 		closing_qty = 0.0
# 		closing_value = 0.0
# 		for item_code in all_items:
# 			for bin_project_key, values in closing_stock.get(item_code, {}).get(warehouse, {}).items():
# 				closing_qty += flt(values.get("qty"), 3)
# 				closing_value += flt(values.get("value"), 2)
		
# 		closing_rate = flt(closing_value / closing_qty, 2) if closing_qty != 0 else 0.0
		
# 		if any([opening_qty, opening_value, receipt_qty, receipt_amount, return_qty, return_amount,
# 			   dc_to_customer_qty, dc_to_customer_amount, other_receipt_qty, other_receipt_amount,
# 			   other_issue_qty, other_issue_amount, wip_factory_qty, wip_factory_amount,
# 			   wip_job_work_qty, wip_job_work_amount, closing_qty, closing_value]):
			
# 			data.append({
# 				"warehouse": warehouse,
# 				"opening_qty": opening_qty,
# 				"opening_rate": opening_rate,
# 				"opening_value": opening_value,
# 				"receipt_qty": receipt_qty,
# 				"receipt_rate": receipt_rate,
# 				"receipt_amount": receipt_amount,
# 				"return_qty": return_qty,
# 				"return_rate": return_rate,
# 				"return_amount": return_amount,
# 				"dc_to_customer_qty": dc_to_customer_qty,
# 				"dc_to_customer_rate": dc_to_customer_rate,
# 				"dc_to_customer_amount": dc_to_customer_amount,
# 				"other_receipt_qty": other_receipt_qty,
# 				"other_receipt_rate": other_receipt_rate,
# 				"other_receipt_amount": other_receipt_amount,
# 				"other_issue_qty": other_issue_qty,
# 				"other_issue_rate": other_issue_rate,
# 				"other_issue_amount": other_issue_amount,
# 				"wip_factory_qty": wip_factory_qty,
# 				"wip_factory_rate": wip_factory_rate,
# 				"wip_factory_amount": wip_factory_amount,
# 				"wip_job_work_qty": wip_job_work_qty,
# 				"wip_job_work_rate": wip_job_work_rate,
# 				"wip_job_work_amount": wip_job_work_amount,
# 				"closing_qty": closing_qty,
# 				"closing_rate": closing_rate,
# 				"closing_amount": closing_value
# 			})
	
# 	return data


# def prepare_bin_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data, 
# 						  issue_data, other_receipt_data, other_issue_data, 
# 						  wip_factory_in_data, wip_job_work_data):
# 	"""Prepare bin-wise consolidated data - aggregate all items per bin"""
# 	data = []
	
# 	# Get all bins
# 	all_bins = set()
# 	for item_code in all_items:
# 		for warehouse in opening_stock.get(item_code, {}):
# 			for bin_project_key in opening_stock[item_code][warehouse]:
# 				bin_no = bin_project_key.split("|||")[0]
# 				if bin_no:
# 					all_bins.add(bin_no)
	
# 	for bin_name in sorted(all_bins):
# 		opening_qty = 0.0
# 		opening_value = 0.0
# 		receipt_qty = 0.0
# 		receipt_amount = 0.0
# 		return_qty = 0.0
# 		return_amount = 0.0
# 		dc_to_customer_qty = 0.0
# 		dc_to_customer_amount = 0.0
# 		other_receipt_qty = 0.0
# 		other_receipt_amount = 0.0
# 		other_issue_qty = 0.0
# 		other_issue_amount = 0.0
# 		wip_factory_qty = 0.0
# 		wip_factory_amount = 0.0
# 		wip_job_work_qty = 0.0
# 		wip_job_work_amount = 0.0
		
# 		for item_code in all_items:
# 			for warehouse in opening_stock.get(item_code, {}):
# 				for bin_project_key, values in opening_stock[item_code].get(warehouse, {}).items():
# 					if bin_name in bin_project_key:
# 						opening_qty += flt(values.get("qty"), 3)
# 						opening_value += flt(values.get("value"), 2)
			
# 			for warehouse in receipt_data.get(item_code, {}):
# 				for bin_project_key, values in receipt_data[item_code].get(warehouse, {}).items():
# 					if bin_name in bin_project_key:
# 						receipt_qty += flt(values.get("qty"), 3)
# 						receipt_amount += flt(values.get("amount"), 2)
			
# 			for warehouse in return_data.get(item_code, {}):
# 				for bin_project_key, values in return_data[item_code].get(warehouse, {}).items():
# 					if bin_name in bin_project_key:
# 						return_qty += flt(values.get("qty"), 3)
# 						return_amount += flt(values.get("amount"), 2)
			
# 			for warehouse in issue_data.get(item_code, {}):
# 				for bin_project_key, values in issue_data[item_code].get(warehouse, {}).items():
# 					if bin_name in bin_project_key:
# 						dc_to_customer_qty += flt(values.get("qty"), 3)
# 						dc_to_customer_amount += flt(values.get("amount"), 2)
			
# 			for warehouse in other_receipt_data.get(item_code, {}):
# 				for bin_project_key, values in other_receipt_data[item_code].get(warehouse, {}).items():
# 					if bin_name in bin_project_key:
# 						other_receipt_qty += flt(values.get("qty"), 3)
# 						other_receipt_amount += flt(values.get("amount"), 2)
			
# 			for warehouse in other_issue_data.get(item_code, {}):
# 				for bin_project_key, values in other_issue_data[item_code].get(warehouse, {}).items():
# 					if bin_name in bin_project_key:
# 						other_issue_qty += flt(values.get("qty"), 3)
# 						other_issue_amount += flt(values.get("amount"), 2)
			
# 			for warehouse in wip_factory_in_data.get(item_code, {}):
# 				for bin_project_key, values in wip_factory_in_data[item_code].get(warehouse, {}).items():
# 					if bin_name in bin_project_key:
# 						wip_factory_qty += flt(values.get("qty"), 3)
# 						wip_factory_amount += flt(values.get("amount"), 2)
			
# 			for warehouse in wip_job_work_data.get(item_code, {}):
# 				for bin_project_key, values in wip_job_work_data[item_code].get(warehouse, {}).items():
# 					if bin_name in bin_project_key:
# 						wip_job_work_qty += flt(values.get("qty"), 3)
# 						wip_job_work_amount += flt(values.get("amount"), 2)
		
# 		opening_rate = flt(opening_value / opening_qty, 2) if opening_qty != 0 else 0.0
# 		receipt_rate = flt(receipt_amount / receipt_qty, 2) if receipt_qty != 0 else 0.0
# 		return_rate = flt(return_amount / return_qty, 2) if return_qty != 0 else 0.0
# 		dc_to_customer_rate = flt(dc_to_customer_amount / dc_to_customer_qty, 2) if dc_to_customer_qty != 0 else 0.0
# 		other_receipt_rate = flt(other_receipt_amount / other_receipt_qty, 2) if other_receipt_qty != 0 else 0.0
# 		other_issue_rate = flt(other_issue_amount / other_issue_qty, 2) if other_issue_qty != 0 else 0.0
# 		wip_factory_rate = flt(wip_factory_amount / wip_factory_qty, 2) if wip_factory_qty != 0 else 0.0
# 		wip_job_work_rate = flt(wip_job_work_amount / wip_job_work_qty, 2) if wip_job_work_qty != 0 else 0.0
		
# 		closing_qty = flt(opening_qty + receipt_qty + other_receipt_qty + wip_factory_qty - 
# 						 return_qty - dc_to_customer_qty - other_issue_qty - wip_job_work_qty, 3)
# 		closing_amount = flt(opening_value + receipt_amount + other_receipt_amount + wip_factory_amount - 
# 						   return_amount - dc_to_customer_amount - other_issue_amount - wip_job_work_amount, 2)
# 		closing_rate = flt(closing_amount / closing_qty, 2) if closing_qty != 0 else 0.0
		
# 		if any([opening_qty, opening_value, receipt_qty, receipt_amount, return_qty, return_amount,
# 			   dc_to_customer_qty, dc_to_customer_amount, other_receipt_qty, other_receipt_amount,
# 			   other_issue_qty, other_issue_amount, wip_factory_qty, wip_factory_amount,
# 			   wip_job_work_qty, wip_job_work_amount, closing_qty, closing_amount]):
			
# 			data.append({
# 				"bin": bin_name,
# 				"opening_qty": opening_qty,
# 				"opening_rate": opening_rate,
# 				"opening_value": opening_value,
# 				"receipt_qty": receipt_qty,
# 				"receipt_rate": receipt_rate,
# 				"receipt_amount": receipt_amount,
# 				"return_qty": return_qty,
# 				"return_rate": return_rate,
# 				"return_amount": return_amount,
# 				"dc_to_customer_qty": dc_to_customer_qty,
# 				"dc_to_customer_rate": dc_to_customer_rate,
# 				"dc_to_customer_amount": dc_to_customer_amount,
# 				"other_receipt_qty": other_receipt_qty,
# 				"other_receipt_rate": other_receipt_rate,
# 				"other_receipt_amount": other_receipt_amount,
# 				"other_issue_qty": other_issue_qty,
# 				"other_issue_rate": other_issue_rate,
# 				"other_issue_amount": other_issue_amount,
# 				"wip_factory_qty": wip_factory_qty,
# 				"wip_factory_rate": wip_factory_rate,
# 				"wip_factory_amount": wip_factory_amount,
# 				"wip_job_work_qty": wip_job_work_qty,
# 				"wip_job_work_rate": wip_job_work_rate,
# 				"wip_job_work_amount": wip_job_work_amount,
# 				"closing_qty": closing_qty,
# 				"closing_rate": closing_rate,
# 				"closing_amount": closing_amount
# 			})
	
# 	return data


# def prepare_project_wise_data(all_items, item_details, opening_stock, closing_stock, receipt_data, return_data,
# 							  issue_data, other_receipt_data, other_issue_data, wip_factory_in_data, wip_job_work_data):
# 	"""Prepare project-wise consolidated data using actual closing stock"""
# 	data = []
	
# 	# Get all projects from all data sources
# 	all_projects = set()
# 	data_sources = [opening_stock, closing_stock, receipt_data, return_data, issue_data, other_receipt_data, other_issue_data, wip_factory_in_data, wip_job_work_data]
	
# 	for data_source in data_sources:
# 		for item_code in data_source:
# 			for warehouse in data_source[item_code]:
# 				for bin_project_key in data_source[item_code][warehouse]:
# 					# include blank project so we can show stock without a project assignment
# 					project_no = bin_project_key.split("|||")[1]
# 					if project_no:
# 						all_projects.add(project_no)
	
# 	for project in sorted(all_projects):
# 		closing_qty = 0.0
# 		closing_amount = 0.0
		
# 		# Sum actual closing stock from database for this project
# 		for item_code in all_items:
# 			for warehouse in closing_stock.get(item_code, {}):
# 				for bin_project_key, values in closing_stock[item_code][warehouse].items():
# 					if project in bin_project_key:
# 						closing_qty += flt(values.get("qty"), 3)
# 						closing_amount += flt(values.get("value"), 2)
		
# 		if closing_qty != 0 or closing_amount != 0:
# 			if project:
# 				project_name = frappe.db.get_value("Project", project, "project_name") or ""
# 			else:
# 				project_name = "(No Project)"
# 			data.append({
# 				"project": project,
# 				"project_name": project_name,
# 				"closing_qty": closing_qty,
# 				"closing_amount": closing_amount
# 			})
	
# 	return data


# def filter_by_bin_project(data, bin=None, project=None):
# 	"""Filter data by bin and/or project"""
# 	filtered = defaultdict(lambda: defaultdict(lambda: {}))
	
# 	for item_code in data:
# 		for warehouse in data[item_code]:
# 			for bin_project_key, values in data[item_code][warehouse].items():
# 				bin_no = bin_project_key.split("|||")[0]
# 				project_no = bin_project_key.split("|||")[1]
				
# 				matches = True
# 				if bin and bin_no != bin:
# 					matches = False
# 				if project and project_no != project:
# 					matches = False
				
# 				if matches:
# 					filtered[item_code][warehouse][bin_project_key] = values
	
# 	return filtered


# def get_opening_stock(warehouses, from_date):
# 	"""
# 	Calculate opening stock (qty and value) as of JUST BEFORE from_date
# 	Uses the LAST transaction's qty_after_transaction per item-warehouse ONLY
# 	Does NOT break down by bin-project (that's just for display)
# 	This correctly represents total inventory at warehouse level
# 	"""
# 	opening_stock = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "value": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# 	# Get the LAST SLE for each item-warehouse BEFORE from_date
# 	# The qty_after_transaction IS the total on-hand qty for that item in that warehouse
# 	sle_data = frappe.db.sql("""
# 		SELECT 
# 			item_code,
# 			warehouse,
# 			qty_after_transaction as total_qty,
# 			(qty_after_transaction * valuation_rate) as total_value,
# 			valuation_rate
# 		FROM (
# 			SELECT 
# 				item_code,
# 				warehouse,
# 				qty_after_transaction,
# 				valuation_rate,
# 				ROW_NUMBER() OVER (
# 					PARTITION BY item_code, warehouse
# 					ORDER BY posting_date DESC, posting_time DESC, name DESC
# 				) as rn
# 			FROM `tabStock Ledger Entry`
# 			WHERE warehouse IN ({warehouses})
# 				AND posting_date < %s
# 				AND is_cancelled = 0
# 				AND docstatus < 2
# 		) ranked
# 		WHERE rn = 1
# 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# 	list(warehouses) + [from_date], as_dict=1)
	
# 	for sle in sle_data:
# 		item_code = sle.item_code
# 		warehouse = sle.warehouse
		
# 		# Use a single key for warehouse aggregation
# 		bin_project_key = "|||"  # Empty bin and project = warehouse total
		
# 		qty = flt(sle.total_qty)
# 		value = flt(sle.total_value)
# 		rate = flt(sle.valuation_rate, 2)
		
# 		opening_stock[item_code][warehouse][bin_project_key] = {
# 			"qty": qty,
# 			"value": value,
# 			"rate": rate,
# 			"bin": "",
# 			"project": ""
# 		}
	
# 	return opening_stock


# def get_closing_stock(warehouses, to_date):
# 	"""Get actual closing stock (qty and value) as of to_date.

# 	This uses the warehouse-level closing balance (qty/value) and assigns that
# 	balance to the latest project seen for the item/warehouse.
# 	This ensures the report totals match the stock balance amount.
# 	"""

# 	# 1) Get warehouse-level closing balance per item
# 	closing_balance = defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "value": 0.0, "rate": 0.0}))
	
# 	sle_balance = frappe.db.sql("""
# 		SELECT 
# 			item_code,
# 			warehouse,
# 			qty_after_transaction as total_qty,
# 			(qty_after_transaction * valuation_rate) as total_value,
# 			valuation_rate
# 		FROM (
# 			SELECT 
# 				item_code,
# 				warehouse,
# 				qty_after_transaction,
# 				valuation_rate,
# 				ROW_NUMBER() OVER (
# 					PARTITION BY item_code, warehouse
# 					ORDER BY posting_date DESC, posting_time DESC, name DESC
# 				) as rn
# 			FROM `tabStock Ledger Entry`
# 			WHERE warehouse IN ({warehouses})
# 				AND posting_date <= %s
# 				AND is_cancelled = 0
# 				AND docstatus < 2
# 		) ranked
# 		WHERE rn = 1
# 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# 	list(warehouses) + [to_date], as_dict=1)
	
# 	for sle in sle_balance:
# 		item_code = sle.item_code
# 		warehouse = sle.warehouse
# 		closing_balance[item_code][warehouse] = {
# 			"qty": flt(sle.total_qty),
# 			"value": flt(sle.total_value),
# 			"rate": flt(sle.valuation_rate, 2)
# 		}

# 	# 2) Find the latest project assignment for each item/warehouse
# 	project_assignment = defaultdict(lambda: defaultdict(lambda: ""))
	
# 	sle_project = frappe.db.sql("""
# 		SELECT 
# 			item_code,
# 			warehouse,
# 			COALESCE(custom_project_no, '') as custom_project_no
# 		FROM (
# 			SELECT 
# 				item_code,
# 				warehouse,
# 				custom_project_no,
# 				ROW_NUMBER() OVER (
# 					PARTITION BY item_code, warehouse
# 					ORDER BY posting_date DESC, posting_time DESC, name DESC
# 				) as rn
# 			FROM `tabStock Ledger Entry`
# 			WHERE warehouse IN ({warehouses})
# 				AND posting_date <= %s
# 				AND is_cancelled = 0
# 				AND docstatus < 2
# 				AND COALESCE(custom_project_no, '') != ''
# 		) ranked
# 		WHERE rn = 1
# 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# 	list(warehouses) + [to_date], as_dict=1)
	
# 	for sle in sle_project:
# 		item_code = sle.item_code
# 		warehouse = sle.warehouse
# 		project_assignment[item_code][warehouse] = sle.custom_project_no or ""

# 	# 3) Build closing stock grouped by project (skip blank projects)
# 	closing_stock = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "value": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# 	for item_code, warehouse_map in closing_balance.items():
# 		for warehouse, values in warehouse_map.items():
# 			project_no = project_assignment[item_code].get(warehouse, "")
# 			if not project_no:
# 				continue
# 			bin_project_key = f"|||{project_no}"
# 			closing_stock[item_code][warehouse][bin_project_key] = {
# 				"qty": values.get("qty", 0.0),
# 				"value": values.get("value", 0.0),
# 				"rate": values.get("rate", 0.0),
# 				"bin": "",
# 				"project": project_no
# 			}

# 	return closing_stock


# def get_receipt_data(warehouses, from_date, to_date):
# 	"""
# 	Get purchase receipt transactions
# 	Amount = SUM(actual_qty * valuation_rate) for accurate moving average valuation
# 	"""
# 	receipt_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# 	sle_receipts = frappe.db.sql("""
# 		SELECT 
# 			sle.item_code,
# 			sle.warehouse,
# 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# 			SUM(sle.actual_qty) as total_qty,
# 			SUM(sle.actual_qty * sle.valuation_rate) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# 		WHERE sle.warehouse IN ({warehouses})
# 			AND sle.posting_date >= %s
# 			AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Purchase Receipt'
# 			AND pr.is_return = 0
# 			AND sle.actual_qty > 0
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# 	for sle in sle_receipts:
# 		item_code = sle.item_code
# 		warehouse = sle.warehouse
# 		bin_no = sle.get("custom_bin_no") or ""
# 		project_no = sle.get("custom_project_no") or ""
# 		bin_project_key = f"{bin_no}|||{project_no}"
		
# 		qty = flt(sle.total_qty)
# 		amount = flt(sle.total_amount)
# 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# 		receipt_data[item_code][warehouse][bin_project_key] = {
# 			"qty": qty,
# 			"amount": amount,
# 			"rate": rate,
# 			"bin": bin_no,
# 			"project": project_no
# 		}
	
# 	return receipt_data


# def get_return_data(warehouses, from_date, to_date):
# 	"""Get purchase return transactions"""
# 	return_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# 	sle_returns = frappe.db.sql("""
# 		SELECT 
# 			sle.item_code,
# 			sle.warehouse,
# 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# 			SUM(ABS(sle.actual_qty)) as total_qty,
# 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# 		WHERE sle.warehouse IN ({warehouses})
# 			AND sle.posting_date >= %s
# 			AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Purchase Receipt'
# 			AND pr.is_return = 1
# 			AND sle.actual_qty < 0
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# 	for sle in sle_returns:
# 		item_code = sle.item_code
# 		warehouse = sle.warehouse
# 		bin_no = sle.get("custom_bin_no") or ""
# 		project_no = sle.get("custom_project_no") or ""
# 		bin_project_key = f"{bin_no}|||{project_no}"
		
# 		qty = flt(sle.total_qty)
# 		amount = flt(sle.total_amount)
# 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# 		return_data[item_code][warehouse][bin_project_key] = {
# 			"qty": qty,
# 			"amount": amount,
# 			"rate": rate,
# 			"bin": bin_no,
# 			"project": project_no
# 		}
	
# 	return return_data


# def get_issue_data(warehouses, from_date, to_date):
# 	"""Get delivery note (issue) transactions"""
# 	issue_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# 	sle_issues = frappe.db.sql("""
# 		SELECT 
# 			sle.item_code,
# 			sle.warehouse,
# 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# 			SUM(ABS(sle.actual_qty)) as total_qty,
# 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		WHERE sle.warehouse IN ({warehouses})
# 			AND sle.posting_date >= %s
# 			AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Delivery Note'
# 			AND sle.actual_qty < 0
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# 	for sle in sle_issues:
# 		item_code = sle.item_code
# 		warehouse = sle.warehouse
# 		bin_no = sle.get("custom_bin_no") or ""
# 		project_no = sle.get("custom_project_no") or ""
# 		bin_project_key = f"{bin_no}|||{project_no}"
		
# 		qty = flt(sle.total_qty)
# 		amount = flt(sle.total_amount)
# 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# 		issue_data[item_code][warehouse][bin_project_key] = {
# 			"qty": qty,
# 			"amount": amount,
# 			"rate": rate,
# 			"bin": bin_no,
# 			"project": project_no
# 		}
	
# 	return issue_data


# def get_other_receipt_data(warehouses, from_date, to_date):
# 	"""Get stock entry other receipt (Material Receipt) transactions"""
# 	other_receipt_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# 	sle_data = frappe.db.sql("""
# 		SELECT 
# 			sle.item_code,
# 			sle.warehouse,
# 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# 			SUM(sle.actual_qty) as total_qty,
# 			SUM(sle.actual_qty * sle.valuation_rate) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 		WHERE sle.warehouse IN ({warehouses})
# 			AND sle.posting_date >= %s
# 			AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Stock Entry'
# 			AND se.purpose = 'Material Receipt'
# 			AND sle.actual_qty > 0
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# 	for sle in sle_data:
# 		item_code = sle.item_code
# 		warehouse = sle.warehouse
# 		bin_no = sle.get("custom_bin_no") or ""
# 		project_no = sle.get("custom_project_no") or ""
# 		bin_project_key = f"{bin_no}|||{project_no}"
		
# 		qty = flt(sle.total_qty)
# 		amount = flt(sle.total_amount)
# 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# 		other_receipt_data[item_code][warehouse][bin_project_key] = {
# 			"qty": qty,
# 			"amount": amount,
# 			"rate": rate,
# 			"bin": bin_no,
# 			"project": project_no
# 		}
	
# 	return other_receipt_data


# def get_other_issue_data(warehouses, from_date, to_date):
# 	"""
# 	Get stock entry other issue transactions:
# 	- Send to Subcontractor (SE purpose = Send to Subcontractor, track by SOURCE warehouse where items leave from)
# 	- Material Transfer out (SE purpose = Material Transfer, track by source warehouse)
# 	"""
# 	other_issue_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# 	# For Send to Subcontractor - use source warehouse (sle.warehouse - where items are sent FROM)
# 	sle_send_to_sub = frappe.db.sql("""
# 		SELECT 
# 			sle.item_code,
# 			sle.warehouse,
# 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# 			SUM(ABS(sle.actual_qty)) as total_qty,
# 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 		WHERE sle.warehouse IN ({warehouses})
# 			AND sle.posting_date >= %s
# 			AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Stock Entry'
# 			AND se.purpose = 'Send to Subcontractor'
# 			AND sle.actual_qty < 0
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# 	# For Material Transfer out - use source warehouse
# 	sle_material_transfer = frappe.db.sql("""
# 		SELECT 
# 			sle.item_code,
# 			sle.warehouse,
# 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# 			SUM(ABS(sle.actual_qty)) as total_qty,
# 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 		WHERE sle.warehouse IN ({warehouses})
# 			AND sle.posting_date >= %s
# 			AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Stock Entry'
# 			AND se.purpose = 'Material Transfer'
# 			AND sle.actual_qty < 0
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# 	# Combine both queries
# 	sle_data = sle_send_to_sub + sle_material_transfer
	
# 	for sle in sle_data:
# 		item_code = sle.item_code
# 		warehouse = sle.warehouse
# 		bin_no = sle.get("custom_bin_no") or ""
# 		project_no = sle.get("custom_project_no") or ""
# 		bin_project_key = f"{bin_no}|||{project_no}"
		
# 		qty = flt(sle.total_qty)
# 		amount = flt(sle.total_amount)
# 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# 		other_issue_data[item_code][warehouse][bin_project_key] = {
# 			"qty": qty,
# 			"amount": amount,
# 			"rate": rate,
# 			"bin": bin_no,
# 			"project": project_no
# 		}
	
# 	return other_issue_data


# def get_material_transfer_data(warehouses, from_date, to_date):
# 	"""
# 	Get material transfer data split by purpose:
# 	- WIP Factory (Material Transfer inbound - positive actual_qty in target warehouse)
# 	- WIP Job Work (Send to Subcontractor outbound - negative actual_qty in source warehouse)
# 	"""
# 	wip_factory_in_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
# 	wip_job_work_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"qty": 0.0, "amount": 0.0, "rate": 0.0, "bin": "", "project": ""})))
	
# 	# WIP Factory (Material Transfer inbound)
# 	sle_wip_factory = frappe.db.sql("""
# 		SELECT 
# 			sle.item_code,
# 			sle.warehouse,
# 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# 			SUM(sle.actual_qty) as total_qty,
# 			SUM(sle.actual_qty * sle.valuation_rate) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 		WHERE sle.warehouse IN ({warehouses})
# 			AND sle.posting_date >= %s
# 			AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Stock Entry'
# 			AND se.purpose = 'Material Transfer'
# 			AND sle.actual_qty > 0
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 		GROUP BY sle.item_code, sle.warehouse, sle.custom_bin_no, sle.custom_project_no
# 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# 	list(warehouses) + [from_date, to_date], as_dict=1)
	
# 	for sle in sle_wip_factory:
# 		item_code = sle.item_code
# 		warehouse = sle.warehouse
# 		bin_no = sle.get("custom_bin_no") or ""
# 		project_no = sle.get("custom_project_no") or ""
# 		bin_project_key = f"{bin_no}|||{project_no}"
		
# 		qty = flt(sle.total_qty)
# 		amount = flt(sle.total_amount)
# 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# 		wip_factory_in_data[item_code][warehouse][bin_project_key] = {
# 			"qty": qty,
# 			"amount": amount,
# 			"rate": rate,
# 			"bin": bin_no,
# 			"project": project_no
# 		}
	
# 	# WIP Job Work (Send to Subcontractor - track by target/supplier warehouse)
# 	# Use target warehouse (t_warehouse) from Stock Entry Detail so items to different suppliers show separately
# 	# Items sent to subcontractor are ADDED to subcontractor warehouse, so use positive values
# 	sle_wip_job_work = frappe.db.sql("""
# 		SELECT 
# 			sle.item_code,
# 			sed.t_warehouse as warehouse,
# 			COALESCE(sle.custom_bin_no, '') as custom_bin_no,
# 			COALESCE(sle.custom_project_no, '') as custom_project_no,
# 			SUM(ABS(sle.actual_qty)) as total_qty,
# 			SUM(ABS(sle.actual_qty * sle.valuation_rate)) as total_amount
# 		FROM `tabStock Ledger Entry` sle
# 		INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 		INNER JOIN `tabStock Entry Detail` sed ON se.name = sed.parent AND sle.item_code = sed.item_code
# 		WHERE sle.posting_date >= %s
# 			AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Stock Entry'
# 			AND se.purpose = 'Send to Subcontractor'
# 			AND sle.actual_qty < 0
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 		GROUP BY sle.item_code, sed.t_warehouse, sle.custom_bin_no, sle.custom_project_no
# 	""", [from_date, to_date], as_dict=1)
	
# 	for sle in sle_wip_job_work:
# 		item_code = sle.item_code
# 		warehouse = sle.warehouse
# 		bin_no = sle.get("custom_bin_no") or ""
# 		project_no = sle.get("custom_project_no") or ""
# 		bin_project_key = f"{bin_no}|||{project_no}"
		
# 		qty = flt(sle.total_qty)
# 		amount = flt(sle.total_amount)
# 		rate = flt(amount / qty, 2) if qty != 0 else 0.0
		
# 		wip_job_work_data[item_code][warehouse][bin_project_key] = {
# 			"qty": qty,
# 			"amount": amount,
# 			"rate": rate,
# 			"bin": bin_no,
# 			"project": project_no
# 		}
	
# 	return wip_factory_in_data, wip_job_work_data


# def get_stock_reconciliation_data(warehouses, to_date):
# 	"""Get stock reconciliation data - latest reconciliation per item-warehouse"""
# 	recon_data = defaultdict(lambda: defaultdict(lambda: {
# 		"qty": 0.0,
# 		"rate": 0.0,
# 		"amount": 0.0
# 	}))
	
# 	data = frappe.db.sql("""
# 		SELECT DISTINCT
# 			sle.item_code,
# 			sle.warehouse,
# 			sle.qty_after_transaction as qty,
# 			sle.valuation_rate as rate,
# 			sle.qty_after_transaction * sle.valuation_rate as amount
# 		FROM `tabStock Ledger Entry` sle
# 		WHERE sle.warehouse IN ({warehouses})
# 			AND sle.posting_date <= %s
# 			AND sle.voucher_type = 'Stock Reconciliation'
# 			AND sle.is_cancelled = 0
# 			AND sle.docstatus < 2
# 			AND (sle.item_code, sle.warehouse, sle.posting_date) IN (
# 				SELECT sle2.item_code, sle2.warehouse, MAX(sle2.posting_date)
# 				FROM `tabStock Ledger Entry` sle2
# 				WHERE sle2.warehouse IN ({warehouses})
# 					AND sle2.posting_date <= %s
# 					AND sle2.voucher_type = 'Stock Reconciliation'
# 					AND sle2.is_cancelled = 0
# 					AND sle2.docstatus < 2
# 				GROUP BY sle2.item_code, sle2.warehouse
# 			)
# 	""".format(warehouses=', '.join(['%s'] * len(warehouses))), 
# 	tuple(warehouses) + (to_date,) + tuple(warehouses) + (to_date,), as_dict=1)
	
# 	for row in data:
# 		recon_data[row.item_code][row.warehouse] = {
# 			"qty": flt(row.qty, 3),
# 			"rate": flt(row.rate, 2),
# 			"amount": flt(row.amount, 2)
# 		}
	
# 	return recon_data


# def get_closing_valuation_rate(item_code, warehouse):
# 	"""Get the latest moving average valuation rate from Stock Ledger Entry"""
# 	rate = frappe.db.sql("""
# 		SELECT valuation_rate 
# 		FROM `tabStock Ledger Entry`
# 		WHERE item_code = %s 
# 			AND warehouse = %s 
# 			AND is_cancelled = 0
# 			AND docstatus < 2
# 		ORDER BY posting_date DESC, creation DESC
# 		LIMIT 1
# 	""", (item_code, warehouse), as_list=1)
	
# 	return flt(rate[0][0], 2) if rate else 0.0


# # ========================= DETAIL FUNCTIONS FOR DRILL-DOWN =========================

# def get_transaction_details(transaction_type, warehouse, from_date, to_date, include_child=1, show_items=0, bin=None, project=None):
# 	"""
# 	Get detailed breakdown of transactions by document and optionally by items
# 	Transaction types: purchase_cost, purchase_return, issue_cost, other_receipt, other_issue, transfer_in, transfer_out
# 	"""
# 	from_date = getdate(from_date)
# 	to_date = getdate(to_date)
# 	include_child = int(include_child)
# 	show_items = int(show_items)
	
# 	warehouses = get_warehouses(warehouse, include_child)
	
# 	if not warehouses:
# 		return []
	
# 	# Route to appropriate function based on transaction type
# 	if transaction_type == "purchase_cost":
# 		return get_purchase_cost_details(warehouses, from_date, to_date, show_items, bin, project)
# 	elif transaction_type == "purchase_return":
# 		return get_purchase_return_details(warehouses, from_date, to_date, show_items, bin, project)
# 	elif transaction_type == "issue_cost":
# 		return get_issue_cost_details(warehouses, from_date, to_date, show_items, bin, project)
# 	elif transaction_type == "other_receipt":
# 		return get_other_receipt_details(warehouses, from_date, to_date, show_items, bin, project)
# 	elif transaction_type == "other_issue":
# 		return get_other_issue_details(warehouses, from_date, to_date, show_items, bin, project)
# 	elif transaction_type == "transfer_in":
# 		return get_transfer_in_details(warehouses, from_date, to_date, show_items, bin, project)
# 	elif transaction_type == "transfer_out":
# 		return get_transfer_out_details(warehouses, from_date, to_date, show_items, bin, project)
# 	else:
# 		return []


# def get_purchase_cost_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	"""Get Purchase Receipt details"""
# 	bin_condition = ""
# 	project_condition = ""
# 	additional_params = []
	
# 	if bin:
# 		bin_condition = "AND sle.custom_bin_no = %s"
# 		additional_params.append(bin)
# 	if project:
# 		project_condition = "AND sle.custom_project_no = %s"
# 		additional_params.append(project)
	
# 	if show_items:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				pr.supplier,
# 				sle.item_code,
# 				i.item_name,
# 				i.description,
# 				i.technical_description,
# 				sle.warehouse,
# 				sle.actual_qty as qty,
# 				sle.valuation_rate as rate,
# 				sle.actual_qty * sle.valuation_rate as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Purchase Receipt'
# 				AND pr.is_return = 0
# 				AND sle.actual_qty > 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# 	else:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				pr.supplier,
# 				SUM(sle.actual_qty * sle.valuation_rate) as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Purchase Receipt'
# 				AND pr.is_return = 0
# 				AND sle.actual_qty > 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			GROUP BY sle.voucher_no, sle.posting_date, pr.supplier
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# 	return data


# def get_purchase_return_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	"""Get Purchase Return details"""
# 	bin_condition = ""
# 	project_condition = ""
# 	additional_params = []
	
# 	if bin:
# 		bin_condition = "AND sle.custom_bin_no = %s"
# 		additional_params.append(bin)
# 	if project:
# 		project_condition = "AND sle.custom_project_no = %s"
# 		additional_params.append(project)
	
# 	if show_items:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				pr.supplier,
# 				sle.item_code,
# 				i.item_name,
# 				i.description,
# 				i.technical_description,
# 				sle.warehouse,
# 				ABS(sle.actual_qty) as qty,
# 				sle.valuation_rate as rate,
# 				ABS(sle.actual_qty) * sle.valuation_rate as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Purchase Receipt'
# 				AND pr.is_return = 1
# 				AND sle.actual_qty < 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# 	else:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				pr.supplier,
# 				SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabPurchase Receipt` pr ON sle.voucher_no = pr.name
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Purchase Receipt'
# 				AND pr.is_return = 1
# 				AND sle.actual_qty < 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			GROUP BY sle.voucher_no, sle.posting_date, pr.supplier
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# 	return data


# def get_issue_cost_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	"""Get Delivery Note (Issue/DC to Customer) details"""
# 	bin_condition = ""
# 	project_condition = ""
# 	additional_params = []
	
# 	if bin:
# 		bin_condition = "AND sle.custom_bin_no = %s"
# 		additional_params.append(bin)
# 	if project:
# 		project_condition = "AND sle.custom_project_no = %s"
# 		additional_params.append(project)
	
# 	if show_items:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				dn.customer,
# 				sle.item_code,
# 				i.item_name,
# 				i.description,
# 				i.technical_description,
# 				sle.warehouse,
# 				ABS(sle.actual_qty) as qty,
# 				sle.valuation_rate as rate,
# 				ABS(sle.actual_qty) * sle.valuation_rate as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabDelivery Note` dn ON sle.voucher_no = dn.name
# 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Delivery Note'
# 				AND sle.actual_qty < 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# 	else:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				dn.customer,
# 				SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabDelivery Note` dn ON sle.voucher_no = dn.name
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Delivery Note'
# 				AND sle.actual_qty < 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			GROUP BY sle.voucher_no, sle.posting_date, dn.customer
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# 	return data


# def get_other_receipt_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	"""Get Stock Entry Material Receipt details"""
# 	bin_condition = ""
# 	project_condition = ""
# 	additional_params = []
	
# 	if bin:
# 		bin_condition = "AND sle.custom_bin_no = %s"
# 		additional_params.append(bin)
# 	if project:
# 		project_condition = "AND sle.custom_project_no = %s"
# 		additional_params.append(project)
	
# 	if show_items:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				se.purpose,
# 				sle.item_code,
# 				i.item_name,
# 				i.description,
# 				i.technical_description,
# 				sle.warehouse,
# 				sle.actual_qty as qty,
# 				sle.valuation_rate as rate,
# 				sle.actual_qty * sle.valuation_rate as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Stock Entry'
# 				AND se.purpose = 'Material Receipt'
# 				AND sle.actual_qty > 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# 	else:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				se.purpose,
# 				SUM(sle.actual_qty * sle.valuation_rate) as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Stock Entry'
# 				AND se.purpose = 'Material Receipt'
# 				AND sle.actual_qty > 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			GROUP BY sle.voucher_no, sle.posting_date, se.purpose
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# 	return data


# def get_other_issue_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	"""Get Stock Entry other issue details (Send to Subcontractor, Material Transfer out)"""
# 	bin_condition = ""
# 	project_condition = ""
# 	additional_params = []
	
# 	if bin:
# 		bin_condition = "AND sle.custom_bin_no = %s"
# 		additional_params.append(bin)
# 	if project:
# 		project_condition = "AND sle.custom_project_no = %s"
# 		additional_params.append(project)
	
# 	if show_items:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				se.purpose,
# 				sle.item_code,
# 				i.item_name,
# 				i.description,
# 				i.technical_description,
# 				sle.warehouse,
# 				ABS(sle.actual_qty) as qty,
# 				sle.valuation_rate as rate,
# 				ABS(sle.actual_qty) * sle.valuation_rate as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Stock Entry'
# 				AND (se.purpose = 'Send to Subcontractor' OR se.purpose = 'Material Transfer')
# 				AND sle.actual_qty < 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# 	else:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				se.purpose,
# 				SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Stock Entry'
# 				AND (se.purpose = 'Send to Subcontractor' OR se.purpose = 'Material Transfer')
# 				AND sle.actual_qty < 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			GROUP BY sle.voucher_no, sle.posting_date, se.purpose
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# 	return data


# def get_transfer_in_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	"""Get Material Transfer IN (WIP Factory) details"""
# 	bin_condition = ""
# 	project_condition = ""
# 	additional_params = []
	
# 	if bin:
# 		bin_condition = "AND sle.custom_bin_no = %s"
# 		additional_params.append(bin)
# 	if project:
# 		project_condition = "AND sle.custom_project_no = %s"
# 		additional_params.append(project)
	
# 	if show_items:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				se.purpose,
# 				sle.item_code,
# 				i.item_name,
# 				i.description,
# 				i.technical_description,
# 				sle.warehouse,
# 				sle.actual_qty as qty,
# 				sle.valuation_rate as rate,
# 				sle.actual_qty * sle.valuation_rate as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Stock Entry'
# 				AND se.purpose = 'Material Transfer'
# 				AND sle.actual_qty > 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# 	else:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				se.purpose,
# 				SUM(sle.actual_qty * sle.valuation_rate) as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Stock Entry'
# 				AND se.purpose = 'Material Transfer'
# 				AND sle.actual_qty > 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			GROUP BY sle.voucher_no, sle.posting_date, se.purpose
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# 	return data


# def get_transfer_out_details(warehouses, from_date, to_date, show_items=0, bin=None, project=None):
# 	"""Get Material Transfer OUT (WIP Job Work) details"""
# 	bin_condition = ""
# 	project_condition = ""
# 	additional_params = []
	
# 	if bin:
# 		bin_condition = "AND sle.custom_bin_no = %s"
# 		additional_params.append(bin)
# 	if project:
# 		project_condition = "AND sle.custom_project_no = %s"
# 		additional_params.append(project)
	
# 	if show_items:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				se.purpose,
# 				sle.item_code,
# 				i.item_name,
# 				i.description,
# 				i.technical_description,
# 				sle.warehouse,
# 				ABS(sle.actual_qty) as qty,
# 				sle.valuation_rate as rate,
# 				ABS(sle.actual_qty) * sle.valuation_rate as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 			LEFT JOIN `tabItem` i ON sle.item_code = i.item_code
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Stock Entry'
# 				AND se.purpose = 'Send to Subcontractor'
# 				AND sle.actual_qty < 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
# 	else:
# 		data = frappe.db.sql("""
# 			SELECT 
# 				sle.voucher_no as document_name,
# 				sle.posting_date,
# 				se.purpose,
# 				SUM(ABS(sle.actual_qty) * sle.valuation_rate) as amount
# 			FROM `tabStock Ledger Entry` sle
# 			INNER JOIN `tabStock Entry` se ON sle.voucher_no = se.name
# 			WHERE sle.warehouse IN ({warehouses})
# 				AND sle.posting_date >= %s
# 				AND sle.posting_date <= %s
# 				AND sle.voucher_type = 'Stock Entry'
# 				AND se.purpose = 'Send to Subcontractor'
# 				AND sle.actual_qty < 0
# 				AND sle.is_cancelled = 0
# 				AND sle.docstatus < 2
# 				{bin_condition}
# 				{project_condition}
# 			GROUP BY sle.voucher_no, sle.posting_date, se.purpose
# 			ORDER BY sle.posting_date DESC, sle.voucher_no
# 		""".format(
# 			warehouses=', '.join(['%s'] * len(warehouses)),
# 			bin_condition=bin_condition,
# 			project_condition=project_condition
# 		), 
# 		list(warehouses) + [from_date, to_date] + additional_params, as_dict=1)
	
# 	return data

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
	"""Define report columns"""
	
	columns = [
		{
			"fieldname": "project",
			"label": _("Project"),
			"fieldtype": "Link",
			"options": "Project",
			"width": 150
		},
		{
			"fieldname": "project_name",
			"label": _("Project Name"),
			"fieldtype": "Data",
			"width": 200
		},
		{
			"fieldname": "closing_qty",
			"label": _("Closing Qty"),
			"fieldtype": "Float",
			"width": 120
		},
		{
			"fieldname": "closing_amount",
			"label": _("Closing Amount"),
			"fieldtype": "Currency",
			"width": 150
		}
	]
	
	return columns

def get_data(filters):
	"""Get project-wise stock data matching ERPNext Stock Balance report"""
	warehouse = filters.get("warehouse")
	from_date = getdate(filters.get("from_date"))
	to_date = getdate(filters.get("to_date"))
	include_child = 1  # Always include child warehouses
	
	warehouses = get_warehouses(warehouse, include_child)
	if not warehouses:
		return []
	
	# Get project-wise stock matching ERPNext Stock Balance logic
	return get_project_wise_stock_erpnext(warehouses, to_date)

def get_warehouses(warehouse, include_child):
	"""Get list of warehouses including children if requested"""
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

def get_project_wise_stock_erpnext(warehouses, to_date):
	"""Get project-wise stock using exact default Stock Balance report logic with project split"""
	
	# Step 1: Use exact same logic as default Stock Balance report
	# This is how ERPNext Stock Balance report gets its data
	wh_placeholders = ','.join(['%s'] * len(warehouses))
	
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
	
	# Calculate total warehouse value for verification
	total_warehouse_value = sum(flt(stock.closing_value, 2) for stock in stock_balance_data)
	print(f"DEBUG: Total warehouse stock value (Stock Balance): {total_warehouse_value}")
	
	# Step 2: Get latest project assignment for each item-warehouse from Stock Ledger Entry
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
	
	# Step 3: Aggregate stock balance by project
	project_stock = defaultdict(lambda: {"qty": 0.0, "value": 0.0})
	
	for stock in stock_balance_data:
		key = (stock.item_code, stock.warehouse)
		project = assignment_lookup.get(key, "")
		
		if project:  # Only include stock assigned to a project
			project_stock[project]["qty"] += flt(stock.closing_qty, 3)
			project_stock[project]["value"] += flt(stock.closing_value, 2)
	
	# Step 4: Prepare result data
	data = []
	total_project_value = 0.0
	
	for project, values in sorted(project_stock.items()):
		if values["qty"] != 0 or values["value"] != 0:
			project_name = frappe.db.get_value("Project", project, "project_name") or ""
			data.append({
				"project": project,
				"project_name": project_name,
				"closing_qty": values["qty"],
				"closing_amount": values["value"]
			})
			total_project_value += values["value"]
	
	print(f"DEBUG: Total assigned to projects: {total_project_value}")
	print(f"DEBUG: Unassigned stock: {total_warehouse_value - total_project_value}")
	
	return data
