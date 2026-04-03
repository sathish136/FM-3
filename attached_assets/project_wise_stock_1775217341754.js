// // frappe.query_reports["Project Wise Stock"] = {
// // 	"filters": [
// // 		{
// // 			"fieldname": "warehouse",
// // 			"label": __("Warehouse"),
// // 			"fieldtype": "Link",
// // 			"options": "Warehouse",
// // 			"default": "Main Warehouse - WTT",
// // 			"reqd": 1
// // 		},
// // 		{
// // 			"fieldname": "from_date",
// // 			"label": __("From Date"),
// // 			"fieldtype": "Date",
// // 			"default": frappe.datetime.month_start(),
// // 			"reqd": 1
// // 		},
// // 		{
// // 			"fieldname": "to_date",
// // 			"label": __("To Date"),
// // 			"fieldtype": "Date",
// // 			"default": frappe.datetime.month_end(),
// // 			"reqd": 1
// // 		},
// // 		{
// // 			"fieldname": "include_child_warehouses",
// // 			"label": __("Include Child Warehouses"),
// // 			"fieldtype": "Check",
// // 			"default": 1,
// // 			"hidden":1
// // 		},
// // 		{
// // 			"fieldname": "consolidate_by",
// // 			"label": __("Consolidate By"),
// // 			"fieldtype": "Select",
// // 			"options": ["", "Item Group Wise", "Warehouse Wise", "Bin Wise", "Project Wise"],
// // 			"default": ""
// // 		},
// // 		{
// // 			"fieldname": "bin",
// // 			"label": __("Bin"),
// // 			"fieldtype": "Link",
// // 			"options": "Physical Bin",
// // 			"depends_on": "eval:doc.consolidate_by != 'Bin Wise'"
// // 		},
// // 		{
// // 			"fieldname": "rack_no",
// // 			"label": __("Rack No"),
// // 			"fieldtype": "Link",
// // 			"options": "RACK",
// // 			"description": __("Select a rack number - when used with Item wise Bin, will show only bins from this rack")
// // 		},
// // 		{
// // 			"fieldname": "project",
// // 			"label": __("Project"),
// // 			"fieldtype": "Link",
// // 			"options": "Project",
// // 			"depends_on": "eval:doc.consolidate_by != 'Project Wise'"
// // 		},
// // 		{
// // 			"fieldname": "item_code",
// // 			"label": __("Item Code"),
// // 			"fieldtype": "Link",
// // 			"options": "Item",
// // 			"description": __("Filter by specific item code")
// // 		},
// // 		{
// // 			"fieldname": "number_of_bins",
// // 			"label": __("Number of Bins (Random)"),
// // 			"fieldtype": "Int",
// // 			"description": __("Enter number to randomly select that many bins and show their items")
// // 		},
// // 		{
// // 			"fieldname": "item_wise_bin",
// // 			"label": __("Item wise Bin"),
// // 			"fieldtype": "Check",
// // 			"default": 0,
// // 			"description": __("Show duplicate items grouped by bin with blank row separators")
// // 		},
// // 		{
// // 			"fieldname": "project_wise_bin",
// // 			"label": __("Project wise Bin"),
// // 			"fieldtype": "Check",
// // 			"default": 0,
// // 			"description": __("Show duplicate items grouped by project with blank row separators")
// // 		},
// // 		{
// // 			"fieldname": "transaction_breakdown",
// // 			"label": __("Transaction Breakdown"),
// // 			"fieldtype": "Select",
// // 			"options": [
// // 				"",
// // 				"Purchase Cost (Receipt Amount)",
// // 				"Purchase Return Cost (Return Amount)",
// // 				"Issue Cost",
// // 				"Other Receipt Cost",
// // 				"Other Issue Cost",
// // 				"Transfer IN Amount",
// // 				"Transfer OUT Amount"
// // 			],
// // 			"default": ""
// // 		}
// // 	],
	
