// frappe.query_reports["Stock Summary"] = {
// 	filters: [
// 		// ===== Common filters =====
// 		{
// 			fieldname: "company",
// 			label: __("Company"),
// 			fieldtype: "Link",
// 			options: "Company",
// 			default: "WTT INTERNATIONAL PVT LTD",
// 			reqd: 1,
// 			read_only: 1
// 		},
// 		{
// 			fieldname: "from_date",
// 			label: __("From Date"),
// 			fieldtype: "Date",
// 			default: frappe.datetime.month_start(),
// 			reqd: 1
// 		},
// 		{
// 			fieldname: "to_date",
// 			label: __("To Date"),
// 			fieldtype: "Date",
// 			default: frappe.datetime.month_end(),
// 			reqd: 1
// 		},
// 		{
// 			fieldname: "include_child_warehouses",
// 			label: __("Include Child Warehouses"),
// 			fieldtype: "Check",
// 			default: 1,
// 			hidden: 1
// 		},

// 		// ===== Mode controller =====
// 		{
// 			fieldname: "view_mode",
// 			label: __("View Mode"),
// 			fieldtype: "Select",
// 			options: ["Summary", "Detail"],
// 			default: "Summary"
// 		},

// 		// ===== Detail filters =====
// 		{
// 			fieldname: "warehouse",
// 			label: __("Warehouse"),
// 			fieldtype: "Link",
// 			options: "Warehouse",
// 			depends_on: "eval:doc.view_mode=='Detail'"
// 		},
// 		{
// 			fieldname: "consolidate_by",
// 			label: __("Consolidate By"),
// 			fieldtype: "Select",
// 			options: ["", "Item Group Wise", "Warehouse Wise", "Bin Wise", "Project Wise"],
// 			default: "",
// 			depends_on: "eval:doc.view_mode=='Detail'"
// 		},
// 		{
// 			fieldname: "bin",
// 			label: __("Bin"),
// 			fieldtype: "Link",
// 			options: "Physical Bin",
// 			depends_on: "eval:doc.view_mode=='Detail'"
// 		},
// 		{
// 			fieldname: "rack_no",
// 			label: __("Rack No"),
// 			fieldtype: "Link",
// 			options: "RACK",
// 			depends_on: "eval:doc.view_mode=='Detail'"
// 		},
// 		{
// 			fieldname: "project",
// 			label: __("Project"),
// 			fieldtype: "Link",
// 			options: "Project",
// 			depends_on: "eval:doc.view_mode=='Detail'"
// 		},
// 		{
// 			fieldname: "item_code",
// 			label: __("Item Code"),
// 			fieldtype: "Link",
// 			options: "Item",
// 			depends_on: "eval:doc.view_mode=='Detail'"
// 		},
// 		{
// 			fieldname: "number_of_bins",
// 			label: __("Number of Bins (Random)"),
// 			fieldtype: "Int",
// 			depends_on: "eval:doc.view_mode=='Detail'"
// 		},
// 		{
// 			fieldname: "item_wise_bin",
// 			label: __("Item wise Bin"),
// 			fieldtype: "Check",
// 			default: 0,
// 			depends_on: "eval:doc.view_mode=='Detail'"
// 		},
// 		{
// 			fieldname: "project_wise_bin",
// 			label: __("Project wise Bin"),
// 			fieldtype: "Check",
// 			default: 0,
// 			depends_on: "eval:doc.view_mode=='Detail'"
// 		},
// 		{
// 			fieldname: "transaction_breakdown",
// 			label: __("Transaction Breakdown"),
// 			fieldtype: "Select",
// 			options: [
// 				"",
// 				"Purchase Cost (Receipt Amount)",
// 				"Purchase Return Cost (Return Amount)",
// 				"Issue Cost",
// 				"Other Receipt Cost",
// 				"Other Issue Cost",
// 				"Transfer IN Amount",
// 				"Transfer OUT Amount"
// 			],
// 			default: "",
// 			depends_on: "eval:doc.view_mode=='Detail'"
// 		}
// 	],

// 	onload: function () {
// 		// Hide WIP - Job Work - WTT from Warehouse filter dropdown
// 		const wh_filter = frappe.query_report.get_filter("warehouse");
// 		if (wh_filter) {
// 			wh_filter.get_query = function () {
// 				return {
// 					filters: [
// 						["Warehouse", "name", "!=", "WIP - Job Work - WTT"]
// 					]
// 				};
// 			};
// 		}

