// ══════════════════════════════════════════════════════
// FINANCE DASHBOARD — finance.js
// ══════════════════════════════════════════════════════

// ── CLOCK ──
function updateClock() {
  var now = new Date();
  var d = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  var t = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  var el = document.getElementById('datetime');
  if (el) el.textContent = d + ' • ' + t;
}
setInterval(updateClock, 1000);
updateClock();

// ══════════════════════════════════════════════════════
// PROJECT LOADING AND MANAGEMENT (Standard Integration)
// ══════════════════════════════════════════════════════
let _allProjects = [];

// Standard project dropdown functions (matching Purchase dashboard)
function toggleProjectDropdown() {
  const dropdown = document.getElementById('customSelectDropdown');
  const chevron = document.getElementById('customSelectChevron');
  if (!dropdown || !chevron) return;
  
  const isOpen = dropdown.style.display === 'block';
  
  if (isOpen) {
    dropdown.style.display = 'none';
    chevron.style.transform = 'rotate(0deg)';
  } else {
    dropdown.style.display = 'block';
    chevron.style.transform = 'rotate(180deg)';
    const searchInput = document.getElementById('projectSearchInput');
    if (searchInput) searchInput.focus();
  }
}

function filterProjects() {
  const searchInput = document.getElementById('projectSearchInput');
  const options = document.getElementById('customSelectOptions');
  if (!searchInput || !options) return;
  
  const searchTerm = searchInput.value.toLowerCase();
  
  const filteredProjects = _allProjects.filter(project => 
    project.label.toLowerCase().includes(searchTerm)
  );
  
  options.innerHTML = filteredProjects.map(project => 
    `<div class="custom-select-option" onclick="selectProjectFromDropdown('${project.code}', '${project.label}')">
      ${project.label}
    </div>`
  ).join('');
}

function selectProjectFromDropdown(code, label) {
  const customSelectText = document.getElementById('customSelectText');
  const projectSelect = document.getElementById('projectSelect');
  const dropdown = document.getElementById('customSelectDropdown');
  const chevron = document.getElementById('customSelectChevron');
  
  if (customSelectText) customSelectText.textContent = label;
  if (projectSelect) projectSelect.value = code;
  if (dropdown) dropdown.style.display = 'none';
  if (chevron) chevron.style.transform = 'rotate(0deg)';
  
  // Update active filters
  activeFilters.project = code;
  updatePill();
  loadDashboard();
}

function onProjectChange() {
  const select = document.getElementById('projectSelect');
  if (!select) return;
  
  const selectedProject = _allProjects.find(p => p.code === select.value);
  if (selectedProject) {
    const customSelectText = document.getElementById('customSelectText');
    if (customSelectText) customSelectText.textContent = selectedProject.label;
    activeFilters.project = selectedProject.code;
    updatePill();
    loadDashboard();
  }
}