// // 	"formatter": function(value, row, column, data, default_formatter) {
// // 		value = default_formatter(value, row, column, data);
		
// // 		// Make amount columns clickable for detailed breakdown
// // 		const clickable_columns = [
// // 			'receipt_amount', 'return_amount', 'dc_to_customer_amount', 
// // 			'other_receipt_amount', 'other_issue_amount', 
// // 			'wip_factory_amount', 'wip_job_work_amount'
// // 		];
		
// // 		if (clickable_columns.includes(column.fieldname) && data && data[column.fieldname] && data[column.fieldname] != 0) {
// // 			return `<a style="color: #2490ef; cursor: pointer; text-decoration: underline;" 
// // 					   data-fieldname="${column.fieldname}" 
// // 					   data-value="${data[column.fieldname]}"
// // 					   onclick="return false;">${value}</a>`;
// // 		}
		
// // 		return value;
// // 	},
	
// // 	"onload": function(report) {
// // 		// Add custom button for transaction breakdown
// // 		report.page.add_inner_button(__('View Breakdown'), function() {
// // 			const filters = report.get_values();
// // 			const transaction_type = filters.transaction_breakdown;
			
// // 			if (!transaction_type) {
// // 				frappe.msgprint(__('Please select a Transaction Breakdown type from filters'));
// // 				return;
// // 			}
			
// // 			show_transaction_breakdown_dialog(filters, transaction_type, report);
// // 		});
		
// // 		// Add click event listener for amount columns
// // 		$(document).on('click', '.dt-cell__content a[data-fieldname]', function(e) {
// // 			e.preventDefault();
// // 			e.stopPropagation();
			
// // 			const fieldname = $(this).data('fieldname');
// // 			const filters = report.get_values();
			
// // 			// Get the row data to extract bin/project information
// // 			const $row = $(this).closest('.dt-row');
// // 			const rowIndex = $row.index();
// // 			const rowData = report.datatable.datamanager.rows[rowIndex];
			
// // 			// Extract bin or project from the row data if consolidate_by is Bin Wise or Project Wise
// // 			let additional_filter = {};
// // 			if (filters.consolidate_by === 'Bin Wise' && rowData && rowData[0]) {
// // 				additional_filter.bin = rowData[0].content; // bin is the first column in Bin Wise view
// // 			} else if (filters.consolidate_by === 'Project Wise' && rowData && rowData[0]) {
// // 				additional_filter.project = rowData[0].content; // project is the first column in Project Wise view
// // 			}
			
// // 			// Map fieldname to transaction type
// // 			const transaction_map = {
// // 				'receipt_amount': 'purchase_cost',
// // 				'return_amount': 'purchase_return',
// // 				'dc_to_customer_amount': 'issue_cost',
// // 				'other_receipt_amount': 'other_receipt',
// // 				'other_issue_amount': 'other_issue',
// // 				'wip_factory_amount': 'transfer_in',
// // 				'wip_job_work_amount': 'transfer_out'
// // 			};
			
// // 			const transaction_type = transaction_map[fieldname];
// // 			if (transaction_type) {
// // 				show_transaction_breakdown_dialog(filters, transaction_type, report, additional_filter);
// // 			}
// // 		});
// // 	}
// // };

// // function show_transaction_breakdown_dialog(filters, transaction_type, report, additional_filter) {
// // 	// transaction_type is already the API parameter (e.g., 'purchase_cost', 'issue_cost')
// // 	const api_type = transaction_type;
// // 	additional_filter = additional_filter || {};
	
// // 	// Merge additional filters (bin/project) with main filters
// // 	const merged_filters = Object.assign({}, filters, additional_filter);
	