// 		// ── Toolbar: "Job Work" button ──
// 		frappe.query_report.page.add_inner_button(__("Job Work"), function () {
// 			frappe.query_report.set_filter_value("view_mode", "Detail");
// 			frappe.query_report.set_filter_value("warehouse", "Job Work - WTT");
// 			frappe.query_report.set_filter_value("project", "");
// 			frappe.query_report.refresh();
// 		});

// 		// ── Toolbar: "Project" button ──
// 		// Loads Project Wise Stock (no project filter = listing view)
// 		frappe.query_report.page.add_inner_button(__("Project"), function () {
// 			frappe.query_report.set_filter_value("view_mode", "Detail");
// 			frappe.query_report.set_filter_value("warehouse", "Project Material - WTT");
// 			frappe.query_report.set_filter_value("project", "");
// 			frappe.query_report.refresh();
// 		});

// 		// ── Summary view: warehouse name drilldown link ──
// 		$(document).off("click.stock_summary_drilldown");
// 		$(document).on("click.stock_summary_drilldown", "a.ss-drilldown", function (e) {
// 			e.preventDefault();
// 			e.stopPropagation();

// 			const wh = $(this).attr("data-warehouse");
// 			if (!wh) return;

// 			frappe.query_report.set_filter_value("warehouse", wh);
// 			frappe.query_report.set_filter_value("view_mode", "Detail");
// 			frappe.query_report.set_filter_value("project", "");
// 			frappe.query_report.refresh();
// 		});

// 		// ── Job Wise Stock: "View Detail" button ──
// 		// Sets child warehouse → Consolidate Stock Statement
// 		$(document).off("click.ss_job_view_detail");
// 		$(document).on("click.ss_job_view_detail", "button.ss-job-detail-btn", function (e) {
// 			e.preventDefault();
// 			e.stopPropagation();

// 			const child_wh = $(this).attr("data-child-warehouse");
// 			if (!child_wh) {
// 				frappe.msgprint(__("No warehouse found for this row."));
// 				return;
// 			}

// 			// child_wh is a real child warehouse → hits else branch → Consolidate Stock Statement
// 			frappe.query_report.set_filter_value("warehouse", child_wh);
// 			frappe.query_report.set_filter_value("project", "");
// 			frappe.query_report.set_filter_value("view_mode", "Detail");
// 			frappe.query_report.refresh();
// 		});

// 		// ── Project Wise Stock: "View Detail" button ──
// 		// Keeps warehouse = Project Material - WTT, sets project filter
// 		// Python sees: warehouse = PROJECT_PARENT_WAREHOUSE + project = X
// 		// → hits the new elif branch → runs Consolidate Stock Statement
// 		$(document).off("click.ss_project_view_detail");
// 		$(document).on("click.ss_project_view_detail", "button.ss-project-detail-btn", function (e) {
// 			e.preventDefault();
// 			e.stopPropagation();

// 			const project = $(this).attr("data-project");
// 			if (!project) {
// 				frappe.msgprint(__("No project found for this row."));
// 				return;
// 			}

// 			// warehouse stays Project Material - WTT
// 			// project is set → Python routes to Consolidate Stock Statement
// 			frappe.query_report.set_filter_value("warehouse", "Project Material - WTT");
// 			frappe.query_report.set_filter_value("project", project);
// 			frappe.query_report.set_filter_value("view_mode", "Detail");
// 			frappe.query_report.refresh();
// 		});
// 	},

// 	on_refresh: function () {
// 		const filters = frappe.query_report.get_filter_values() || {};
// 		const view_mode = filters.view_mode || "Summary";

// 		if (view_mode === "Detail") {
// 			hide_total_row_robust();
// 			setTimeout(hide_total_row_robust, 150);
// 			setTimeout(hide_total_row_robust, 400);
// 			setTimeout(hide_total_row_robust, 800);
// 		}
// 	},

// 	formatter: function (value, row, column, data, default_formatter) {
// 		value = default_formatter(value, row, column, data);

// 		const filters = frappe.query_report.get_filter_values() || {};
// 		const view_mode = filters.view_mode || "Summary";
// 		const active_warehouse = (filters.warehouse || "").trim();
// 		const active_project = (filters.project || "").trim();