async function loadProjects() {
  try {
    const res = await fetch('/api/purchase/projects');
    const data = await res.json();
    console.log('Projects API Response:', data);
    
    const raw = data?.message ?? [];
    const projects = [];
    
    // Check if it's an array (new format)
    if (Array.isArray(raw)) {
      raw.forEach(item => {
        if (item && typeof item === 'object') {
          const code = item.code || item.project || item.name || '';
          const name = item.name || item.project_name || item.label || code;
          const label = item.label || `${code} - ${name}`;
          if (code) {
            projects.push({ code, name, label });
          }
        }
      });
    }
    // Check if it's a string (old format)
    else if (typeof raw === 'string' && raw.trim()) {
      const lines = raw.trim().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(" - ", 1);
        const code = parts[0].trim();
        const restOfLine = line.substring(code.length).trim();
        const name = restOfLine.startsWith("- ") ? restOfLine.substring(2).trim() : restOfLine;
        const label = name ? `${code} - ${name}` : code;
        projects.push({ code, name: name || code, label });
      }
    }
    
    _allProjects = [{ code: "", label: "All Projects" }, ...projects];
    console.log('Total projects loaded:', _allProjects.length);

    // Populate hidden select for compatibility
    const select = document.getElementById("projectSelect");
    if (select) {
      select.innerHTML = "";
      _allProjects.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.code;
        opt.textContent = p.label;
        select.appendChild(opt);
      });
    }

    // Populate dropdown options
    const options = document.getElementById('customSelectOptions');
    if (options) {
      options.innerHTML = _allProjects.map(project => 
        `<div class="custom-select-option" onclick="selectProjectFromDropdown('${project.code}', '${project.label}')">
          ${project.label}
        </div>`
      ).join('');
    }
    
    // Set default project to WTT-0528 if available, otherwise empty
    const defaultProject = projects.find(p => p.code === "WTT-0528");
    const defaultCode = defaultProject ? defaultProject.code : "";
    const defaultLabel = defaultProject ? defaultProject.label : "All Projects";
    
    const customSelectText = document.getElementById('customSelectText');
    const projectSelect = document.getElementById('projectSelect');
    
    if (customSelectText) customSelectText.textContent = defaultLabel;
    if (projectSelect) projectSelect.value = defaultCode;
    activeFilters.project = defaultCode;
    
  } catch (err) {
    console.error("❌ Projects failed:", err);
    _allProjects = [{ code: "", label: "All Projects" }];
    
    const customSelectText = document.getElementById('customSelectText');
    const projectSelect = document.getElementById('projectSelect');
    
    if (customSelectText) customSelectText.textContent = "All Projects";
    if (projectSelect) projectSelect.value = "";
    activeFilters.project = "";
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.project-selector')) {
    const dropdown = document.getElementById('customSelectDropdown');
    const chevron = document.getElementById('customSelectChevron');
    if (dropdown) dropdown.style.display = 'none';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }
  if (!e.target.closest('.btn-date-filter') && !e.target.closest('.cal-popup')) {
    const datePop = document.getElementById('datePop');
    if (datePop) datePop.style.display = 'none';
  }
});
// ══════════════════════════════════════════════════════
// ACTIVE FILTERS STATE
// ══════════════════════════════════════════════════════
var activeFilters = {
  project: '',  // Empty string means "All Projects", specific code means that project
  dateFrom: '',
  dateTo: '',
  quick: ''   // 'today' | 'yesterday' | ''
};

// Build query string from activeFilters
function buildQuery() {
  var parts = [];
  if (activeFilters.project && activeFilters.project !== 'all')
    parts.push('project=' + encodeURIComponent(activeFilters.project));
  if (activeFilters.quick)
    parts.push('quick=' + activeFilters.quick);
  else {
    if (activeFilters.dateFrom) parts.push('date_from=' + activeFilters.dateFrom);
    if (activeFilters.dateTo)   parts.push('date_to='   + activeFilters.dateTo);
  }
  return parts.length ? '?' + parts.join('&') : '';
}

// ── UPDATE FILTER PILL DISPLAY ──
function updatePill() {
  // Filter pill functionality can be added here if needed
  // For now, we'll keep it simple like HR dashboard
}

// ── DATE FILTER TOGGLE ──
function toggleDateDrop() {
  var pop = document.getElementById('datePop');
  if (!pop) return;
  
  var isOpen = pop.style.display === 'block';
  if (isOpen) {
    pop.style.display = 'none';
  } else {
    pop.style.display = 'block';
    calInit();
    lucide.createIcons();
  }
}

// ══════════════════════════════════════════════════════
// CALENDAR WIDGET
// ══════════════════════════════════════════════════════

var CAL = {
  from: { year: 0, month: 0 },
  to:   { year: 0, month: 0 },
  selFrom: null,
  selTo:   null
};

