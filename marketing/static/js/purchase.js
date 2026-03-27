const API_BASE = "/api/purchase";

function apiUrl(endpoint, project) {
  const base = `${API_BASE}/${endpoint}`;
  return (project && project.trim() !== "") ? `${base}?project=${encodeURIComponent(project)}` : base;
}

let _allProjects = [];

async function loadProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`);
    const data = await res.json();
    console.log('API Response:', data);
    
    const raw = data?.message ?? [];
    console.log('Raw message:', raw);
    
    const projects = [];
    
    // Check if it's an array (new format)
    if (Array.isArray(raw)) {
      console.log('Processing array format');
      raw.forEach(item => {
        if (item && typeof item === 'object') {
          const code = item.code || item.project || item.name || '';
          const name = item.name || item.project_name || item.label || code;
          const label = item.label || `${code} - ${name}`;
          if (code) {
            projects.push({ code, name, label });
            console.log('Parsed project:', { code, name, label });
          }
        }
      });
    }
    // Check if it's a string (old format)
    else if (typeof raw === 'string' && raw.trim()) {
      console.log('Processing string format');
      const lines = raw.trim().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(" - ", 1);
        const code = parts[0].trim();
        const restOfLine = line.substring(code.length).trim();
        const name = restOfLine.startsWith("- ") ? restOfLine.substring(2).trim() : restOfLine;
        const label = name ? `${code} - ${name}` : code;
        projects.push({ code, name: name || code, label });
        console.log('Parsed project:', { code, name, label });
      }
    }
    
    _allProjects = [{ code: "", label: "All Projects" }, ...projects];
    console.log('Total projects loaded:', _allProjects.length);
    console.log('All projects:', _allProjects);

    const select = document.getElementById("projectSelect");
    select.innerHTML = "";
    _allProjects.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.code;
      opt.textContent = p.label;
      select.appendChild(opt);
    });

    const defaultProject = projects.find(p => p.code === "WTT-0528");
    const defaultCode = defaultProject ? defaultProject.code : "";
    console.log('Setting default project:', defaultCode);
    setSelectedProject(defaultCode);
    renderProjectOptions(_allProjects);
    loadDashboard();
  } catch (err) {
    console.error("❌ Projects failed:", err);
    _allProjects = [{ code: "", label: "All Projects" }];
    renderProjectOptions(_allProjects);
    loadDashboard();
  }
}

function renderProjectOptions(list) {
  const container = document.getElementById("customSelectOptions");
  if (!container) {
    console.error('customSelectOptions not found!');
    return;
  }
  
  console.log('Rendering', list.length, 'options');
  container.innerHTML = "";
  
  if (list.length === 0) {
    container.innerHTML = `<div class="custom-option-empty">No projects found</div>`;
    return;
  }
  
  const currentVal = document.getElementById("projectSelect").value;
  list.forEach(p => {
    const div = document.createElement("div");
    div.className = "custom-option" + (p.code === currentVal ? " selected" : "");
    div.textContent = p.label;
    div.dataset.value = p.code;
    div.addEventListener("click", () => {
      setSelectedProject(p.code);
      closeProjectDropdown();
      loadDashboard();
    });
    container.appendChild(div);
  });
  
  console.log('Rendered', container.children.length, 'option elements');
}

function filterProjects() {
  const input = document.getElementById("projectSearchInput");
  if (!input) {
    console.error('projectSearchInput not found!');
    return;
  }
  
  const q = input.value.toLowerCase().trim();
  console.log('Filter query:', q);
  console.log('Filtering from', _allProjects.length, 'projects');
  
  const filtered = _allProjects.filter(p => p.label.toLowerCase().includes(q));
  console.log('Filtered results:', filtered.length);
  
  renderProjectOptions(filtered);
}

function setSelectedProject(code) {
  const select = document.getElementById("projectSelect");
  select.value = code;
  const proj = _allProjects.find(p => p.code === code);
  document.getElementById("customSelectText").textContent = proj ? proj.label : "All Projects";
  document.querySelectorAll(".custom-option").forEach(el => {
    el.classList.toggle("selected", el.dataset.value === code);
  });
}

function toggleProjectDropdown() {
  const dropdown = document.getElementById("customSelectDropdown");
  const chevron  = document.getElementById("customSelectChevron");
  const isOpen = dropdown.style.display !== "none";
  if (isOpen) {
    closeProjectDropdown();
  } else {
    dropdown.style.display = "block";
    chevron.classList.add("open");
    const searchInput = document.getElementById("projectSearchInput");
    searchInput.value = "";
    renderProjectOptions(_allProjects);
    setTimeout(() => searchInput.focus(), 50);
  }
}

function closeProjectDropdown() {
  document.getElementById("customSelectDropdown").style.display = "none";
  document.getElementById("customSelectChevron").classList.remove("open");
}

document.addEventListener("click", function(e) {
  const wrap = document.getElementById("projectSelectorWrap");
  if (wrap && !wrap.contains(e.target)) closeProjectDropdown();
});
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") closeProjectDropdown();
});

function onProjectChange() { loadDashboard(); }





async function loadDashboard() {
  const project = document.getElementById("projectSelect").value;

  document.querySelectorAll(".kpi-value").forEach(el => el.textContent = "—");

  await Promise.all([
    fetchCounts(project),
    fetchMrMadePoPending(project),
    fetchMrPending(project),
    fetchPoPending(project),
    fetchPaymentPending(project),
    fetchPoDelayTransit(project),
    fetchPoOnTransit(project),
    fetchCompletedPurchaseOrders(project),
    fetchCompletedMrOrders(project)
  ]);
}

async function fetchCounts(project) {
  try {
    const res = await fetch(apiUrl("dashboard_counts", project));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const p = data?.message ?? data;
    setKpi("kpi_mr_made_po_pending", p?.mr_made_po_pending);
    if (p?.mr_pending != null) {
      setKpi("kpi_mr_pending", p.mr_pending);
    }
    if (p?.po_pending != null) {
      setKpi("kpi_po_pending", p.po_pending);
    }
    if (p?.payment_pending != null) {
      setKpi("kpi_payment_pending", p.payment_pending);
    }
    setKpi("kpi_po_delay_transit",   p?.po_delay_transit);
    setKpi("kpi_po_on_transit",      p?.po_on_transit);
    document.getElementById("errorMsg").style.display = "none";
  } catch(e) {
    console.error("fetchCounts error:", e);
    document.getElementById("errorMsg").style.display = "inline";
  }
}

async function fetchMrMadePoPending(project) {
  try {
    const res = await fetch(apiUrl("mr_items_without_po", project));
    const data = await res.json();
    const payload = data?.message ?? data;
    const rows = payload?.data ?? (Array.isArray(payload) ? payload : []);
    const total = payload?.count ?? rows.length;
    
    setKpi("kpi_mr_made_po_pending", total);
    document.getElementById("badge_mr_made_po").textContent = total;
    
    document.getElementById("tb_mr_made_po").innerHTML = rows.length === 0
      ? '<tr><td colspan="4" class="empty">No records</td></tr>'
      : rows.map((r, i) => {
          const items = r.items ?? [];
          const itemCount = items.length;
          const itemName = itemCount > 0 ? items[0].item_name ?? items[0].description ?? "-" : (r.item_name ?? r.description ?? "-");
          const itemDesc = itemCount > 1 ? itemName + " (" + itemCount + " items)" : itemName;
          const mrQty = itemCount > 0 ? items.reduce((sum, item) => sum + (item.mr_qty ?? 0), 0) : (r.mr_qty ?? r.total_qty ?? r.qty ?? 0);
          const pending = itemCount > 0 ? items.reduce((sum, item) => sum + (item.pending_qty ?? 0), 0) : (r.pending_qty ?? r.pending ?? 0);
          const pendingClass = pending > 0 ? "age-red" : "age-green";
          const formatNum = (n) => n % 1 === 0 ? n : Number(n).toFixed(1);
          return '<tr class="' + (i%2===0?'':'alt') + '">'
            + '<td class="link">' + (r.material_request ?? r.mr_no ?? "-") + '</td>'
            + '<td>' + itemDesc + '</td>'
            + '<td>' + formatNum(mrQty) + '</td>'
            + '<td class="' + pendingClass + '">' + formatNum(pending) + '</td>'
            + '</tr>';
        }).join("");
  } catch(e) {
    console.error("fetchMrMadePoPending error:", e);
    document.getElementById("tb_mr_made_po").innerHTML = '<tr><td colspan="4" class="empty">Failed to load</td></tr>';
  }
}

async function fetchMrPending(project) {
  try {
    const res = await fetch(apiUrl("mr_pending", project));
    const data = await res.json();
    const payload = data?.message ?? data;
    const rows = payload?.data ?? (Array.isArray(payload) ? payload : []);
    const mrPendingCount = payload?.count ?? rows.length;
    document.getElementById("badge_mr_pending").textContent = mrPendingCount;
    setKpi("kpi_mr_pending", mrPendingCount);
    document.getElementById("tb_mr_pending").innerHTML = rows.length === 0
      ? '<tr><td colspan="5" class="empty">No pending records</td></tr>'
      : rows.map((r, i) => {
          const status = (r.status ?? "").toLowerCase();
          const statusClass = status.includes("approved") ? "approved" : status.includes("pending") ? "pending" : "";
          return '<tr class="' + (i%2===0?'':'alt') + '">'
            + '<td>' + (r.creation_date ?? r.date ?? "-") + '</td>'
            + '<td class="link">' + (r.mr_no ?? r.name ?? "-") + '</td>'
            + '<td><span class="status-badge ' + statusClass + '">' + (r.status ?? "-") + '</span></td>'
            + '<td class="' + getAgeClass(r.age_days ?? r.age) + '">' + (r.age_days ?? r.age ?? "-") + '</td>'
            + '<td>' + (r.project_remarks ?? r.remarks ?? "-") + '</td>'
            + '</tr>';
        }).join("");
  } catch(e) {
    document.getElementById("tb_mr_pending").innerHTML = '<tr><td colspan="5" class="empty">Failed to load</td></tr>';
  }
}

async function fetchPoPending(project) {
  try {
    const res = await fetch(apiUrl("pending_purchase_orders", project));
    const data = await res.json();
    const payload = data?.message ?? data;
    const rows = payload?.data ?? (Array.isArray(payload) ? payload : []);
    const count = payload?.count ?? rows.length;
    document.getElementById("badge_po_pending").textContent = count;
    setKpi("kpi_po_pending", count);
    document.getElementById("tb_po_pending").innerHTML = rows.length === 0
      ? '<tr><td colspan="5" class="empty">No pending records</td></tr>'
      : rows.map((r, i) => {
          const status = (r.status ?? "").toLowerCase();
          const statusClass = status.includes("approved") ? "approved" : "";
          return '<tr class="' + (i%2===0?'':'alt') + '">'
            + '<td class="link">' + (r.po_no ?? r.name ?? "-") + '</td>'
            + '<td>' + (r.created_date ?? r.date ?? "-") + '</td>'
            + '<td><span class="status-badge ' + statusClass + '">' + (r.status ?? "-") + '</span></td>'
            + '<td>' + (r.supplier ?? r.supplier_name ?? "-") + '</td>'
            + '<td class="' + getAgeClass(r.age_days ?? r.age) + '">' + (r.age_days ?? r.age ?? "-") + '</td>'
            + '</tr>';
        }).join("");
  } catch(e) {
    document.getElementById("tb_po_pending").innerHTML = '<tr><td colspan="5" class="empty">Failed to load</td></tr>';
  }
}

async function fetchPaymentPending(project) {
  try {
    const res = await fetch(apiUrl("pending_payments", project));
    const data = await res.json();
    const payload = data?.message ?? data;
    const rows = payload?.data ?? (Array.isArray(payload) ? payload : []);
    const count = payload?.count ?? rows.length;
    document.getElementById("badge_payment_pending").textContent = count;
    setKpi("kpi_payment_pending", count);
    document.getElementById("tb_payment_pending").innerHTML = rows.length === 0
      ? '<tr><td colspan="5" class="empty">No pending records</td></tr>'
      : rows.map((r, i) => {
          const wf = (r.workflow_state ?? "").toLowerCase();
          const wfClass = wf.includes("verified") ? "verified" : wf.includes("approved") ? "approved" : "";
          return '<tr class="' + (i%2===0?'':'alt') + '">'
            + '<td>' + (r.created_date ?? r.date ?? "-") + '</td>'
            + '<td class="link">' + (r.payment ?? r.payment_no ?? r.name ?? "-") + '</td>'
            + '<td>' + (r.payment_type ?? r.type ?? "-") + '</td>'
            + '<td><span class="status-badge ' + wfClass + '">' + (r.workflow_state ?? "-") + '</span></td>'
            + '<td class="' + getAgeClass(r.age_days ?? r.age) + '">' + (r.age_days ?? r.age ?? "-") + '</td>'
            + '</tr>';
        }).join("");
  } catch(e) {
    document.getElementById("tb_payment_pending").innerHTML = '<tr><td colspan="5" class="empty">Failed to load</td></tr>';
  }
}

async function fetchPoDelayTransit(project) {
  try {
    const res = await fetch(apiUrl("po_delay_transit", project));
    const data = await res.json();
    const payload = data?.message ?? data;
    const rows = payload?.data ?? (Array.isArray(payload) ? payload : []);
    const count = payload?.count ?? rows.length;
    
    setKpi("kpi_po_delay_transit", count);
    document.getElementById("badge_po_delay_transit").textContent = count;
    
    document.getElementById("tb_po_delay_transit").innerHTML = rows.length === 0
      ? '<tr><td colspan="5" class="empty">No delay records</td></tr>'
      : rows.map((r, i) => {
          const delay = r.delay_days ?? r.delay ?? 0;
          const delayClass = delay >= 30 ? "delay-red" : delay >= 10 ? "delay-orange" : "age-green";
          const qtyStr = r["po_qty/pr_qty/pending"] ?? ((r.po_qty ?? "") + (r.pr_qty != null ? " / " + r.pr_qty : ""));
          return '<tr class="' + (i%2===0?'':'alt') + '">'
            + '<td class="link">' + (r.po_no ?? r.name ?? "-") + '</td>'
            + '<td>' + (r.delivery_from ?? r.schedule_date ?? "-") + '</td>'
            + '<td>' + (r.delivery_to ?? r.expected_delivery ?? "-") + '</td>'
            + '<td>' + (qtyStr || "-") + '</td>'
            + '<td class="' + delayClass + '">' + delay + 'd</td>'
            + '</tr>';
        }).join("");
  } catch(e) {
    console.error("fetchPoDelayTransit error:", e);
    document.getElementById("tb_po_delay_transit").innerHTML = '<tr><td colspan="5" class="empty">Failed to load</td></tr>';
  }
}

async function fetchPoOnTransit(project) {
  try {
    const res = await fetch(apiUrl("po_on_transit", project));
    const data = await res.json();
    const payload = data?.message ?? data;
    const rows = payload?.data ?? (Array.isArray(payload) ? payload : []);
    const count = payload?.count ?? rows.length;
    
    setKpi("kpi_po_on_transit", count);
    document.getElementById("badge_po_on_transit").textContent = count;
    
    document.getElementById("tb_po_on_transit").innerHTML = rows.length === 0
      ? '<tr><td colspan="5" class="empty">No transit records</td></tr>'
      : rows.map((r, i) => {
          const days = r.days_remaining ?? r.days ?? 0;
          const daysClass = days < 0 ? "days-neg" : days <= 3 ? "days-warn" : "days-ok";
          const daysLabel = days < 0 ? days + "d" : "+" + days + "d";
          return '<tr class="' + (i%2===0?'':'alt') + '">'
            + '<td class="link">' + (r.po_no ?? r.name ?? "-") + '</td>'
            + '<td>' + (r.supplier ?? r.supplier_name ?? "-") + '</td>'
            + '<td>' + (r.expected_delivery_date ?? r.expected_delivery ?? r.schedule_date ?? "-") + '</td>'
            + '<td>' + (r.expected_received_date ?? r.expected_received ?? r.receipt_date ?? "-") + '</td>'
            + '<td class="' + daysClass + '">' + daysLabel + '</td>'
            + '</tr>';
        }).join("");
  } catch(e) {
    console.error("fetchPoOnTransit error:", e);
    document.getElementById("tb_po_on_transit").innerHTML = '<tr><td colspan="5" class="empty">Failed to load</td></tr>';
  }
}

async function fetchCompletedPurchaseOrders(project) {
  try {
    const res = await fetch(apiUrl("completed_purchase_orders", project));
    const data = await res.json();
    const payload = data?.message ?? data;
    const rows = payload?.data ?? (Array.isArray(payload) ? payload : []);

    const count = payload?.count ?? rows.length;

    document.getElementById("badge_po_completed").textContent = count;
    setKpi("kpi_po_completed_count", count);

    document.getElementById("tb_po_completed").innerHTML = rows.length === 0
      ? '<tr><td colspan="7" class="empty">No records</td></tr>'
      : rows.map((r, i) => {
          const wf = (r.workflow_state ?? "").toLowerCase();
          const wfClass = wf.includes("approved") ? "approved" : "";

          return '<tr class="' + (i%2===0?'':'alt') + '">'
            + '<td class="link">' + (r.purchase_order ?? r.po_no ?? "-") + '</td>'
            + '<td>' + (r.created_date ?? r.date ?? "-") + '</td>'
            + '<td>' + (r.supplier ?? r.supplier_name ?? "-") + '</td>'
            + '<td>&#8377;' + (r.total_amount != null ? Number(r.total_amount).toLocaleString() : "-") + '</td>'
            + '<td><span class="status-badge ' + wfClass + '">' + (r.workflow_state ?? "-") + '</span></td>'
            + '<td>' + (r.status ?? "-") + '</td>'
            + '<td class="' + getAgeClass(r.age_days ?? r.age) + '">' + (r.age_days ?? r.age ?? "-") + '</td>'
            + '</tr>';
        }).join("");

  } catch(e) {
    document.getElementById("tb_po_completed").innerHTML =
      '<tr><td colspan="7" class="empty">Failed to load</td></tr>';
  }
}

async function fetchCompletedMrOrders(project) {
  try {
    const res = await fetch(apiUrl("completed_mr_orders", project));
    const data = await res.json();
    const payload = data?.message ?? data;
    const rows = payload?.data ?? (Array.isArray(payload) ? payload : []);

    const count = payload?.count ?? rows.length;

    document.getElementById("badge_mr_completed").textContent = count;
    setKpi("kpi_mr_completed_count", count);

    document.getElementById("tb_mr_completed").innerHTML = rows.length === 0
      ? '<tr><td colspan="6" class="empty">No records</td></tr>'
      : rows.map((r, i) => {
          const wf = (r.workflow_state ?? "").toLowerCase();
          const wfClass =
            wf.includes("approved") ? "approved" :
            wf.includes("pending") ? "pending" : "";

          return '<tr class="' + (i%2===0?'':'alt') + '">'
            + '<td class="link">' + (r.material_request ?? r.mr_no ?? "-") + '</td>'
            + '<td>' + (r.created_date ?? r.date ?? "-") + '</td>'
            + '<td>' + (r.mr_date ?? "-") + '</td>'
            + '<td><span class="status-badge ' + wfClass + '">' + (r.workflow_state ?? "-") + '</span></td>'
            + '<td>' + (r.status ?? "-") + '</td>'
            + '<td class="' + getAgeClass(r.age_days ?? r.age) + '">' + (r.age_days ?? r.age ?? "-") + '</td>'
            + '</tr>';
        }).join("");

  } catch(e) {
    document.getElementById("tb_mr_completed").innerHTML =
      '<tr><td colspan="6" class="empty">Failed to load</td></tr>';
  }
}

function setKpi(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent =
      (value !== undefined && value !== null) ? value : 0;
  }
}

function getAgeClass(age) {
  if (!age) return "";
  if (age >= 10) return "age-red";
  if (age >= 5)  return "age-orange";
  return "age-green";
}

function exportTableToExcel(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const parentTable = table.closest('table');
  if (!parentTable) return;
  
  const headers = [];
  const headerRow = parentTable.querySelector('thead tr:first-child');
  if (headerRow) {
    headerRow.querySelectorAll('th').forEach(th => {
      headers.push(th.textContent.trim());
    });
  }
  
  const rows = [];
  table.querySelectorAll('tr').forEach(tr => {
    if (tr.style.display === 'none') return;
    const cells = [];
    tr.querySelectorAll('td').forEach(td => {
      let text = td.textContent.trim();
      text = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
      cells.push(text);
    });
    if (cells.length > 0 && !cells.every(c => c === '' || c === '-')) {
      rows.push(cells);
    }
  });
  
  if (rows.length === 0) {
    alert('No data to export');
    return;
  }
  
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => '"' + cell.replace(/"/g, '""') + '"').join(',') + '\n';
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename + '.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const KPI_MAP = {
  po_completed:       { title: "Completed Purchase Orders",  sourceTableId: "tb_po_completed",     badgeId: "badge_po_completed",     colCount: 7 },
  mr_completed:       { title: "Completed MR Orders",        sourceTableId: "tb_mr_completed",     badgeId: "badge_mr_completed",     colCount: 6 },
  mr_made_po_pending: { title: "MR Made PO Not Made",        sourceTableId: "tb_mr_made_po",       badgeId: "badge_mr_made_po",       colCount: 4 },
  mr_pending:         { title: "MR Pending",                 sourceTableId: "tb_mr_pending",       badgeId: "badge_mr_pending",       colCount: 5 },
  po_pending:         { title: "PO Pending",                 sourceTableId: "tb_po_pending",       badgeId: "badge_po_pending",       colCount: 5 },
  payment_pending:    { title: "Payment Pending",            sourceTableId: "tb_payment_pending",  badgeId: "badge_payment_pending",  colCount: 5 },
  po_delay_transit:   { title: "PO Delay Transit",           sourceTableId: "tb_po_delay_transit", badgeId: "badge_po_delay_transit", colCount: 5 },
  po_on_transit:      { title: "PO On Transit",              sourceTableId: "tb_po_on_transit",    badgeId: "badge_po_on_transit",    colCount: 5 },
};

const KPI_HEADERS = {
  po_completed:       ["PO NO", "CREATED DATE", "SUPPLIER", "AMOUNT", "WORKFLOW STATE", "STATUS", "AGE"],
  mr_completed:       ["MATERIAL REQUEST", "CREATED DATE", "MR DATE", "WORKFLOW STATE", "STATUS", "AGE"],
  mr_made_po_pending: ["MATERIAL REQUEST", "DESCRIPTION (ITEMS)", "TOTAL MR QTY", "PENDING"],
  mr_pending:         ["CREATION DATE", "MR NO", "STATUS", "AGE", "PROJECT REMARKS"],
  po_pending:         ["PO NO", "CREATED DATE", "STATUS", "SUPPLIER", "AGE"],
  payment_pending:    ["CREATION DATE", "PAYMENT NO", "PAYMENT TYPE", "WORKFLOW STATE", "AGE"],
  po_delay_transit:   ["PO NO", "DELIVERY FROM", "DELIVERY TO", "PO / PR / PENDING", "DELAY DAYS"],
  po_on_transit:      ["PO NO", "SUPPLIER", "EXP. DELIVERY", "EXP. RECEIVED", "DAYS REMAINING"],
};

function openDetail(key) {
  const cfg = KPI_MAP[key];
  if (!cfg) return;

  document.getElementById("detailTitle").textContent = cfg.title;
  const badgeEl = document.getElementById(cfg.badgeId);
  document.getElementById("detailBadge").textContent = badgeEl ? badgeEl.textContent : "0";

  const headers = KPI_HEADERS[key] || [];
  const thead = document.getElementById("detailThead");
  thead.innerHTML =
    "<tr>" + headers.map(function(h) { return "<th>" + h + "</th>"; }).join("") + "</tr>" +
    "<tr class='filter-row'>" + headers.map(function() { return "<td><input placeholder='Filter...'/></td>"; }).join("") + "</tr>";

  const detailTbody = document.getElementById("detailTbody");
  const sourceTbody = cfg.sourceTableId ? document.getElementById(cfg.sourceTableId) : null;

  if (sourceTbody) {
    detailTbody.innerHTML = sourceTbody.innerHTML;
    detailTbody.querySelectorAll("td").forEach(function(td) {
      td.style.whiteSpace = "normal";
      td.style.overflow = "visible";
      td.style.textOverflow = "unset";
    });
  } else {
    detailTbody.innerHTML = '<tr><td colspan="' + cfg.colCount + '" class="empty">No data available</td></tr>';
  }

  document.getElementById("detailOverlay").style.display = "flex";
  const header = document.querySelector(".header");
  const kpiRow = document.querySelector(".kpi-row");
  const mainContent = document.querySelector(".main");
  if (header) header.style.display = "none";
  if (kpiRow) kpiRow.style.display = "none";
  if (mainContent) mainContent.style.display = "none";

  lucide.createIcons();

  thead.querySelectorAll(".filter-row input").forEach(function(input) {
    input.addEventListener("input", function() {
      const colIndex = Array.from(this.closest("tr").children).indexOf(this.closest("td"));
      const filterValue = this.value.toLowerCase();
      detailTbody.querySelectorAll("tr").forEach(function(row) {
        const cell = row.cells[colIndex];
        if (!cell) return;
        row.style.display = cell.textContent.toLowerCase().includes(filterValue) ? "" : "none";
      });
    });
  });
}

function closeDetail() {
  document.getElementById("detailOverlay").style.display = "none";
  const header = document.querySelector(".header");
  const kpiRow = document.querySelector(".kpi-row");
  const mainContent = document.querySelector(".main");
  if (header) header.style.display = "";
  if (kpiRow) kpiRow.style.display = "";
  if (mainContent) mainContent.style.display = "";
}

document.querySelectorAll(".filter-row input").forEach(function(input) {
  input.addEventListener("input", function() {
    const colIndex = Array.from(this.closest("tr").children).indexOf(this.closest("td"));
    const filterValue = this.value.toLowerCase();
    const tbody = this.closest("table").querySelector("tbody");
    tbody.querySelectorAll("tr").forEach(function(row) {
      const cell = row.cells[colIndex];
      if (!cell) return;
      row.style.display = cell.textContent.toLowerCase().includes(filterValue) ? "" : "none";
    });
  });
});

document.addEventListener('DOMContentLoaded', function() {
  lucide.createIcons();
  loadProjects().then(function() { loadDashboard(); });
});
