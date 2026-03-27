const API_BASE = "/api";

// ─── SIDEBAR MENU TOGGLE ─────────────────────────────────────────
function toggleMenu() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.overlay');
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
}

function closeMenu() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.overlay');
  sidebar.classList.remove('active');
  overlay.classList.remove('active');
}

function updateClock() {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  document.getElementById("datetime").textContent = `${date} • ${time}`;
}
setInterval(updateClock, 1000);
updateClock();

// ─── CUSTOM SEARCHABLE PROJECT DROPDOWN ──────────────────────────────────────
let _allProjects = [];

async function loadProjects() {
  try {
    const res = await fetch(`${API_BASE}/stores/projects`);
    const data = await res.json();
    const projects = data?.projects ?? [];
    _allProjects = [{ code: "", label: "All Projects" }, ...projects];

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
    setSelectedProject(defaultCode);
    renderProjectOptions(_allProjects);
    loadDashboard();
  } catch (err) {
    console.error("❌ Projects failed:", err);
    renderProjectOptions([{ code: "", label: "All Projects" }]);
    loadDashboard();
  }
}

function renderProjectOptions(list) {
  const container = document.getElementById("customSelectOptions");
  if (!container) return;
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
}

function filterProjects() {
  const q = document.getElementById("projectSearchInput").value.toLowerCase().trim();
  const filtered = _allProjects.filter(p => p.label.toLowerCase().includes(q));
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
    fetchGateEntry(),
    fetchDcGateout(),
    fetchPrBillPending(project),
    // fetchReturnableDc(project),
    fetchStockSummary(project),
    // fetchPettyCash(),
    fetchDirectSiteDelivery(project),
    fetchDeliveryNotePending(project),
    fetchStockIndentPending(project),
    fetchMaterialIssuePending(project),
    fetchProjectDispute(project),
  ]);
}

async function fetchCounts(project) {
  try {
    const res = await fetch(`${API_BASE}/stores/dashboard-counts?project=${project}`);
    const data = await res.json();
    const p = data?.message ?? data;
    console.log('Dashboard counts response:', p);
    document.getElementById("errorMsg").style.display = "none";
  } catch (err) {
    console.error('Error fetching counts:', err);
    document.getElementById("errorMsg").style.display = "inline";
  }
}

async function fetchGateEntry() {
  try {
    const res = await fetch(`${API_BASE}/stores/gate-entry-pr-pending`);
    const data = await res.json();

    const payload = data?.message ?? data;

    const actualCount = payload?.pending_count ?? 0;
    const rows = payload?.data ?? [];

    // KPI
    document.getElementById("badge_gate").textContent = actualCount;
    setKpi("kpi_gate_entry_made_pr_pending", actualCount);

    // TABLE
    document.getElementById("tb_gate").innerHTML = rows.length === 0
      ? `<tr><td colspan="4" class="empty">No pending records</td></tr>`
      : rows.map((r, i) => `<tr class="${i%2===0?'':'alt'}">
          <td>${r.party ?? "-"}</td>
          <td class="link">${r.gate_entries_no ?? "-"}</td>
          <td>${r.posting_date ?? "-"}</td>
          <td class="${getAgeClass(r.age)}">${r.age ?? "-"}</td>
        </tr>`).join("");

  } catch {
    document.getElementById("tb_gate").innerHTML =
      `<tr><td colspan="4" class="empty">Failed to load</td></tr>`;
  }
}

async function fetchDcGateout() {
  try {
    const res = await fetch(`${API_BASE}/stores/dc-gateout-pending`);
    const data = await res.json();

    const payload = data.message;
    const rows = payload.data;
    const actualCount = payload.count;

    console.log("ROWS:", rows);
    console.log("FIRST ROW:", rows[0]);

    document.getElementById("badge_dc_gate").textContent = actualCount;
    setKpi("kpi_dc_made_to_bill_pending", actualCount);

    document.getElementById("tb_dc_gate").innerHTML = rows.length === 0
      ? `<tr><td colspan="4" class="empty">No pending records</td></tr>`
      : rows.map((r, i) => `<tr class="${i%2===0?'':'alt'}">
          <td>${r.party}</td>
          <td class="link">${r.dc_no}</td>
          <td>${r.date}</td>
          <td class="${getAgeClass(r.age)}">${r.age}</td>
        </tr>`).join("");

  } catch {
    document.getElementById("tb_dc_gate").innerHTML =
      `<tr><td colspan="4" class="empty">Failed to load</td></tr>`;
  }
}