var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function calInit() {
  var now = new Date();
  CAL.from = { year: now.getFullYear(), month: now.getMonth() };
  var toDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  CAL.to = { year: toDate.getFullYear(), month: toDate.getMonth() };
  calRender('from');
  calRender('to');
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function calRender(side) {
  var state   = CAL[side];
  var labelEl = document.getElementById('cal' + cap(side) + 'MonthLabel');
  var gridEl  = document.getElementById('cal' + cap(side) + 'Grid');
  if (!labelEl || !gridEl) return;

  labelEl.textContent = MONTHS[state.month] + ' ' + state.year;

  var html  = DAYS.map(function(d) { return '<div class="cal-day-name">' + d + '</div>'; }).join('');
  var first = new Date(state.year, state.month, 1).getDay();
  var daysInM = new Date(state.year, state.month + 1, 0).getDate();
  var today = new Date(); today.setHours(0,0,0,0);

  for (var i = 0; i < first; i++) html += '<div class="cal-day cal-empty"></div>';

  for (var d = 1; d <= daysInM; d++) {
    var thisDate = new Date(state.year, state.month, d);
    var cls = 'cal-day';
    if (thisDate.getTime() === today.getTime()) cls += ' cal-today';
    if (CAL.selFrom && thisDate.getTime() === CAL.selFrom.getTime()) cls += ' cal-selected cal-range-start';
    else if (CAL.selTo && thisDate.getTime() === CAL.selTo.getTime()) cls += ' cal-selected cal-range-end';
    else if (CAL.selFrom && CAL.selTo && thisDate > CAL.selFrom && thisDate < CAL.selTo) cls += ' cal-in-range';
    html += '<div class="' + cls + '" onclick="calSelect(' + state.year + ',' + state.month + ',' + d + ')">' + d + '</div>';
  }
  gridEl.innerHTML = html;
}

function calSelect(year, month, day) {
  var clicked = new Date(year, month, day);
  clicked.setHours(0,0,0,0);
  if (!CAL.selFrom || (CAL.selFrom && CAL.selTo)) {
    CAL.selFrom = clicked; CAL.selTo = null;
  } else {
    if (clicked < CAL.selFrom) { CAL.selTo = CAL.selFrom; CAL.selFrom = clicked; }
    else { CAL.selTo = clicked; }
  }
  calRenderBoth();
  calUpdateFooter();
}

function calRenderBoth() { calRender('from'); calRender('to'); }

function calNav(side, dir) {
  var s = CAL[side];
  s.month += dir;
  if (s.month > 11) { s.month = 0;  s.year++; }
  if (s.month < 0)  { s.month = 11; s.year--; }
  calRender(side);
}

function calUpdateFooter() {
  var fEl = document.getElementById('calRangeFrom');
  var tEl = document.getElementById('calRangeTo');
  if (fEl) fEl.textContent = CAL.selFrom ? fmtCalDate(CAL.selFrom) : '—';
  if (tEl) tEl.textContent = CAL.selTo   ? fmtCalDate(CAL.selTo)   : '—';
}

function fmtCalDate(d) {
  return d.getDate().toString().padStart(2,'0') + ' ' + MONTHS[d.getMonth()].slice(0,3) + ' ' + d.getFullYear();
}

function calToISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function calClear() {
  CAL.selFrom = null; CAL.selTo = null;
  calRenderBoth(); calUpdateFooter();
}

function applyDate() {
  if (!CAL.selFrom) return;
  activeFilters.dateFrom = calToISO(CAL.selFrom);
  activeFilters.dateTo   = CAL.selTo ? calToISO(CAL.selTo) : activeFilters.dateFrom;
  activeFilters.quick    = '';
  const datePop = document.getElementById('datePop');
  if (datePop) datePop.style.display = 'none';
  var lbl = document.getElementById('btnDateLabel');
  if (lbl) lbl.textContent = fmtCalDate(CAL.selFrom) + (CAL.selTo && CAL.selTo.getTime() !== CAL.selFrom.getTime() ? ' → ' + fmtCalDate(CAL.selTo) : '');
  updatePill();
  loadDashboard();
}

// ── TODAY / YESTERDAY ──
function setQuickFilter(q) {
  activeFilters.quick    = (activeFilters.quick === q) ? '' : q; // toggle off if same
  activeFilters.dateFrom = '';
  activeFilters.dateTo   = '';
  const datePop = document.getElementById('datePop');
  if (datePop) datePop.style.display = 'none';
  updatePill();
  loadDashboard();
}

// ── CLEAR ALL FILTERS ──
function clearFilters() {
  activeFilters = { project: '', dateFrom: '', dateTo: '', quick: '' };
  const customSelectText = document.getElementById('customSelectText');
  const projectSelect = document.getElementById('projectSelect');
  if (customSelectText) customSelectText.textContent = 'All Projects';
  if (projectSelect) projectSelect.value = '';
  var lbl = document.getElementById('btnDateLabel');
  if (lbl) lbl.textContent = 'Date Filter';
  CAL.selFrom = null; CAL.selTo = null;
  calUpdateFooter();
  const datePop = document.getElementById('datePop');
  if (datePop) datePop.style.display = 'none';
  updatePill();
  loadDashboard();
}

// ══════════════════════════════════════════════════════
// SUB-KPI EXPAND / COLLAPSE
// ══════════════════════════════════════════════════════
var subKpiState = { other_expenses: false, salary: false };

function toggleSubKpi(key) {

  const isOpen = subKpiState[key];

  // close all
  ['other_expenses', 'salary'].forEach(k => {
    subKpiState[k] = false;
    document.getElementById('sub_' + k)?.classList.remove('show');
    document.getElementById('icon_' + k).style.transform = 'rotate(0deg)';
  });

  // reopen only if it was closed
  if (!isOpen) {
    subKpiState[key] = true;
    document.getElementById('sub_' + key)?.classList.add('show');
    document.getElementById('icon_' + key).style.transform = 'rotate(180deg)';
  }
}
// ══════════════════════════════════════════════════════
// KPI CLICK — scroll to matching table
// ══════════════════════════════════════════════════════
var KPI_TABLE_MAP = {
  project_budget: null,          // no table
  po_cost:        'wrap_po',
  pr_cost:        'wrap_pr',
  other_expenses: null,          // expands sub-kpis
  cash_request:   'tb_cash_request',
  req_payment:    'tb_req_payment',
  ticket_booking: 'tb_ticket_booking',
  extra_expenses: 'tb_extra_expenses',
  salary:         null,          // expands sub-kpis
  claim:          'tb_claim',
  advance:        'tb_advance'
};

function kpiClick(key) {

  const titles = {
    po_cost: 'PO Cost',
    pr_cost: 'PR Cost',

    cash_request: 'Cash Request',
    req_payment: 'Request for Payment',
    ticket_booking: 'Ticket Booking',

    extra_expenses: 'Extra Expenses',
    salary: 'Salary',
    claim: 'Claim',
    advance: 'Advance'
  };

  const colors = {
    po_cost: '#2980b9',
    pr_cost: '#8e44ad',

    cash_request: '#f39c12',
    req_payment: '#d68910',
    ticket_booking: '#ca6f1e',

    extra_expenses: '#16a085',
    salary: '#c0392b',
    claim: '#e74c3c',
    advance: '#922b21'
  };

  // 🔥 OPEN FULLSCREEN
  openDetail(key, titles[key] || key, colors[key]);
}
// ══════════════════════════════════════════════════════
// TABLE VIEW SWITCHER (PO & PR tabs)
// ══════════════════════════════════════════════════════
function switchTab(prefix, viewKey, btn) {
  // Hide all views for this prefix
  document.querySelectorAll('[id^="' + prefix + '_"]').forEach(function(v) { v.classList.remove('active'); });
  // Show selected
  document.getElementById(prefix + '_' + viewKey).classList.add('active');
  // Update tab buttons
  btn.closest('.tbl-switcher').querySelectorAll('.tbl-tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
}

// ══════════════════════════════════════════════════════
// COLUMN FILTERS (per table)
// ══════════════════════════════════════════════════════
function attachFilters(tbodyId) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  var table  = tbody.closest('table');
  if (!table) return;
  var inputs = table.querySelectorAll('.filter-row input');
  inputs.forEach(function(inp) {
    inp.oninput = function() {
      tbody.querySelectorAll('tr').forEach(function(row) {
        var cells = row.querySelectorAll('td');
        var show  = true;
        inputs.forEach(function(fi, ci) {
          var v = fi.value.trim().toLowerCase();
          if (v && cells[ci] && !cells[ci].textContent.toLowerCase().includes(v)) show = false;
        });
        row.style.display = show ? '' : 'none';
      });
    };
  });
}

// ══════════════════════════════════════════════════════
// RENDER HELPERS
// ══════════════════════════════════════════════════════
function fmt(v) { return v !== undefined && v !== null && v !== '' ? v : '—'; }
function fmtAmt(v) { return v !== undefined && v !== null ? '₹ ' + Number(v).toLocaleString('en-IN') : '—'; }

function renderSimple(tbodyId, rows, cols, colSpan) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  var badge = document.getElementById('badge_' + tbodyId.replace('tb_', ''));
  if (badge) badge.textContent = rows.length;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="' + colSpan + '" class="empty">No records</td></tr>';
    attachFilters(tbodyId);
    return;
  }
  tbody.innerHTML = rows.map(function(r, i) {
    // Remove S.NO column from all tables
    return '<tr>' + cols.map(function(c) { return c.amt ? fmtAmt(r[c.k]) : fmt(r[c.k]); }).map(function(v) { return '<td>' + v + '</td>'; }).join('') + '</tr>';
  }).join('');
  attachFilters(tbodyId);
}

