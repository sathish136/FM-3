// ══════════════════════════════════════════════════════
// PROCESS & PROPOSAL DASHBOARD — process_proposal.js
// ══════════════════════════════════════════════════════

// ── CLOCK ──
function updateClock() {
  const now = new Date();
  const d = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const t = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const el = document.getElementById('datetime');
  if (el) el.textContent = `${d} • ${t}`;
}
setInterval(updateClock, 1000);
updateClock();

// ── LOGOUT ──
function logout() {
  sessionStorage.clear();
  window.location.href = 'login.html';
}

// ── AGE CLASS ──
function ageClass(days) {
  if (days >= 7) return 'age-red';
  if (days >= 3) return 'age-orange';
  return 'age-green';
}

// ── ACCENT COLORS PER TABLE ──
const ACCENT = {
  proc_today:      '#48c9b0',
  proc_yest:       '#ec7063',
  proc_mkt:        '#f5b041',
  proc_rd:         '#af7ac5',
  proc_civil:      '#5dade2',
  prop_today:      '#48c9b0',
  prop_yest:       '#ec7063',
  prop_last_week:  '#8e44ad',
  prop_this_week:  '#9b59b6',
  prop_last_month: '#2980b9',
  prop_this_month: '#3498db',
};

// ── TABLE CONFIG ──
const TABLES = {
  proc_today:      { title: "Overall Pending (Process)",         kpiId: 'kpi_proc_today',  badgeId: 'badge_proc_today',  tbodyId: 'tb_proc_today',  cols: ['S.NO','DATE','COMPANY NAME','CAPACITY','REQUIREMENT','AGE'], type: 'process_table', apiKey: 'proc_today' },
  proc_yest:       { title: "Yesterday's Elevated (Process)", kpiId: 'kpi_proc_yest',   badgeId: 'badge_proc_yest',   tbodyId: 'tb_proc_yest',   cols: ['S.NO','COMPANY NAME','CAPACITY','REQUIREMENT'], type: 'yesterday_elevated', apiKey: 'proc_yest' },
  proc_mkt:        { title: 'Clarification (Marketing Team)', kpiId: 'kpi_proc_mkt',    badgeId: 'badge_proc_mkt',    tbodyId: 'tb_proc_mkt',    cols: ['S.NO','DATE','COMPANY NAME','CAPACITY','REQUIREMENT','AGE'], type: 'clarification_table', apiKey: 'proc_mkt' },
  proc_rd:         { title: 'R&D',                            kpiId: 'kpi_proc_rd',     badgeId: 'badge_proc_rd',     tbodyId: 'tb_proc_rd',     cols: ['S.NO','DATE','COMPANY NAME','CAPACITY','REQUIREMENT','AGE'], type: 'rd_table', apiKey: 'proc_rd' },
  proc_civil:      { title: 'CIVIL',                          kpiId: 'kpi_proc_civil',  badgeId: 'badge_proc_civil',  tbodyId: 'tb_proc_civil',  cols: ['S.NO','DATE','COMPANY NAME','CAPACITY','REQUIREMENT','AGE'], type: 'civil_table', apiKey: 'proc_civil' },
  prop_today:      { title: "Today's Pending (Proposal)",     kpiId: 'kpi_prop_today',  badgeId: 'badge_prop_today',  tbodyId: 'tb_prop_today',  cols: ['S.NO','DATE','COMPANY NAME','CAPACITY','REQUIREMENT','AGE'], type: 'standard', apiKey: 'prop_today' },
  prop_yest:       { title: "Yesterday's Elevated (Proposal)", kpiId: 'kpi_prop_yest',   badgeId: 'badge_prop_yest',   tbodyId: 'tb_prop_yest',   cols: ['S.NO','COMPANY NAME','CAPACITY','REQUIREMENT'], type: 'yesterday_elevated', apiKey: 'prop_yest' },
  prop_last_week:  { title: 'Last Week Projects',             kpiId: 'kpi_last_week',   badgeId: 'badge_last_week',   tbodyId: 'tb_last_week',   cols: ['S.NO','PROPOSAL REQUEST','COMPANY NAME','CAPACITY'], type: 'proposal_project',  apiKey: 'prop_last_week' },
  prop_this_week:  { title: 'This Week Projects',             kpiId: 'kpi_this_week',   badgeId: 'badge_this_week',   tbodyId: 'tb_this_week',   cols: ['S.NO','PROPOSAL REQUEST','COMPANY NAME','CAPACITY'], type: 'proposal_project',  apiKey: 'prop_this_week' },
  prop_last_month: { title: 'Last Month Projects',            kpiId: 'kpi_last_month',  badgeId: 'badge_last_month',  tbodyId: 'tb_last_month',  cols: ['S.NO','PROPOSAL REQUEST','COMPANY NAME','CAPACITY'], type: 'proposal_project',  apiKey: 'prop_last_month' },
  prop_this_month: { title: 'This Month Projects',            kpiId: 'kpi_this_month',  badgeId: 'badge_this_month',  tbodyId: 'tb_this_month',  cols: ['S.NO','PROPOSAL REQUEST','COMPANY NAME','CAPACITY'], type: 'proposal_project',  apiKey: 'prop_this_month' },
};