// // 	// Create transaction type labels for display
// // 	const type_labels = {
// // 		'purchase_cost': 'Purchase Cost (Receipt Amount)',
// // 		'purchase_return': 'Purchase Return Cost (Return Amount)',
// // 		'issue_cost': 'DC to Customer (Issue Cost)',
// // 		'other_receipt': 'Other Receipt Cost',
// // 		'other_issue': 'Other Issue Cost',
// // 		'transfer_in': 'WIP Factory (Transfer IN Amount)',
// // 		'transfer_out': 'WIP Job Work (Transfer OUT Amount)'
// // 	};
	
// // 	const transaction_label = type_labels[api_type] || transaction_type;
	
// // 	// Update dialog title to show bin/project if filtered
// // 	let dialog_title = transaction_label + ' - Breakdown';
// // 	if (additional_filter.bin) {
// // 		dialog_title += ` (Bin: ${additional_filter.bin})`;
// // 	} else if (additional_filter.project) {
// // 		dialog_title += ` (Project: ${additional_filter.project})`;
// // 	}
	
// // 	// Create dialog
// // 	let d = new frappe.ui.Dialog({
// // 		title: __(dialog_title),
// // 		size: 'extra-large',
// // 		fields: [
// // 			{
// // 				fieldname: 'show_items',
// // 				label: __('Show Item-wise Details'),
// // 				fieldtype: 'Check',
// // 				default: 0,
// // 				onchange: function() {
// // 					load_breakdown_data(d, merged_filters, api_type, this.get_value());
// // 				}
// // 			},
// // 			{
// // 				fieldname: 'breakdown_html',
// // 				fieldtype: 'HTML'
// // 			}
// // 		],
// // 		primary_action_label: __('Export to Excel'),
// // 		primary_action: function() {
// // 			export_breakdown_to_excel(d, merged_filters, api_type, transaction_type);
// // 		}
// // 	});
	
// // 	d.show();
	
// // 	// Load initial data (document-wise)
// // 	load_breakdown_data(d, merged_filters, api_type, 0);
// // }

// // function export_breakdown_to_excel(dialog, filters, api_type, transaction_type) {
// // 	const show_items = dialog.get_value('show_items') ? 1 : 0;
// // 	const $wrapper = dialog.fields_dict.breakdown_html.$wrapper;
// // 	$wrapper.html('<div class="text-center" style="padding: 40px;"><i class="fa fa-spinner fa-spin fa-2x"></i><br><br>Preparing export...</div>');
	
// // 	frappe.call({
// // 		method: 'wtt_module.wtt_module.report.consolidate_stock_statement.consolidate_stock_statement.get_transaction_details',
// // 		args: {
// // 			transaction_type: api_type,
// // 			warehouse: filters.warehouse,
// // 			from_date: filters.from_date,
// // 			to_date: filters.to_date,
// // 			include_child: filters.include_child_warehouses || 1,
// // 			show_items: show_items
// // 		},
// // 		callback: function(r) {
// // 			if (r.message && r.message.length > 0) {
// // 				// Load XLSX library from CDN if not already loaded
// // 				if (typeof XLSX === 'undefined') {
// // 					frappe.show_alert({message: __('Loading Excel library...'), indicator: 'blue'});
					
// // 					const script = document.createElement('script');
// // 					script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
// // 					script.onload = function() {
// // 						perform_excel_export(r.message, show_items, transaction_type, api_type, dialog);
// // 					};
// // 					script.onerror = function() {
// // 						frappe.msgprint(__('Failed to load Excel library. Please try again.'));
// // 						render_breakdown_table(dialog, r.message, show_items, api_type);
// // 					};
// // 					document.head.appendChild(script);
// // 				} else {
// // 					perform_excel_export(r.message, show_items, transaction_type, api_type, dialog);
// // 				}
// // 			} else {
// // 				frappe.msgprint(__('No data to export'));
// // 				$wrapper.html('<div class="text-muted text-center" style="padding: 40px;">No data found for the selected period</div>');
// // 			}
// // 		}
// // 	});
// // }