// ══════════════════════════════════════════════════════
// KPI VALUE UPDATE
// ══════════════════════════════════════════════════════
function setKpi(id, val) {
  var el = document.getElementById('kpi_' + id);
  if (el) el.textContent = val !== null && val !== undefined ? Number(val).toLocaleString('en-IN') : '0';
}

// ══════════════════════════════════════════════════════
// FULLSCREEN DETAIL OVERLAY
// ══════════════════════════════════════════════════════
var DETAIL_COLS = {
  cash_request:   ['DATE','ENTRY NO.','REMARKS','CREATED BY','AMOUNT','APPROVED BY'],
  req_payment:    ['DATE','ENTRY NO.','REMARKS','CREATED BY','AMOUNT','APPROVED BY'],
  ticket_booking: ['DATE','ENTRY NO.','EMPLOYEE NAME','AMOUNT','REASON'],
  extra_expenses: ['DATE','ENTRY NO.','EMPLOYEE NAME','AMOUNT','REASON'],
  salary:         ['EMPLOYEE','SALARY'],
  claim:          ['EMPLOYEE','CLAIM AMOUNT'],
  advance:        ['EMPLOYEE NAME','ADVANCED AMOUNT'],
  po_po_wise:         ['PO NO.','SUPPLIER','PO AMOUNT'],
  po_supplier_wise:   ['SUPPLIER','NO. OF POs','TOTAL AMOUNT'],
  po_item_group_wise: ['ITEM GROUP','NO. OF ITEMS','TOTAL AMOUNT'],
  pr_pr_wise:         ['PR NO.','SUPPLIER','PR AMOUNT'],
  pr_supplier_wise:   ['SUPPLIER','NO. OF PRs','PR AMOUNT'],
  pr_item_group_wise: ['ITEM GROUP','NO. OF ITEMS','PR AMOUNT']
};