// ── DATA STORE ──
const DATA = {};

// ── BUILD ROW HTML ──
function buildRow(cfg, r, i) {
  if (cfg.type === 'proposal_project') {
    return `<tr>
      <td>${i + 1}</td>
      <td title="${r.proposal_request || ''}">${r.proposal_request || '—'}</td>
      <td title="${r.company_name || ''}">${r.company_name || '—'}</td>
      <td>${r.plant_capacity_m3day || '—'}</td>
    </tr>`;
  }
  if (cfg.type === 'project') {
    return `<tr>
      <td>${i + 1}</td>
      <td title="${r.project_name || ''}">${r.project_name || '—'}</td>
      <td>${r.capacity || '—'}</td>
      <td>${r.total_price || '—'}</td>
      <td>${r.time_taken || '—'}</td>
    </tr>`;
  }
  if (cfg.type === 'process_table') {
    // Use the correct field name: recent_process_date instead of recent_elevated_date
    const dateValue = r.recent_process_date || r.recent_elevated_date || r.date || 'No date';
    
    return `<tr>
      <td>${i + 1}</td>
      <td>${dateValue}</td>
      <td title="${r.company_name || ''}">${r.company_name || '—'}</td>
      <td>${r.plant_capacity_m3day || '—'}</td>
      <td title="${r.plant_requirement || ''}">${r.plant_requirement || 'No requirement specified'}</td>
      <td class="${ageClass(r.age_days)}">${r.age_days !== undefined ? r.age_days : '—'}</td>
    </tr>`;
  }
  if (cfg.type === 'yesterday_elevated') {
    // Yesterday elevated table without date and age columns
    return `<tr>
      <td>${i + 1}</td>
      <td title="${r.company_name || ''}">${r.company_name || '—'}</td>
      <td>${r.plant_capacity_m3day || '—'}</td>
      <td title="${r.plant_requirement || ''}">${r.plant_requirement || 'No requirement specified'}</td>
    </tr>`;
  }
  if (cfg.type === 'clarification_table') {
    // Clarification table with recent_clarification_date and age_days
    const dateValue = r.recent_clarification_date || r.date || 'No date';
    
    return `<tr>
      <td>${i + 1}</td>
      <td>${dateValue}</td>
      <td title="${r.company_name || ''}">${r.company_name || '—'}</td>
      <td>${r.plant_capacity_m3day || '—'}</td>
      <td title="${r.plant_requirement || ''}">${r.plant_requirement || 'No requirement specified'}</td>
      <td class="${ageClass(r.age_days)}">${r.age_days !== undefined ? r.age_days : '—'}</td>
    </tr>`;
  }
  if (cfg.type === 'rd_table') {
    // R&D table - assuming similar structure to clarification
    const dateValue = r.recent_rd_date || r.recent_clarification_date || r.date || 'No date';
    
    return `<tr>
      <td>${i + 1}</td>
      <td>${dateValue}</td>
      <td title="${r.company_name || ''}">${r.company_name || '—'}</td>
      <td>${r.plant_capacity_m3day || '—'}</td>
      <td title="${r.plant_requirement || ''}">${r.plant_requirement || 'No requirement specified'}</td>
      <td class="${ageClass(r.age_days)}">${r.age_days !== undefined ? r.age_days : '—'}</td>
    </tr>`;
  }
  if (cfg.type === 'civil_table') {
    // CIVIL table - assuming similar structure to clarification
    const dateValue = r.recent_civil_date || r.recent_clarification_date || r.date || 'No date';
    
    return `<tr>
      <td>${i + 1}</td>
      <td>${dateValue}</td>
      <td title="${r.company_name || ''}">${r.company_name || '—'}</td>
      <td>${r.plant_capacity_m3day || '—'}</td>
      <td title="${r.plant_requirement || ''}">${r.plant_requirement || 'No requirement specified'}</td>
      <td class="${ageClass(r.age_days)}">${r.age_days !== undefined ? r.age_days : '—'}</td>
    </tr>`;
  }
  // Default case for proposal tables (standard type)
  const dateValue = r.recent_process_date || r.date || 'No date';
  return `<tr>
    <td>${i + 1}</td>
    <td>${dateValue}</td>
    <td title="${r.company_name || r.company || ''}">${r.company_name || r.company || '—'}</td>
    <td>${r.plant_capacity_m3day || r.capacity || '—'}</td>
    <td title="${r.plant_requirement || r.requirement || ''}">${r.plant_requirement || r.requirement || 'No requirement specified'}</td>
    <td class="${ageClass(r.age_days || r.age)}">${r.age_days !== undefined ? r.age_days : (r.age !== undefined ? r.age : '—')}</td>
  </tr>`;
}