// // function strip_html_tags(html) {
// // 	if (!html) return '';
// // 	// Create a temporary div element to parse HTML
// // 	const tmp = document.createElement('div');
// // 	tmp.innerHTML = html;
// // 	// Get text content and clean up extra whitespace
// // 	return tmp.textContent || tmp.innerText || '';
// // }

// // function perform_excel_export(data, show_items, transaction_type, api_type, dialog) {
// // 	// Determine the appropriate column header based on transaction type
// // 	let relation_header = 'Purpose';
// // 	if (api_type.includes('purchase')) {
// // 		relation_header = 'Supplier';
// // 	} else if (api_type === 'issue_cost') {
// // 		relation_header = 'Customer';
// // 	}
	
// // 	// Create a workbook with a worksheet
// // 	const wb = XLSX.utils.book_new();
// // 	const ws_data = [];
	
// // 	// Add headers
// // 	if (show_items) {
// // 		ws_data.push([
// // 			'Document', 'Date', relation_header,
// // 			'Item Code', 'Item Name', 'Description', 
// // 			'Technical Description', 'Warehouse', 'Qty', 'Rate', 'Amount'
// // 		]);
// // 	} else {
// // 		ws_data.push([
// // 			'Document', 'Date', relation_header,
// // 			'Amount'
// // 		]);
// // 	}
	
// // 	// Add data rows
// // 	data.forEach(row => {
// // 		if (show_items) {
// // 			ws_data.push([
// // 				row.document_name || '',
// // 				frappe.datetime.str_to_user(row.posting_date) || '',
// // 				row.supplier || row.customer || row.purpose || '',
// // 				row.item_code || '',
// // 				row.item_name || '',
// // 				strip_html_tags(row.description || ''),
// // 				strip_html_tags(row.technical_description || ''),
// // 				row.warehouse || '',
// // 				parseFloat(row.qty || 0),
// // 				parseFloat(row.rate || 0),
// // 				parseFloat(row.amount || 0)
// // 			]);
// // 		} else {
// // 			ws_data.push([
// // 				row.document_name || '',
// // 				frappe.datetime.str_to_user(row.posting_date) || '',
// // 				row.supplier || row.customer || row.purpose || '',
// // 				parseFloat(row.amount || 0)
// // 			]);
// // 		}
// // 	});
	
// // 	// Add total row
// // 	const total = data.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
// // 	if (show_items) {
// // 		ws_data.push(['', '', '', '', '', '', '', '', 'Total:', '', total]);
// // 	} else {
// // 		ws_data.push(['', '', 'Total:', total]);
// // 	}
	
// // 	// Create worksheet
// // 	const ws = XLSX.utils.aoa_to_sheet(ws_data);
	
// // 	// Set column widths
// // 	if (show_items) {
// // 		ws['!cols'] = [
// // 			{wch: 15}, // Document
// // 			{wch: 12}, // Date
// // 			{wch: 25}, // Supplier/Customer/Purpose
// // 			{wch: 15}, // Item Code
// // 			{wch: 25}, // Item Name
// // 			{wch: 30}, // Description
// // 			{wch: 30}, // Technical Description
// // 			{wch: 20}, // Warehouse
// // 			{wch: 12}, // Qty
// // 			{wch: 12}, // Rate
// // 			{wch: 15}  // Amount
// // 		];
// // 	} else {
// // 		ws['!cols'] = [
// // 			{wch: 20}, // Document
// // 			{wch: 12}, // Date
// // 			{wch: 30}, // Supplier/Customer/Purpose
// // 			{wch: 15}  // Amount
// // 		];
// // 	}
	
// // 	// Apply formatting to cells
// // 	const range = XLSX.utils.decode_range(ws['!ref']);
	
// // 	for (let R = range.s.r; R <= range.e.r; ++R) {
// // 		for (let C = range.s.c; C <= range.e.c; ++C) {
// // 			const cell_address = XLSX.utils.encode_cell({r: R, c: C});
// // 			if (!ws[cell_address]) continue;
			