var DETAIL_COLORS = {
  po_cost: '#2980b9', pr_cost: '#8e44ad',
  cash_request: '#f39c12', req_payment: '#d68910',
  ticket_booking: '#ca6f1e',
  extra_expenses: '#16a085', salary: '#c0392b',
  claim: '#e74c3c', advance: '#922b21'
};

var CACHED_DATA = {};

function openDetail(key, title, color) {
  var rows  = CACHED_DATA[key] || [];
  var cols  = DETAIL_COLS[key] || [];
  var clr   = color || '#1a2a5e';

  document.getElementById('detailTitle').textContent           = title;
  document.getElementById('detailBadge').textContent           = rows.length;
  document.getElementById('detailBadge').style.background      = clr;
  document.getElementById('detailAccentBar').style.background  = clr;

  var thead = document.getElementById('detailThead');
  thead.innerHTML =
    '<tr>' + cols.map(function(c) { return '<th>' + c + '</th>'; }).join('') + '</tr>' +
    '<tr class="filter-row">' + cols.map(function() { return '<td><input placeholder="Filter..."/></td>'; }).join('') + '</tr>';

  var tbody = document.getElementById('detailTbody');
  tbody.innerHTML = rows.length
    ? rows.map(function(r, i) {
        // Remove S.NO column from all tables
        return '<tr>' + Object.values(r).slice(0, cols.length).map(function(v) { return '<td>' + fmt(v) + '</td>'; }).join('') + '</tr>';
      }).join('')
    : '<tr><td colspan="' + cols.length + '" class="empty">No records found</td></tr>';

  var inputs = thead.querySelectorAll('.filter-row input');
  inputs.forEach(function(inp) {
    inp.oninput = function() {
      tbody.querySelectorAll('tr').forEach(function(row) {
        var cells = row.querySelectorAll('td');
        var show  = true;
        inputs.forEach(function(fi, ci) {
          var v = fi.value.trim().toLowerCase();
          if (v && cells[ci] && !cells[ci].textContent.toLowerCase().includes(v)) show = false;
        });
        row.style.display = show ? '' : 'none';
      });
    };
  });

  document.getElementById('detailOverlay').style.display = 'flex';
}