async function fetchPrBillPending(project) {
  try {
    const res = await fetch(`${API_BASE}/stores/pr-bill-pending?project=${project}`);
    const data = await res.json();
    const payload = data?.message ?? data;
    const actualCount = payload?.pending_count ?? 0;
    document.getElementById("badge_pr_bill").textContent = actualCount;
    setKpi("kpi_pr_made_to_bill_pending", actualCount);
    console.log('PR Bill - KPI vs Table:', actualCount, 'vs', actualCount);
    const rows = payload?.data ?? [];
    document.getElementById("tb_pr_bill").innerHTML = rows.length === 0
      ? `<tr><td colspan="5" class="empty">No pending records</td></tr>`
      : rows.map((r, i) => `<tr class="${i%2===0?'':'alt'}">
          <td>${r.party??"-"}</td>
          <td class="link">${r.receipt_no??"-"}</td>
          <td>${r.receipt_date??"-"}</td>
          <td class="${getAgeClass(r.aging_receipt)}">${r.aging_receipt??"-"}</td>
          <td>${r.delayed_reason??"-"}</td>
        </tr>`).join("");
  } catch {
    document.getElementById("tb_pr_bill").innerHTML = `<tr><td colspan="5" class="empty">Failed to load</td></tr>`;
  }
}

async function fetchStockSummary(project) {
  try {
    const res = await fetch(`${API_BASE}/stores/stock-summary?project=${project}`);
    const data = await res.json();
    const payload = data?.message ?? data;
    const actualCount = payload?.count ?? 0;
    document.getElementById("badge_stock").textContent = actualCount;
    setKpi("kpi_stock_summary", actualCount);
    console.log('Stock Summary - KPI vs Table:', actualCount, 'vs', actualCount);
    const rows = payload?.rows ?? [];
    document.getElementById("tb_stock").innerHTML = rows.length === 0
      ? `<tr><td colspan="3" class="empty">No records</td></tr>`
      : rows.map((r, i) => `<tr class="${i%2===0?'':'alt'}">
          <td>${r.warehouse??"-"}</td>
          <td>${r.closing_qty?.toLocaleString()??"-"}</td>
          <td>₹${r.closing_amount?.toLocaleString()??"-"}</td>
        </tr>`).join("");
  } catch {
    document.getElementById("tb_stock").innerHTML = `<tr><td colspan="3" class="empty">Failed to load</td></tr>`;
  }
}

async function fetchDirectSiteDelivery(project) {
  try {
    const res = await fetch(`${API_BASE}/stores/direct-site-delivery?project=${project}`);
    const data = await res.json();
    const rows = data?.message ?? [];
    const actualCount = rows.length;
    document.getElementById("badge_direct").textContent = actualCount;
    setKpi("kpi_direct_site_delivery", actualCount);
    console.log('Direct Site - KPI vs Table:', actualCount, 'vs', actualCount);
    document.getElementById("tb_direct").innerHTML = rows.length === 0
      ? `<tr><td colspan="3" class="empty">No records</td></tr>`
      : rows.map((r, i) => `<tr class="${i%2===0?'':'alt'}">
          <td>${r.supplier??"-"}</td>
          <td class="link">${r.pr_no??"-"}</td>
          <td>${r.posting_date??"-"}</td>
        </tr>`).join("");
  } catch {
    document.getElementById("tb_direct").innerHTML = `<tr><td colspan="3" class="empty">Failed to load</td></tr>`;
  }
}

async function fetchDeliveryNotePending(project) {
  try {
    const res = await fetch(`${API_BASE}/stores/delivery-note-pending?project=${project}`);
    const data = await res.json();
    const rows = data?.message ?? [];
    const actualCount = rows.length;
    document.getElementById("badge_delivery").textContent = actualCount;
    setKpi("kpi_direct_note_pending", actualCount);
    console.log('Delivery Note - KPI vs Table:', actualCount, 'vs', actualCount);
    document.getElementById("tb_delivery").innerHTML = rows.length === 0
      ? `<tr><td colspan="4" class="empty">No records</td></tr>`
      : rows.map((r, i) => `<tr class="${i%2===0?'':'alt'}">
          <td>${r.party??"-"}</td>
          <td class="link">${r.dc_no??"-"}</td>
          <td>${r.dc_date??"-"}</td>
          <td class="${getAgeClass(r.aging)}">${r.aging??"-"}</td>
        </tr>`).join("");
  } catch {
    document.getElementById("tb_delivery").innerHTML = `<tr><td colspan="4" class="empty">Failed to load</td></tr>`;
  }
}