// // 			// Add border to all cells
// // 			ws[cell_address].s = {
// // 				border: {
// // 					top: {style: 'thin', color: {rgb: '000000'}},
// // 					bottom: {style: 'thin', color: {rgb: '000000'}},
// // 					left: {style: 'thin', color: {rgb: '000000'}},
// // 					right: {style: 'thin', color: {rgb: '000000'}}
// // 				}
// // 			};
			
// // 			// Header row formatting
// // 			if (R === 0) {
// // 				ws[cell_address].s.fill = {fgColor: {rgb: 'D3D3D3'}};
// // 				ws[cell_address].s.font = {bold: true};
// // 				ws[cell_address].s.alignment = {horizontal: 'center', vertical: 'center'};
// // 			}
			
// // 			// Total row formatting
// // 			if (R === range.e.r) {
// // 				ws[cell_address].s.font = {bold: true};
// // 				ws[cell_address].s.fill = {fgColor: {rgb: 'F0F0F0'}};
// // 			}
			
// // 			// Format numeric columns
// // 			if (show_items) {
// // 				// Qty column (index 8)
// // 				if (C === 8 && R > 0) {
// // 					ws[cell_address].t = 'n';
// // 					ws[cell_address].z = '#,##0.000';
// // 					ws[cell_address].s.alignment = {horizontal: 'right'};
// // 				}
// // 				// Rate column (index 9)
// // 				if (C === 9 && R > 0) {
// // 					ws[cell_address].t = 'n';
// // 					ws[cell_address].z = '#,##0.00';
// // 					ws[cell_address].s.alignment = {horizontal: 'right'};
// // 				}
// // 				// Amount column (index 10)
// // 				if (C === 10 && R > 0) {
// // 					ws[cell_address].t = 'n';
// // 					ws[cell_address].z = '#,##0.00';
// // 					ws[cell_address].s.alignment = {horizontal: 'right'};
// // 				}
// // 			} else {
// // 				// Amount column (index 3)
// // 				if (C === 3 && R > 0) {
// // 					ws[cell_address].t = 'n';
// // 					ws[cell_address].z = '#,##0.00';
// // 					ws[cell_address].s.alignment = {horizontal: 'right'};
// // 				}
// // 			}
// // 		}
// // 	}
	
// // 	// Add worksheet to workbook
// // 	XLSX.utils.book_append_sheet(wb, ws, transaction_type.substring(0, 31));
	
// // 	// Write file with cellStyles option
// // 	const fileName = `${transaction_type.replace(/\s+/g, '_')}_${frappe.datetime.get_today()}.xlsx`;
// // 	XLSX.writeFile(wb, fileName, {cellStyles: true});
	
// // 	// Restore the table view
// // 	render_breakdown_table(dialog, data, show_items, api_type);
	
// // 	frappe.show_alert({message: __('Excel file downloaded successfully'), indicator: 'green'});
// // }

// // function load_breakdown_data(dialog, filters, transaction_type, show_items) {
// // 	const $wrapper = dialog.fields_dict.breakdown_html.$wrapper;
// // 	$wrapper.html('<div class="text-center" style="padding: 40px;"><i class="fa fa-spinner fa-spin fa-2x"></i><br><br>Loading...</div>');
	
// // 	frappe.call({
// // 		method: 'wtt_module.wtt_module.report.consolidate_stock_statement.consolidate_stock_statement.get_transaction_details',
// // 		args: {
// // 			transaction_type: transaction_type,
// // 			warehouse: filters.warehouse,
// // 			from_date: filters.from_date,
// // 			to_date: filters.to_date,
// // 			include_child: filters.include_child_warehouses || 1,
// // 			show_items: show_items ? 1 : 0,
// // 			bin: filters.bin || '',
// // 			project: filters.project || ''
// // 		},
// // 		callback: function(r) {
// // 			if (r.message && r.message.length > 0) {
// // 				render_breakdown_table(dialog, r.message, show_items, transaction_type);
// // 			} else {
// // 				$wrapper.html('<div class="text-muted text-center" style="padding: 40px;">No data found for the selected period</div>');
// // 			}
// // 		}
// // 	});
// // }