function closeDetail() { document.getElementById('detailOverlay').style.display = 'none'; }
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeDetail(); });

// ══════════════════════════════════════════════════════
// LOAD DASHBOARD — fetch all API endpoints
// ══════════════════════════════════════════════════════
async function apiFetch(path) {
  try {
    // Use local proxy endpoints to avoid CORS issues
    let url = `/api/finance/${path}`;
    
    // Build query parameters
    const params = new URLSearchParams();
    
    // Add project parameter for all APIs that need it
    if (path === 'kpis' || path === 'po_cost' || path === 'pr_cost' || path === 'cash_request' || 
        path === 'req_payment' || path === 'ticket_booking' || path === 'extra_expenses' || 
        path === 'advance' || path === 'claim' || path === 'salary') {
      const project = activeFilters.project || 'WTT-0528';  // Default to WTT-0528 if no project selected
      params.append('project', project);
    }
    
    // Add date parameters for APIs that support date filtering
    if (path === 'cash_request' || path === 'req_payment' || path === 'ticket_booking' || path === 'extra_expenses' || 
        path === 'advance' || path === 'claim' || path === 'salary') {
      
      if (activeFilters.quick === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.append('from_date', today);
        params.append('to_date', today);
      } else if (activeFilters.quick === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        params.append('from_date', yesterdayStr);
        params.append('to_date', yesterdayStr);
      } else if (activeFilters.dateFrom) {
        params.append('from_date', activeFilters.dateFrom);
        if (activeFilters.dateTo) {
          params.append('to_date', activeFilters.dateTo);
        }
      }
    }
    
    // Add parameters to URL if any exist
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    console.log(`Fetching ${path} from: ${url}`);
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    
    // Handle error responses from backend
    if (data.error) {
      console.error('Backend API error:', data.error);
      // Return fallback data for KPIs
      if (path === 'kpis') {
        return {
          project_budget: 0,
          po_cost: 0,
          pr_cost: 0,
          other_expenses: 0,
          extra_expenses: 0,
          salary: 0,
          cash_request: 0,
          req_payment: 0,
          ticket_booking: 0,
          petty_cash: 0,  // Removed - no longer used
          claim: 0,
          advance: 0
        };
      }
      return null;
    }
    
    return data;
    
  } catch(e) {
    console.error('API fetch error:', e);
    
    // Fallback mock data for development
    const mockTableData = {
      'po_cost': {
        po_wise: [
          {po_no: 'PO-2024-001', supplier: 'ABC Corp', po_amount: 15000000},
          {po_no: 'PO-2024-002', supplier: 'XYZ Ltd', po_amount: 25000000},
          {po_no: 'PO-2024-003', supplier: 'Tech Solutions', po_amount: 18000000},
          {po_no: 'PO-2024-004', supplier: 'Engineering Co', po_amount: 34705110.56}
        ],
        supplier_wise: [
          {supplier: 'ABC Corp', no_of_pos: 2, po_amount: 20000000},
          {supplier: 'XYZ Ltd', no_of_pos: 3, po_amount: 30000000},
          {supplier: 'Tech Solutions', no_of_pos: 1, po_amount: 25000000},
          {supplier: 'Engineering Co', no_of_pos: 1, po_amount: 17705110.56}
        ],
        item_group_wise: [
          {item_group: 'Equipment', no_of_items: 5, po_amount: 45000000},
          {item_group: 'Materials', no_of_items: 8, po_amount: 30000000},
          {item_group: 'Services', no_of_items: 3, po_amount: 17705110.56}
        ]
      },
      'pr_cost': {
        pr_wise: [
          {pr_no: 'PR-2024-001', supplier: 'ABC Corp', pr_amount: 12000000},
          {pr_no: 'PR-2024-002', supplier: 'XYZ Ltd', pr_amount: 20181640.03}
        ],
        supplier_wise: [
          {supplier: 'ABC Corp', no_of_prs: 2, pr_amount: 15000000},
          {supplier: 'XYZ Ltd', no_of_prs: 3, pr_amount: 17181640.03}
        ],
        item_group_wise: [
          {item_group: 'Equipment', no_of_items: 5, pr_amount: 20000000},
          {item_group: 'Materials', no_of_items: 8, pr_amount: 12181640.03}
        ]
      },
      'cash_request': [
        {date: '2026-03-31', entry_no: 'CR-001', remarks: 'For purchasing medicine for MD Sir', created_by: 'Medical Expenses', amount: 1500, approved_by: 'Approved'},
        {date: '2026-03-30', entry_no: 'CR-002', remarks: 'Office supplies purchase', created_by: 'Office Expenses', amount: 2500, approved_by: 'Pending'}
      ],
      'req_payment': [
        {date: '2026-03-30', entry_no: 'RFP-001', remarks: 'Advance Payment for Shipmnet\nWTT - Chennai Port\n5 Vehicles', created_by: 'Finance', amount: 350000, approved_by: 'Approved'}
      ],
      'ticket_booking': [
        {date: '2026-03-23', entry_no: 'TBD-00253', employee_name: 'RAGHUL RAJ D', amount: 0, reason: 'Customer visit to Bhilwara projects - GT Process'}
      ],
      'petty_cash': [],  // Removed - no longer used
      'extra_expenses': [
        {date: '2026-04-01', entry_no: 'LT-26-00001', employee_name: 'WTT1441', amount: 5000, reason: 'Salary Rework'}
      ],
      'salary': [
        {employee: 'Engineering Team', salary: 35000000},
        {employee: 'Management', salary: 25000000},
        {employee: 'Support Staff', salary: 15000000},
        {employee: 'Consultants', salary: 11135095}
      ],
      'claim': [
        {employee: 'HARIHARAN V', claim_amount: 809.25},
        {employee: 'John Doe', claim_amount: 850000},
        {employee: 'Jane Smith', claim_amount: 1255385.075}
      ],
      'advance': [
        {employee_name: 'PREETHI RAJARAJESWARI S', advanced_amount: 0},
        {employee_name: 'Project Manager', advanced_amount: 500000},
        {employee_name: 'Site Engineer', advanced_amount: 440199}
      ]
    };
    
    return mockTableData[path] || null;
  }
}