async function fetchStockIndentPending(project) {
  try {
    const res = await fetch(`${API_BASE}/stores/stock-indent-pending?project=${project}`);
    const data = await res.json();
    const rows = data?.message ?? [];
    const actualCount = rows.length;
    document.getElementById("badge_indent").textContent = actualCount;
    setKpi("kpi_stock_indent_request_mode_issue_pending", actualCount);
    console.log('Stock Indent - KPI vs Table:', actualCount, 'vs', actualCount);
    document.getElementById("tb_indent").innerHTML = rows.length === 0
      ? `<tr><td colspan="3" class="empty">No records</td></tr>`
      : rows.map((r, i) => `<tr class="${i%2===0?'':'alt'}">
          <td class="link">${r.indent_no??"-"}</td>
          <td>${r.indent_date??"-"}</td>
          <td class="${getAgeClass(r.age)}">${r.age??"-"}</td>
        </tr>`).join("");
  } catch {
    document.getElementById("tb_indent").innerHTML = `<tr><td colspan="3" class="empty">Failed to load</td></tr>`;
  }
}

async function fetchMaterialIssuePending(project) {
  try {
    const res = await fetch(`${API_BASE}/stores/material-issue-pending?project=${project}`);
    const data = await res.json();
    const rows = data?.message ?? [];
    document.getElementById("badge_material").textContent = rows.length;
    document.getElementById("tb_material").innerHTML = rows.length === 0
      ? `<tr><td colspan="3" class="empty">No records</td></tr>`
      : rows.map((r, i) => `<tr class="${i%2===0?'':'alt'}">
          <td class="link">${r.material_issue_no??"-"}</td>
          <td>${r.material_issue_date??"-"}</td>
          <td class="${getAgeClass(r.age)}">${r.age??"-"}</td>
        </tr>`).join("");
  } catch {
    document.getElementById("tb_material").innerHTML = `<tr><td colspan="3" class="empty">Failed to load</td></tr>`;
  }
}

async function fetchProjectDispute(project) {
  try {
    const res = await fetch(`${API_BASE}/stores/project-dispute?project=${project}`);
    const data = await res.json();
    const rows = data?.message ?? [];
    const actualCount = rows.length;
    document.getElementById("badge_dispute").textContent = actualCount;
    setKpi("kpi_project_wise_dispute_count", actualCount);
    console.log('Project Dispute - KPI vs Table:', actualCount, 'vs', actualCount);
    document.getElementById("tb_dispute").innerHTML = rows.length === 0
      ? `<tr><td colspan="3" class="empty">No records</td></tr>`
      : rows.map((r, i) => `<tr class="${i%2===0?'':'alt'}">
          <td class="link">${r.ticket_name??"-"}</td>
          <td>${r.date??"-"}</td>
          <td title="${r.issue??''}">${(r.issue??"-").substring(0,40)}...</td>
        </tr>`).join("");
  } catch {
    document.getElementById("tb_dispute").innerHTML = `<tr><td colspan="3" class="empty">Failed to load</td></tr>`;
  }
}

function setKpi(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? 0;
}

function getAgeClass(age) {
  if (!age) return "";
  if (age >= 10) return "age-red";
  if (age >= 5)  return "age-orange";
  return "age-green";
}

// ─── FULLSCREEN DETAIL VIEW ───────────────────────────────────────────────────

// Map of KPI key → { title, sourceTableId, badgeId, colCount }
const KPI_MAP = {
  gate:       { title: "Gate Entry Made PR Pending",                    sourceTableId: "tb_gate",      badgeId: "badge_gate",      colCount: 4 },
  dc_gate:    { title: "DC Made Gate Out Pending",                      sourceTableId: "tb_dc_gate",   badgeId: "badge_dc_gate",   colCount: 4 },
  pr_bill:    { title: "PR Made to Bill Pending",                       sourceTableId: "tb_pr_bill",   badgeId: "badge_pr_bill",   colCount: 5 },
  returnable: { title: "Returnable DC",                                  sourceTableId: "tb_returnable",badgeId: "badge_returnable",colCount: 5 },
  stock:      { title: "Stock Summary",                                  sourceTableId: "tb_stock",     badgeId: "badge_stock",     colCount: 3 },
  petty:      { title: "Petty Cash Entry",                               sourceTableId: "tb_petty",     badgeId: "badge_petty",     colCount: 3 },
  direct:     { title: "Direct Site Delivery",                           sourceTableId: "tb_direct",    badgeId: "badge_direct",    colCount: 3 },
  delivery:   { title: "Delivery Note Pending",                          sourceTableId: "tb_delivery",  badgeId: "badge_delivery",  colCount: 4 },
  indent:     { title: "Stock Indent Request Mode Issue Pending",        sourceTableId: "tb_indent",    badgeId: "badge_indent",    colCount: 3 },
  dispute:    { title: "Project Wise Dispute",                           sourceTableId: "tb_dispute",   badgeId: "badge_dispute",   colCount: 3 },
};