// ── RENDER TABLE ──
function renderTable(key, rows) {
  const cfg = TABLES[key];
  DATA[key] = rows;
  const count = rows.length;
  
  // Limit to 5 rows for display
  const displayRows = rows.slice(0, 5);

  // Only update badge elements, not KPI elements for process data
  const badgeEl = cfg.badgeId ? document.getElementById(cfg.badgeId) : null;
  if (badgeEl) badgeEl.textContent = count; // Show total count in badge

  const tbody = document.getElementById(cfg.tbodyId);
  if (!tbody) {
    console.error(`Table body not found: ${cfg.tbodyId}`);
    return;
  }

  if (!displayRows.length) {
    tbody.innerHTML = `<tr><td colspan="${cfg.cols.length}" class="empty">No records</td></tr>`;
    return;
  }
  
  tbody.innerHTML = displayRows.map((r, i) => buildRow(cfg, r, i)).join('');
  attachFilters(cfg.tbodyId);
}

// ── COLUMN FILTERS ──
function attachFilters(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const table = tbody.closest('table');
  if (!table) return;
  const filterInputs = table.querySelectorAll('.filter-row input');

  filterInputs.forEach(inp => {
    inp.addEventListener('input', () => {
      tbody.querySelectorAll('tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        let show = true;
        filterInputs.forEach((fi, ci) => {
          const val = fi.value.trim().toLowerCase();
          if (val && cells[ci] && !cells[ci].textContent.toLowerCase().includes(val)) show = false;
        });
        row.style.display = show ? '' : 'none';
      });
    });
  });
}

// ── DETAIL OVERLAY — open ──
function openDetail(key) {
  const cfg = TABLES[key];
  if (!cfg) return;
  const rows = DATA[key] || [];

  // Set accent color
  const accent = ACCENT[key] || '#1a2a5e';
  const bar = document.getElementById('detailAccentBar');
  if (bar) bar.style.background = accent;

  const badge = document.getElementById('detailBadge');
  if (badge) { badge.textContent = rows.length; badge.style.background = accent; }

  document.getElementById('detailTitle').textContent = cfg.title;

  // Build header + filter row
  const thead = document.getElementById('detailThead');
  thead.innerHTML = `
    <tr>${cfg.cols.map(c => `<th>${c}</th>`).join('')}</tr>
    <tr class="filter-row">${cfg.cols.map(() => `<td><input placeholder="Filter..."/></td>`).join('')}</tr>
  `;

  // Build rows
  const tbody = document.getElementById('detailTbody');
  tbody.innerHTML = rows.length
    ? rows.map((r, i) => buildRow(cfg, r, i)).join('')
    : `<tr><td colspan="${cfg.cols.length}" class="empty">No records found</td></tr>`;

  // Attach overlay filters
  const filterInputs = thead.querySelectorAll('.filter-row input');
  filterInputs.forEach(inp => {
    inp.addEventListener('input', () => {
      tbody.querySelectorAll('tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        let show = true;
        filterInputs.forEach((fi, ci) => {
          const val = fi.value.trim().toLowerCase();
          if (val && cells[ci] && !cells[ci].textContent.toLowerCase().includes(val)) show = false;
        });
        row.style.display = show ? '' : 'none';
      });
    });
  });

  document.getElementById('detailOverlay').style.display = 'flex';
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// ── DETAIL OVERLAY — close ──
function closeDetail() {
  document.getElementById('detailOverlay').style.display = 'none';
}