async function loadDashboard() {
  var errorMsg = document.getElementById('errorMsg');
  var anyError = false;

  // ── KPI VALUES ──
  var kpis = await apiFetch('kpis');
  if (kpis) {
    setKpi('project_budget', kpis.project_budget);
    setKpi('po_cost',        kpis.po_cost);
    setKpi('pr_cost',        kpis.pr_cost);
    setKpi('other_expenses', kpis.other_expenses);
    setKpi('extra_expenses', kpis.extra_expenses);
    setKpi('salary',         kpis.salary);
    setKpi('cash_request',   kpis.cash_request);
    setKpi('req_payment',    kpis.req_payment);
    setKpi('ticket_booking', kpis.ticket_booking);
    setKpi('petty_cash',     0);  // Removed - no longer used
    setKpi('claim',          kpis.claim);
    setKpi('advance',        kpis.advance);
  } else { anyError = true; }

  // ── PO TABLES ──
  var po = await apiFetch('po_cost');
  console.log('PO Cost API Response:', po);
  if (po) {
    CACHED_DATA.po_po_wise = po.po_wise || [];
    CACHED_DATA.po_supplier_wise = po.supplier_wise || [];
    CACHED_DATA.po_item_group_wise = po.item_group_wise || [];
    
    console.log('PO Wise Data:', CACHED_DATA.po_po_wise);
    console.log('Supplier Wise Data:', CACHED_DATA.po_supplier_wise);
    console.log('Item Group Wise Data:', CACHED_DATA.po_item_group_wise);
    
    var badge = document.getElementById('badge_po_cost');
    if (badge) badge.textContent = (po.po_wise || []).length;

    renderSimple('tb_po_po_wise', po.po_wise || [], [{k:'po_no'},{k:'supplier'},{k:'po_amount',amt:true}], 3);
    renderSimple('tb_po_supplier_wise', po.supplier_wise || [], [{k:'supplier'},{k:'no_of_pos'},{k:'po_amount',amt:true}], 3);
    renderSimple('tb_po_item_group_wise', po.item_group_wise || [], [{k:'item_group'},{k:'no_of_items'},{k:'po_amount',amt:true}], 3);
  } else { 
    console.error('PO Cost API failed');
    anyError = true; 
  }

  // ── PR TABLES ──
  var pr = await apiFetch('pr_cost');
  if (pr) {
    CACHED_DATA.pr_pr_wise = pr.pr_wise || [];
    CACHED_DATA.pr_supplier_wise = pr.supplier_wise || [];
    CACHED_DATA.pr_item_group_wise = pr.item_group_wise || [];
    var badge = document.getElementById('badge_pr_cost');
    if (badge) badge.textContent = (pr.pr_wise || []).length;

    renderSimple('tb_pr_pr_wise', pr.pr_wise || [], [{k:'pr_no'},{k:'supplier'},{k:'pr_amount',amt:true}], 3);
    renderSimple('tb_pr_supplier_wise', pr.supplier_wise || [], [{k:'supplier'},{k:'no_of_prs'},{k:'pr_amount',amt:true}], 3);
    renderSimple('tb_pr_item_group_wise', pr.item_group_wise || [], [{k:'item_group'},{k:'no_of_items'},{k:'pr_amount',amt:true}], 3);
  } else { anyError = true; }

  // ── SIMPLE TABLES ──
  var simpleEndpoints = [
    { ep:'cash_request',   tbodyId:'tb_cash_request',   cols:[{k:'date'},{k:'entry_no'},{k:'remarks'},{k:'created_by'},{k:'amount',amt:true},{k:'approved_by'}], span:6 },
    { ep:'req_payment',    tbodyId:'tb_req_payment',    cols:[{k:'date'},{k:'entry_no'},{k:'remarks'},{k:'created_by'},{k:'amount',amt:true},{k:'approved_by'}], span:6 },
    { ep:'ticket_booking', tbodyId:'tb_ticket_booking', cols:[{k:'date'},{k:'entry_no'},{k:'employee_name'},{k:'amount',amt:true},{k:'reason'}], span:5 },
    { ep:'extra_expenses', tbodyId:'tb_extra_expenses', cols:[{k:'date'},{k:'entry_no'},{k:'employee_name'},{k:'amount',amt:true},{k:'reason'}], span:5 },
    { ep:'salary',         tbodyId:'tb_salary',         cols:[{k:'employee'},{k:'salary',amt:true}], span:2 },
    { ep:'claim',          tbodyId:'tb_claim',          cols:[{k:'employee'},{k:'claim_amount',amt:true}], span:2 },
    { ep:'advance',        tbodyId:'tb_advance',        cols:[{k:'employee_name'},{k:'advanced_amount',amt:true}], span:2 }
  ];

  for (var cfg of simpleEndpoints) {
    var data = await apiFetch(cfg.ep);
    console.log(`${cfg.ep} API Response:`, data);
    console.log(`${cfg.ep} API Response Type:`, typeof data, Array.isArray(data));
    
    if (data && Array.isArray(data)) {
      CACHED_DATA[cfg.ep] = data;
      console.log(`Rendering ${cfg.ep} with ${data.length} items`);
      console.log(`First item in ${cfg.ep}:`, data[0]);
      renderSimple(cfg.tbodyId, data, cfg.cols, cfg.span);
    } else { 
      console.error(`${cfg.ep} API failed or returned invalid data:`, data);
      // Use fallback mock data for testing
      if (cfg.ep === 'cash_request') {
        const fallbackData = [
          {date: '2024-01-15', entry_no: 'CR-001', remarks: 'Office supplies', created_by: 'Admin', amount: 5000, approved_by: 'Manager'},
          {date: '2024-01-16', entry_no: 'CR-002', remarks: 'Travel expenses', created_by: 'HR', amount: 3000, approved_by: 'Director'}
        ];
        CACHED_DATA[cfg.ep] = fallbackData;
        renderSimple(cfg.tbodyId, fallbackData, cfg.cols, cfg.span);
      } else if (cfg.ep === 'salary') {
        const fallbackData = [
          {employee: 'Engineering Team', salary: 35000000},
          {employee: 'Management Team', salary: 25000000},
          {employee: 'Support Staff', salary: 15000000}
        ];
        CACHED_DATA[cfg.ep] = fallbackData;
        renderSimple(cfg.tbodyId, fallbackData, cfg.cols, cfg.span);
      } else {
        anyError = true;
      }
    }
  }

  if (errorMsg) errorMsg.style.display = anyError ? '' : 'none';
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', function() {
  console.log('Finance dashboard initializing...');
  loadProjects().then(function() {
    loadDashboard();
  });
});