// Map of KPI key → header labels (mirrors each panel's <thead> <tr> columns)
const KPI_HEADERS = {
  gate:       ["PARTY", "GATE ENTRY NO", "DATE", "AGE"],
  dc_gate:    ["PARTY", "DC NO", "DATE", "AGE"],
  pr_bill:    ["PARTY", "PR NO", "DATE", "AGE", "REASON FOR PENDING"],
  returnable: ["PARTY", "DC NO", "RETURNABLE DATE", "RET. CURRENT", "STATUS"],
  stock:      ["WAREHOUSE NAME", "QTY", "AMOUNT"],
  petty:      ["JOURNAL NO", "DATE", "REMARKS"],
  direct:     ["PARTY", "PR NO", "DATE"],
  delivery:   ["PARTY", "DC NO", "DATE", "AGE"],
  indent:     ["INDENT NO", "DATE", "AGE"],
  dispute:    ["TICKET NO", "DATE", "ISSUE"],
};

function openDetail(key) {
  const cfg = KPI_MAP[key];
  if (!cfg) return;

  // Set title and badge
  document.getElementById("detailTitle").textContent = cfg.title;
  const badgeEl = document.getElementById(cfg.badgeId);
  document.getElementById("detailBadge").textContent = badgeEl ? badgeEl.textContent : "0";

  // Build thead with filter row
  const headers = KPI_HEADERS[key] || [];
  const thead = document.getElementById("detailThead");
  thead.innerHTML = `
    <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
    <tr class="filter-row">${headers.map(() => `<td><input placeholder="Filter..."/></td>`).join("")}</tr>
  `;

  // Copy tbody rows from the source dashboard table
  const sourceTbody = document.getElementById(cfg.sourceTableId);
  const detailTbody = document.getElementById("detailTbody");
  if (sourceTbody) {
    detailTbody.innerHTML = sourceTbody.innerHTML;
    // Remove text-overflow / overflow hidden from cloned cells in detail view
    detailTbody.querySelectorAll("td").forEach(td => {
      td.style.whiteSpace = "normal";
      td.style.overflow = "visible";
      td.style.textOverflow = "unset";
    });
  } else {
    detailTbody.innerHTML = `<tr><td colspan="${cfg.colCount}" class="empty">No data available</td></tr>`;
  }

  // Show overlay, hide main content
  document.getElementById("detailOverlay").style.display = "flex";
  document.getElementById("mainHeader").style.display    = "none";
  document.getElementById("mainKpiRow").style.display    = "none";
  document.getElementById("mainContent").style.display   = "none";

  // Re-init lucide icons inside overlay
  lucide.createIcons();

  // Attach filter listeners for detail table
  thead.querySelectorAll(".filter-row input").forEach(input => {
    input.addEventListener("input", function () {
      const td = this.closest("td");
      const tr = td.closest("tr");
      const colIndex = Array.from(tr.children).indexOf(td);
      const filterValue = this.value.toLowerCase();
      detailTbody.querySelectorAll("tr").forEach(row => {
        const cell = row.cells[colIndex];
        if (!cell) return;
        row.style.display = cell.textContent.toLowerCase().includes(filterValue) ? "" : "none";
      });
    });
  });
}

function closeDetail() {
  document.getElementById("detailOverlay").style.display = "none";
  document.getElementById("mainHeader").style.display    = "";
  document.getElementById("mainKpiRow").style.display    = "";
  document.getElementById("mainContent").style.display   = "";
}

// ─── DASHBOARD TABLE FILTERS ─────────────────────────────────────────────────
document.querySelectorAll(".filter-row input").forEach(input => {
  input.addEventListener("input", function () {
    const td = this.closest("td");
    const tr = td.closest("tr");
    const table = tr.closest("table");
    const colIndex = Array.from(tr.children).indexOf(td);
    const filterValue = this.value.toLowerCase();
    const tbody = table.querySelector("tbody");
    tbody.querySelectorAll("tr").forEach(row => {
      const cell = row.cells[colIndex];
      if (!cell) return;
      row.style.display = cell.textContent.toLowerCase().includes(filterValue) ? "" : "none";
    });
  });
});

lucide.createIcons();
loadProjects().then(() => loadDashboard());