// // function render_breakdown_table(dialog, data, show_items, transaction_type) {
// // 	const $wrapper = dialog.fields_dict.breakdown_html.$wrapper;
	
// // 	let html = '<div style="max-height: 500px; overflow-y: auto;">';
// // 	html += '<table class="table table-bordered table-hover" style="margin: 0;">';
	
// // 	// Table header
// // 	html += '<thead style="position: sticky; top: 0; background: white; z-index: 1;">';
// // 	html += '<tr style="background-color: #f5f7fa;">';
	
// // 	if (show_items) {
// // 		// Item-wise columns
// // 		html += '<th style="min-width: 120px;">Document</th>';
// // 		html += '<th style="min-width: 100px;">Date</th>';
		
// // 		// Add supplier/customer/purpose column based on transaction type
// // 		if (transaction_type === 'purchase_cost' || transaction_type === 'purchase_return') {
// // 			html += '<th style="min-width: 150px;">Supplier</th>';
// // 		} else if (transaction_type === 'issue_cost') {
// // 			html += '<th style="min-width: 150px;">Customer</th>';
// // 		} else {
// // 			html += '<th style="min-width: 120px;">Purpose</th>';
// // 		}
		
// // 		html += '<th style="min-width: 120px;">Item Code</th>';
// // 		html += '<th style="min-width: 150px;">Item Name</th>';
// // 		html += '<th style="min-width: 200px;">Description</th>';
// // 		html += '<th style="min-width: 200px;">Technical Description</th>';
// // 		html += '<th style="min-width: 120px;">Warehouse</th>';
// // 		html += '<th style="min-width: 100px; text-align: right;">Qty</th>';
// // 		html += '<th style="min-width: 100px; text-align: right;">Rate</th>';
// // 		html += '<th style="min-width: 120px; text-align: right;">Amount</th>';
// // 	} else {
// // 		// Document-wise columns
// // 		html += '<th style="min-width: 150px;">Document</th>';
// // 		html += '<th style="min-width: 100px;">Date</th>';
		
// // 		// Add supplier/customer/purpose column based on transaction type
// // 		if (transaction_type === 'purchase_cost' || transaction_type === 'purchase_return') {
// // 			html += '<th style="min-width: 200px;">Supplier</th>';
// // 		} else if (transaction_type === 'issue_cost') {
// // 			html += '<th style="min-width: 200px;">Customer</th>';
// // 		} else {
// // 			html += '<th style="min-width: 150px;">Purpose</th>';
// // 		}
		
// // 		html += '<th style="min-width: 150px; text-align: right;">Amount</th>';
// // 	}
	
// // 	html += '</tr>';
// // 	html += '</thead>';
	
// // 	// Table body
// // 	html += '<tbody>';
	
// // 	let total_amount = 0;
// // 	let current_doc = null;
	
// // 	data.forEach(function(row) {
// // 		total_amount += parseFloat(row.amount || 0);
		
// // 		html += '<tr>';
		
// // 		if (show_items) {
// // 			// Show document name only once per document
// // 			if (current_doc !== row.document_name) {
// // 				html += `<td><a href="/app/${get_doctype_route(transaction_type)}/${row.document_name}" target="_blank">${row.document_name}</a></td>`;
// // 				html += `<td>${frappe.datetime.str_to_user(row.posting_date)}</td>`;
// // 				html += `<td>${row.supplier || row.customer || row.purpose || ''}</td>`;
// // 				current_doc = row.document_name;
// // 			} else {
// // 				html += '<td></td><td></td><td></td>';
// // 			}
			