// 		// ── Summary view: warehouse column drilldown link ──
// 		if (
// 			view_mode === "Summary" &&
// 			column.fieldname === "warehouse" &&
// 			data && data.warehouse &&
// 			String(data.warehouse).trim() !== "Total"
// 		) {
// 			const wh = frappe.utils.escape_html(data.warehouse);
// 			return `
// 				<a href="#"
// 				   class="ss-drilldown"
// 				   data-warehouse="${wh}"
// 				   style="color:#2490ef; text-decoration:underline; cursor:pointer;">
// 					${value}
// 				</a>
// 			`;
// 		}

// 		// ── Detail mode, Job Work - WTT: "View Detail" button ──
// 		if (
// 			view_mode === "Detail" &&
// 			active_warehouse === "Job Work - WTT" &&
// 			column.fieldname === "action" &&
// 			data && data.jw_child_warehouse
// 		) {
// 			const child_wh = frappe.utils.escape_html(data.jw_child_warehouse);
// 			return `
// 				<button
// 					class="btn btn-xs btn-default ss-job-detail-btn"
// 					data-child-warehouse="${child_wh}"
// 					style="font-size:11px; padding:2px 8px; border-radius:4px; cursor:pointer; white-space:nowrap;">
// 					View Detail
// 				</button>
// 			`;
// 		}

// 		// ── Detail mode, Project Material - WTT, NO project filter active:
// 		//    Project Wise Stock listing → show "View Detail" button ──
// 		if (
// 			view_mode === "Detail" &&
// 			active_warehouse === "Project Material - WTT" &&
// 			!active_project &&
// 			column.fieldname === "action" &&
// 			data && data.pw_project
// 		) {
// 			const project = frappe.utils.escape_html(data.pw_project);
// 			return `
// 				<button
// 					class="btn btn-xs btn-default ss-project-detail-btn"
// 					data-project="${project}"
// 					style="font-size:11px; padding:2px 8px; border-radius:4px; cursor:pointer; white-space:nowrap;">
// 					View Detail
// 				</button>
// 			`;
// 		}

// 		return value;
// 	}
// };


// // ---------- total row killer for Detail view ----------
// function hide_total_row_robust() {
// 	const root = document.querySelector("#page-query-report") || document;

// 	root.querySelectorAll(".dt-footer, .datatable-footer").forEach((f) => {
// 		f.style.display = "none";
// 	});

// 	const rows = root.querySelectorAll(".datatable .dt-row, .dt-row");
// 	rows.forEach((row) => {
// 		const firstCell = row.querySelector(".dt-cell__content") || row.querySelector(".dt-cell");
// 		if (!firstCell) return;

// 		const txt = (firstCell.textContent || "").trim();
// 		if (txt === "Total") {
// 			row.style.display = "none";
// 		}
// 	});
// }

