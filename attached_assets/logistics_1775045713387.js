// ══════════════════════════════════════════════════════
// LOGISTICS DASHBOARD — logistics.js
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

// ── LOGOUT ──
function logout() {
  sessionStorage.clear();
  window.location.href = 'login.html';
}

// ── DELAY COLOR ──
function delayClass(days) {
  if (days >= 7) return 'age-red';
  if (days >= 3) return 'age-orange';
  return 'age-green';
}

// ── TABLE CONFIG ──
var TABLES = {
  po_pending: {
    title: 'Po Made Logistics Entry Pending',
    color: '#48c9b0',
    kpiId: 'kpi_po_pending',
    badgeId: 'badge_po_pending',
    tbodyId: 'tb_po_pending',
    cols: ['S.NO', 'PO NO.', 'SUPPLIER', 'DELIVERY DATE', 'RECEIVED DATE', 'LOGISTIC TRACKING'],
    type: 'po'
  },
  supplier_delay: {
    title: 'Supplier Delay',
    color: '#e74c3c',
    kpiId: 'kpi_supplier_delay',
    badgeId: 'badge_supplier_delay',
    tbodyId: 'tb_supplier_delay',
    cols: ['S.NO', 'SUPPLIER NAME', 'PO NO.', 'DELAY DAYS'],
    type: 'supplier'
  },
  material_delay: {
    title: 'Material Delay',
    color: '#f5b041',
    kpiId: 'kpi_material_delay',
    badgeId: 'badge_material_delay',
    tbodyId: 'tb_material_delay',
    cols: ['S.NO', 'DESCRIPTION', 'PO NO.', 'SUPPLIER', 'DELAY DAYS'],
    type: 'material'
  },
  on_time: {
    title: 'On-Time Deliveries',
    color: '#5dade2',
    kpiId: 'kpi_on_time',
    badgeId: 'badge_on_time',
    tbodyId: 'tb_on_time',
    cols: ['S.NO', 'PO NO.', 'LOGISTICS TRACKING', 'EXPECTED DELIVERY'],
    type: 'tracking'
  },
  gprs_pending: {
    title: 'Gprs Tracking Not Entered',
    color: '#af7ac5',
    kpiId: 'kpi_gprs_pending',
    badgeId: 'badge_gprs_pending',
    tbodyId: 'tb_gprs_pending',
    cols: ['S.NO', 'PO NO.', 'LOGISTICS TRACKING', 'EXPECTED DELIVERY'],
    type: 'tracking'
  }
};

var DATA = {};

// ── BUILD ROW ──
function buildRow(type, r, i) {
  var n = i + 1;
  var dc = '';
  if (type === 'po')
    return '<tr><td>' + n + '</td><td class="link">' + (r.po_no||'—') + '</td><td>' + (r.supplier||'—') + '</td><td>' + (r.delivery_date||'—') + '</td><td>' + (r.received_date||'—') + '</td><td>' + (r.tracking||'—') + '</td></tr>';
  if (type === 'supplier') {
    dc = r.delay_days !== undefined ? delayClass(r.delay_days) : '';
    return '<tr><td>' + n + '</td><td>' + (r.supplier||'—') + '</td><td class="link">' + (r.po_no||'—') + '</td><td class="' + dc + '">' + (r.delay_days !== undefined ? r.delay_days + ' days' : '—') + '</td></tr>';
  }
  if (type === 'material') {
    dc = r.delay_days !== undefined ? delayClass(r.delay_days) : '';
    return '<tr><td>' + n + '</td><td>' + (r.description||'—') + '</td><td class="link">' + (r.po_no||'—') + '</td><td>' + (r.supplier||'—') + '</td><td class="' + dc + '">' + (r.delay_days !== undefined ? r.delay_days + ' days' : '—') + '</td></tr>';
  }
  if (type === 'tracking')
    return '<tr><td>' + n + '</td><td class="link">' + (r.po_no||'—') + '</td><td>' + (r.tracking||'—') + '</td><td>' + (r.expected_delivery||'—') + '</td></tr>';
  return '';
}

// ── RENDER TABLE ──
function renderTable(key, rows) {
  var cfg = TABLES[key];
  DATA[key] = rows;
  var count = rows.length;
  var kpiEl   = document.getElementById(cfg.kpiId);
  var badgeEl = document.getElementById(cfg.badgeId);
  if (kpiEl)   kpiEl.textContent   = count;
  if (badgeEl) badgeEl.textContent = count;
  var tbody = document.getElementById(cfg.tbodyId);
  if (!tbody) return;
  tbody.innerHTML = count
    ? rows.map(function(r, i) { return buildRow(cfg.type, r, i); }).join('')
    : '<tr><td colspan="' + cfg.cols.length + '" class="empty">No records</td></tr>';
  attachFilters(cfg.tbodyId);
}

// ── COLUMN FILTERS ──
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

// ── OPEN DETAIL OVERLAY ──
function openDetail(key) {
  var cfg  = TABLES[key];
  if (!cfg) return;
  var rows = DATA[key] || [];

  document.getElementById('detailTitle').textContent = cfg.title;
  document.getElementById('detailBadge').textContent = rows.length;
  document.getElementById('detailBadge').style.background = cfg.color;
  document.getElementById('detailAccentBar').style.background = cfg.color;

  // Build thead
  var thead = document.getElementById('detailThead');
  thead.innerHTML =
    '<tr>' + cfg.cols.map(function(c) { return '<th>' + c + '</th>'; }).join('') + '</tr>' +
    '<tr class="filter-row">' + cfg.cols.map(function() { return '<td><input placeholder="Filter..."/></td>'; }).join('') + '</tr>';

  // Build tbody
  var tbody = document.getElementById('detailTbody');
  tbody.innerHTML = rows.length
    ? rows.map(function(r, i) { return buildRow(cfg.type, r, i); }).join('')
    : '<tr><td colspan="' + cfg.cols.length + '" class="empty">No records found</td></tr>';

  // Attach detail filters
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

// ── CLOSE DETAIL OVERLAY ──
function closeDetail() {
  document.getElementById('detailOverlay').style.display = 'none';
}

// ── ESC KEY ──
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeDetail();
});

// ── LOAD DASHBOARD ──
async function loadDashboard() {
  try {
    var res = await fetch('https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_process_details');
    if (res.ok) {
      var json = await res.json();
      var data = json.message[0];
      document.getElementById('kpi_pending').textContent = data.pending || 0;
      document.getElementById('kpi_yesterday_elevated').textContent = data.yesterday_elevated || 0;
      document.getElementById('kpi_clarification').textContent = data.clarification || 0;
      document.getElementById('kpi_r_and_d').textContent = data.r_and_d || 0;
      document.getElementById('kpi_civil').textContent = data.civil || 0;
    }
  } catch(e) {
    console.error('Failed to load process data:', e);
  }
}

// ── INIT ──
loadDashboard();

// ── LUCIDE ICONS ──
if (typeof lucide !== 'undefined') {
  lucide.createIcons();
}