// Close on Escape key
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

// ── LOAD DASHBOARD ──
async function loadDashboard() {
  console.log('loadDashboard called');
  try {
    // Load Process KPI data
    const res = await fetch('/api/process_proposal/process_details');
    console.log('Fetch response:', res.status, res.ok);
    if (res.ok) {
      const json = await res.json();
      console.log('API Response:', json);
      const data = json.message[0];
      console.log('Process data:', data);
      
      // Update Process KPI values
      const kpiPending = document.getElementById('kpi_proc_today');
      const kpiYesterday = document.getElementById('kpi_proc_yest');
      const kpiClarification = document.getElementById('kpi_proc_mkt');
      const kpiRD = document.getElementById('kpi_proc_rd');
      const kpiCivil = document.getElementById('kpi_proc_civil');
      
      const badgePending = document.getElementById('badge_proc_today');
      const badgeYesterday = document.getElementById('badge_proc_yest');
      const badgeClarification = document.getElementById('badge_proc_mkt');
      const badgeRD = document.getElementById('badge_proc_rd');
      const badgeCivil = document.getElementById('badge_proc_civil');
      
      if (kpiPending) kpiPending.textContent = data.pending || 0;
      if (kpiYesterday) kpiYesterday.textContent = data.yesterday_elevated || 0;
      if (kpiClarification) kpiClarification.textContent = data.clarification || 0;
      if (kpiRD) kpiRD.textContent = data.r_and_d || 0;
      if (kpiCivil) kpiCivil.textContent = data.civil || 0;
      
      if (badgePending) badgePending.textContent = data.pending || 0;
      if (badgeYesterday) badgeYesterday.textContent = data.yesterday_elevated || 0;
      if (badgeClarification) badgeClarification.textContent = data.clarification || 0;
      if (badgeRD) badgeRD.textContent = data.r_and_d || 0;
      if (badgeCivil) badgeCivil.textContent = data.civil || 0;
    }
    
    // Load Proposal KPI data
    const proposalRes = await fetch('/api/process_proposal/proposal_details');
    if (proposalRes.ok) {
      const proposalJson = await proposalRes.json();
      const proposalData = proposalJson.message[0];
      console.log('Proposal data:', proposalData);
      
      // Update Proposal KPI values
      const kpiPropToday = document.getElementById('kpi_prop_today');
      const kpiPropYest = document.getElementById('kpi_prop_yest');
      const kpiLastWeek = document.getElementById('kpi_last_week');
      const kpiThisWeek = document.getElementById('kpi_this_week');
      const kpiLastMonth = document.getElementById('kpi_last_month');
      const kpiThisMonth = document.getElementById('kpi_this_month');
      
      if (kpiPropToday) kpiPropToday.textContent = proposalData.pending || 0;
      if (kpiPropYest) kpiPropYest.textContent = proposalData.yesterday_elevated || 0;
      if (kpiLastWeek) kpiLastWeek.textContent = proposalData.last_week_completed || 0;
      if (kpiThisWeek) kpiThisWeek.textContent = proposalData.this_week_completed || 0;
      if (kpiLastMonth) kpiLastMonth.textContent = proposalData.last_month_completed || 0;
      if (kpiThisMonth) kpiThisMonth.textContent = proposalData.this_month_completed || 0;
    }
    
    // Load table data for Today's Pending
    const tableRes = await fetch('/api/process_proposal/process_details_table');
    if (tableRes.ok) {
      const tableJson = await tableRes.json();
      const tableData = tableJson.message || [];
      console.log('Table data loaded:', tableData.length, 'rows');
      renderTable('proc_today', tableData);
    } else {
      console.error('Table API failed:', tableRes.status, tableRes.statusText);
      renderTable('proc_today', []); // Render empty table
    }
    
    // Load table data for Yesterday's Elevated
    const yesterdayRes = await fetch('/api/process_proposal/yesterday_elevated_details');
    if (yesterdayRes.ok) {
      const yesterdayJson = await yesterdayRes.json();
      const yesterdayData = yesterdayJson.message || [];
      console.log('Yesterday elevated data loaded:', yesterdayData.length, 'rows');
      renderTable('proc_yest', yesterdayData);
    } else {
      console.error('Yesterday elevated API failed:', yesterdayRes.status, yesterdayRes.statusText);
      renderTable('proc_yest', []); // Render empty table
    }
    
    // Load table data for Clarification (Marketing Team)
    const clarificationRes = await fetch('/api/process_proposal/clarification_details');
    if (clarificationRes.ok) {
      const clarificationJson = await clarificationRes.json();
      const clarificationData = clarificationJson.message || [];
      console.log('Clarification data loaded:', clarificationData.length, 'rows');
      renderTable('proc_mkt', clarificationData);
    } else {
      console.error('Clarification API failed:', clarificationRes.status, clarificationRes.statusText);
      renderTable('proc_mkt', []); // Render empty table
    }
    
    // Load table data for R&D
    const rdRes = await fetch('/api/process_proposal/rd_details');
    if (rdRes.ok) {
      const rdJson = await rdRes.json();
      const rdData = rdJson.message || [];
      console.log('R&D data loaded:', rdData.length, 'rows');
      renderTable('proc_rd', rdData);
    } else {
      console.error('R&D API failed:', rdRes.status, rdRes.statusText);
      renderTable('proc_rd', []); // Render empty table
    }
    
    // Load table data for CIVIL
    const civilRes = await fetch('/api/process_proposal/civil_details');
    if (civilRes.ok) {
      const civilJson = await civilRes.json();
      const civilData = civilJson.message || [];
      console.log('CIVIL data loaded:', civilData.length, 'rows');
      renderTable('proc_civil', civilData);
    } else {
      console.error('CIVIL API failed:', civilRes.status, civilRes.statusText);
      renderTable('proc_civil', []); // Render empty table
    }
    
    // Load proposal table data
    const proposalTableRes = await fetch('/api/process_proposal/proposal_details_table');
    if (proposalTableRes.ok) {
      const proposalTableJson = await proposalTableRes.json();
      const proposalTableData = proposalTableJson.message || [];
      console.log('Proposal table data loaded:', proposalTableData.length, 'rows');
      renderTable('prop_today', proposalTableData);
    } else {
      renderTable('prop_today', []);
    }
    
    const propYestRes = await fetch('/api/process_proposal/proposal_yesterday_elevated');
    if (propYestRes.ok) {
      const propYestJson = await propYestRes.json();
      const propYestData = propYestJson.message || [];
      renderTable('prop_yest', propYestData);
    } else {
      renderTable('prop_yest', []);
    }
    
    const propThisWeekRes = await fetch('/api/process_proposal/proposal_this_week_elevated');
    if (propThisWeekRes.ok) {
      const propThisWeekJson = await propThisWeekRes.json();
      const propThisWeekData = propThisWeekJson.message || [];
      renderTable('prop_this_week', propThisWeekData);
    } else {
      renderTable('prop_this_week', []);
    }
    
    const propLastWeekRes = await fetch('/api/process_proposal/proposal_last_week_elevated');
    if (propLastWeekRes.ok) {
      const propLastWeekJson = await propLastWeekRes.json();
      const propLastWeekData = propLastWeekJson.message || [];
      renderTable('prop_last_week', propLastWeekData);
    } else {
      renderTable('prop_last_week', []);
    }
    
    const propThisMonthRes = await fetch('/api/process_proposal/proposal_this_month_elevated');
    if (propThisMonthRes.ok) {
      const propThisMonthJson = await propThisMonthRes.json();
      const propThisMonthData = propThisMonthJson.message || [];
      renderTable('prop_this_month', propThisMonthData);
    } else {
      renderTable('prop_this_month', []);
    }
    
    const propLastMonthRes = await fetch('/api/process_proposal/proposal_last_month_elevated');
    if (propLastMonthRes.ok) {
      const propLastMonthJson = await propLastMonthRes.json();
      const propLastMonthData = propLastMonthJson.message || [];
      renderTable('prop_last_month', propLastMonthData);
    } else {
      renderTable('prop_last_month', []);
    }
    
  } catch (e) {
    console.error('Failed to load process data:', e);
  }
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing dashboard...');
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  // Add a small delay to ensure all elements are rendered
  setTimeout(() => {
    loadDashboard();
  }, 100);
});