frappe.query_reports["Stock Summary"] = {
	filters: [
		// ===== Common filters =====
		{
			fieldname: "company",
			label: __("Company"),
			fieldtype: "Link",
			options: "Company",
			default: "WTT INTERNATIONAL PVT LTD",
			reqd: 1,
			read_only: 1
		},
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.month_start(),
			reqd: 1
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.month_end(),
			reqd: 1
		},
		{
			fieldname: "include_child_warehouses",
			label: __("Include Child Warehouses"),
			fieldtype: "Check",
			default: 1,
			hidden: 1
		},

		// ===== Mode controller =====
		{
			fieldname: "view_mode",
			label: __("View Mode"),
			fieldtype: "Select",
			options: ["Summary", "Detail"],
			default: "Summary"
		},

		// ===== Detail filters =====
		{
			fieldname: "warehouse",
			label: __("Warehouse"),
			fieldtype: "Link",
			options: "Warehouse",
			depends_on: "eval:doc.view_mode=='Detail'"
		},
		{
			fieldname: "consolidate_by",
			label: __("Consolidate By"),
			fieldtype: "Select",
			options: ["", "Item Group Wise", "Warehouse Wise", "Bin Wise", "Project Wise"],
			default: "",
			depends_on: "eval:doc.view_mode=='Detail'"
		},
		{
			fieldname: "bin",
			label: __("Bin"),
			fieldtype: "Link",
			options: "Physical Bin",
			depends_on: "eval:doc.view_mode=='Detail'"
		},
		{
			fieldname: "rack_no",
			label: __("Rack No"),
			fieldtype: "Link",
			options: "RACK",
			depends_on: "eval:doc.view_mode=='Detail'"
		},
		{
			fieldname: "project",
			label: __("Project"),
			fieldtype: "Link",
			options: "Project",
			depends_on: "eval:doc.view_mode=='Detail'"
		},
		{
			fieldname: "item_code",
			label: __("Item Code"),
			fieldtype: "Link",
			options: "Item",
			depends_on: "eval:doc.view_mode=='Detail'"
		},
		{
			fieldname: "number_of_bins",
			label: __("Number of Bins (Random)"),
			fieldtype: "Int",
			depends_on: "eval:doc.view_mode=='Detail'"
		},
		{
			fieldname: "item_wise_bin",
			label: __("Item wise Bin"),
			fieldtype: "Check",
			default: 0,
			depends_on: "eval:doc.view_mode=='Detail'"
		},
		{
			fieldname: "project_wise_bin",
			label: __("Project wise Bin"),
			fieldtype: "Check",
			default: 0,
			depends_on: "eval:doc.view_mode=='Detail'"
		},
		{
			fieldname: "transaction_breakdown",
			label: __("Transaction Breakdown"),
			fieldtype: "Select",
			options: [
				"",
				"Purchase Cost (Receipt Amount)",
				"Purchase Return Cost (Return Amount)",
				"Issue Cost",
				"Other Receipt Cost",
				"Other Issue Cost",
				"Transfer IN Amount",
				"Transfer OUT Amount"
			],
			default: "",
			depends_on: "eval:doc.view_mode=='Detail'"
		}
	],

	onload: function () {
		// Hide WIP - Job Work - WTT from Warehouse filter dropdown
		const wh_filter = frappe.query_report.get_filter("warehouse");
		if (wh_filter) {
			wh_filter.get_query = function () {
				return {
					filters: [
						["Warehouse", "name", "!=", "WIP - Job Work - WTT"]
					]
				};
			};
		}

		// ── Toolbar: "Job Work" button ──
		frappe.query_report.page.add_inner_button(__("Job Work"), function () {
			frappe.query_report.set_filter_value("view_mode", "Detail");
			frappe.query_report.set_filter_value("warehouse", "Job Work - WTT");
			frappe.query_report.set_filter_value("project", "");
			frappe.query_report.refresh();
		});

		// ── Toolbar: "Project" button ──
		// Loads Project Wise Stock (no project filter = listing view)
		frappe.query_report.page.add_inner_button(__("Project"), function () {
			frappe.query_report.set_filter_value("view_mode", "Detail");
			frappe.query_report.set_filter_value("warehouse", "Project Material - WTT");
			frappe.query_report.set_filter_value("project", "");
			frappe.query_report.refresh();
		});

		// ── Toolbar: "Sachin Stock" button ──
		// Loads Sachin Stock report
		frappe.query_report.page.add_inner_button(__("Sachin Stock"), function () {
			frappe.query_report.set_filter_value("view_mode", "Detail");
			frappe.query_report.set_filter_value("warehouse", "Sachin Project - WTT");
			frappe.query_report.set_filter_value("project", "");
			frappe.query_report.refresh();
		});

		// ── Summary view: warehouse name drilldown link ──
		$(document).off("click.stock_summary_drilldown");
		$(document).on("click.stock_summary_drilldown", "a.ss-drilldown", function (e) {
			e.preventDefault();
			e.stopPropagation();

			const wh = $(this).attr("data-warehouse");
			if (!wh) return;

			frappe.query_report.set_filter_value("warehouse", wh);
			frappe.query_report.set_filter_value("view_mode", "Detail");
			frappe.query_report.set_filter_value("project", "");
			frappe.query_report.refresh();
		});

		// ── Job Wise Stock: "View Detail" button ──
		// Sets child warehouse → Consolidate Stock Statement
		$(document).off("click.ss_job_view_detail");
		$(document).on("click.ss_job_view_detail", "button.ss-job-detail-btn", function (e) {
			e.preventDefault();
			e.stopPropagation();

			const child_wh = $(this).attr("data-child-warehouse");
			if (!child_wh) {
				frappe.msgprint(__("No warehouse found for this row."));
				return;
			}

			// child_wh is a real child warehouse → hits else branch → Consolidate Stock Statement
			frappe.query_report.set_filter_value("warehouse", child_wh);
			frappe.query_report.set_filter_value("project", "");
			frappe.query_report.set_filter_value("view_mode", "Detail");
			frappe.query_report.refresh();
		});

		// ── Project Wise Stock: "View Detail" button ──
		// Keeps warehouse = Project Material - WTT, sets project filter
		// Python sees: warehouse = PROJECT_PARENT_WAREHOUSE + project = X
		// → hits the new elif branch → runs Consolidate Stock Statement
		$(document).off("click.ss_project_view_detail");
		$(document).on("click.ss_project_view_detail", "button.ss-project-detail-btn", function (e) {
			e.preventDefault();
			e.stopPropagation();

			const project = $(this).attr("data-project");
			if (!project) {
				frappe.msgprint(__("No project found for this row."));
				return;
			}

			// warehouse stays Project Material - WTT
			// project is set → Python routes to Consolidate Stock Statement
			frappe.query_report.set_filter_value("warehouse", "Project Material - WTT");
			frappe.query_report.set_filter_value("project", project);
			frappe.query_report.set_filter_value("view_mode", "Detail");
			frappe.query_report.refresh();
		});
	},

	on_refresh: function () {
		const filters = frappe.query_report.get_filter_values() || {};
		const view_mode = filters.view_mode || "Summary";

		if (view_mode === "Detail") {
			hide_total_row_robust();
			setTimeout(hide_total_row_robust, 150);
			setTimeout(hide_total_row_robust, 400);
			setTimeout(hide_total_row_robust, 800);
		}
	},

	formatter: function (value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		const filters = frappe.query_report.get_filter_values() || {};
		const view_mode = filters.view_mode || "Summary";
		const active_warehouse = (filters.warehouse || "").trim();
		const active_project = (filters.project || "").trim();

		// ── Summary view: warehouse column drilldown link ──
		if (
			view_mode === "Summary" &&
			column.fieldname === "warehouse" &&
			data && data.warehouse &&
			String(data.warehouse).trim() !== "Total"
		) {
			const wh = frappe.utils.escape_html(data.warehouse);
			return `
				<a href="#"
				   class="ss-drilldown"
				   data-warehouse="${wh}"
				   style="color:#2490ef; text-decoration:underline; cursor:pointer;">
					${value}
				</a>
			`;
		}

		// ── Detail mode, Job Work - WTT: "View Detail" button ──
		if (
			view_mode === "Detail" &&
			active_warehouse === "Job Work - WTT" &&
			column.fieldname === "action" &&
			data && data.jw_child_warehouse
		) {
			const child_wh = frappe.utils.escape_html(data.jw_child_warehouse);
			return `
				<button
					class="btn btn-xs btn-default ss-job-detail-btn"
					data-child-warehouse="${child_wh}"
					style="font-size:11px; padding:2px 8px; border-radius:4px; cursor:pointer; white-space:nowrap;">
					View Detail
				</button>
			`;
		}

		// ── Detail mode, Project Material - WTT, NO project filter active:
		//    Project Wise Stock listing → show "View Detail" button ──
		if (
			view_mode === "Detail" &&
			active_warehouse === "Project Material - WTT" &&
			!active_project &&
			column.fieldname === "action" &&
			data && data.pw_project
		) {
			const project = frappe.utils.escape_html(data.pw_project);
			return `
				<button
					class="btn btn-xs btn-default ss-project-detail-btn"
					data-project="${project}"
					style="font-size:11px; padding:2px 8px; border-radius:4px; cursor:pointer; white-space:nowrap;">
					View Detail
				</button>
			`;
		}

		return value;
	}
};


// ---------- total row killer for Detail view ----------
function hide_total_row_robust() {
	const root = document.querySelector("#page-query-report") || document;

	root.querySelectorAll(".dt-footer, .datatable-footer").forEach((f) => {
		f.style.display = "none";
	});

	const rows = root.querySelectorAll(".datatable .dt-row, .dt-row");
	rows.forEach((row) => {
		const firstCell = row.querySelector(".dt-cell__content") || row.querySelector(".dt-cell");
		if (!firstCell) return;

		const txt = (firstCell.textContent || "").trim();
		if (txt === "Total") {
			row.style.display = "none";
		}
	});
}