// // 			html += `<td>${row.item_code || ''}</td>`;
// // 			html += `<td>${row.item_name || ''}</td>`;
// // 			html += `<td>${row.description || ''}</td>`;
// // 			html += `<td>${row.technical_description || ''}</td>`;
// // 			html += `<td>${row.warehouse || ''}</td>`;
// // 			html += `<td style="text-align: right;">${format_number(row.qty, 3)}</td>`;
// // 			html += `<td style="text-align: right;">${format_currency(row.rate)}</td>`;
// // 			html += `<td style="text-align: right;"><strong>${format_currency(row.amount)}</strong></td>`;
// // 		} else {
// // 			html += `<td><a href="/app/${get_doctype_route(transaction_type)}/${row.document_name}" target="_blank">${row.document_name}</a></td>`;
// // 			html += `<td>${frappe.datetime.str_to_user(row.posting_date)}</td>`;
// // 			html += `<td>${row.supplier || row.customer || row.purpose || ''}</td>`;
// // 			html += `<td style="text-align: right;"><strong>${format_currency(row.amount)}</strong></td>`;
// // 		}
		
// // 		html += '</tr>';
// // 	});
	
// // 	// Total row
// // 	html += '<tr style="background-color: #f5f7fa; font-weight: bold;">';
// // 	if (show_items) {
// // 		html += '<td colspan="10" style="text-align: right;">Total:</td>';
// // 	} else {
// // 		html += '<td colspan="3" style="text-align: right;">Total:</td>';
// // 	}
// // 	html += `<td style="text-align: right;">${format_currency(total_amount)}</td>`;
// // 	html += '</tr>';
	
// // 	html += '</tbody>';
// // 	html += '</table>';
// // 	html += '</div>';
	
// // 	$wrapper.html(html);
// // }

// // function get_doctype_route(transaction_type) {
// // 	const doctype_map = {
// // 		'purchase_cost': 'purchase-receipt',
// // 		'purchase_return': 'purchase-receipt',
// // 		'issue_cost': 'delivery-note',
// // 		'other_receipt': 'stock-entry',
// // 		'other_issue': 'stock-entry',
// // 		'transfer_in': 'stock-entry',
// // 		'transfer_out': 'stock-entry'
// // 	};
// // 	return doctype_map[transaction_type] || 'stock-entry';
// // }

// // function format_currency(value) {
// // 	if (!value) return '0.00';
// // 	return parseFloat(value).toLocaleString('en-IN', {
// // 		minimumFractionDigits: 2,
// // 		maximumFractionDigits: 2
// // 	});
// // }

// // function format_number(value, decimals) {
// // 	if (!value) return '0.000';
// // 	return parseFloat(value).toLocaleString('en-IN', {
// // 		minimumFractionDigits: decimals || 3,
// // 		maximumFractionDigits: decimals || 3
// // 	});
// // }

// frappe.query_reports["Project Wise Stock"] = {
// 	"filters": [
// 		{
// 			"fieldname": "warehouse",
// 			"label": __("Warehouse"),
// 			"fieldtype": "Link",
// 			"options": "Warehouse",
// 			"default": "Project Material - WTT",
// 			"reqd": 1
// 		},
// 		{
// 			"fieldname": "from_date",
// 			"label": __("From Date"),
// 			"fieldtype": "Date",
// 			"default": frappe.datetime.month_start(),
// 			"reqd": 1
// 		},
// 		{
// 			"fieldname": "to_date",
// 			"label": __("To Date"),
// 			"fieldtype": "Date",
// 			"default": frappe.datetime.month_end(),
// 			"reqd": 1
// 		}
// 	]
// };

frappe.query_reports["Project Wise Stock"] = {
	"filters": [
		{
			"fieldname": "warehouse",
			"label": __("Warehouse"),
			"fieldtype": "Link",
			"options": "Warehouse",
			"default": "Project Material - WTT",
			"reqd": 1
		},
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.month_start(),
			"reqd": 1
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.month_end(),
			"reqd": 1
		}
	]
};
