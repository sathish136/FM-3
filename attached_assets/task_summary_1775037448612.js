frappe.pages['task-summary'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Task Summary Dashboard',
        single_column: true
    });

    // Create main container
    let $container = $('<div class="dashboard-container"></div>').appendTo(page.main);

    // Header HTML
    let headerHtml = `
        <div class="dashboard-header">
            <h1><i class="fa fa-tasks"></i> Task Dashboard</h1>
            <div class="header-stats">
                <div class="stat-card" style="background:#e8f5e9">
                    <i class="fa fa-check-circle" style="color:#4CAF50"></i>
                    <div><small>Completion</small><div id="today-completion">--%</div></div>
                </div>
                <div class="stat-card" style="background:#e3f2fd">
                    <i class="fa fa-users" style="color:#2196F3"></i>
                    <div><small>Employees</small><div id="active-employees">--</div></div>
                </div>
                <div class="stat-card" style="background:#fff3e0">
                    <i class="fa fa-clock-o" style="color:#FF9800"></i>
                    <div><small>Pending</small><div id="pending-tasks">--</div></div>
                </div>
                <div class="stat-card" style="background:#f3e5f5">
                    <i class="fa fa-line-chart" style="color:#9C27B0"></i>
                    <div><small>Efficiency</small><div id="efficiency-rate">--%</div></div>
                </div>
            </div>
        </div>
    `;

    // Filter Panel HTML
    let filterPanelHtml = `
        <div class="filter-panel">
            <div class="filter-row">
                <div class="date-section">
                    <h4><i class="fa fa-calendar"></i> Date Range</h4>
                    <div class="date-inputs">
                        <input type="date" class="from-date" id="from-date">
                        <span>to</span>
                        <input type="date" class="to-date" id="to-date">
                        <button class="btn-apply"><i class="fa fa-filter"></i> Apply</button>
                    </div>
                </div>
                
                <div class="quick-filters">
                    <h4><i class="fa fa-bolt"></i> Quick Filters</h4>
                    <div class="filter-buttons">
                        ${['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month', 'Last 7 Days', 'Last 30 Days']
                            .map(text => `<button class="quick-btn" data-filter="${text.toLowerCase().replace(/ /g, '_')}">${text}</button>`).join('')}
                    </div>
                </div>
            </div>
            
            <div class="view-section">
                <h4><i class="fa fa-eye"></i> View</h4>
                <div class="view-buttons">
                    <button class="view-btn active" data-view="department"><i class="fa fa-building"></i> Department</button>
                    <button class="view-btn" data-view="employee"><i class="fa fa-user"></i> Employee</button>
                    <button class="view-btn" data-view="idle-dept"><i class="fa fa-exclamation-triangle"></i> Idle Depts</button>
                    <button class="view-btn" data-view="idle-emp"><i class="fa fa-user-times"></i> Idle Emps</button>
                    <button class="btn-clear"><i class="fa fa-refresh"></i> Clear</button>
                    <button class="btn-export"><i class="fa fa-download"></i> Export</button>
                </div>
            </div>
        </div>
    `;

    // Results Container
    let resultsHtml = `
        <div class="results-container">
            <div class="results-header">
                <h3 id="results-title">Department Performance</h3>
                <div class="results-summary" id="results-summary">
                    <span class="summary-item"><i class="fa fa-building"></i> <span id="dept-count">0</span> Departments</span>
                    <span class="summary-item"><i class="fa fa-users"></i> <span id="emp-count">0</span> Employees</span>
                    <span class="summary-item"><i class="fa fa-tasks"></i> <span id="task-count">0</span> Tasks</span>
                </div>
            </div>
            <div id="content-area"></div>
        </div>
    `;

    $container.append(headerHtml + filterPanelHtml + resultsHtml);

    // Set default dates
    let today = frappe.datetime.get_today();
    let oneWeekAgo = frappe.datetime.add_days(today, -7);
    $('#from-date').val(oneWeekAgo);
    $('#to-date').val(today);

    // Event handlers
    $('.btn-apply').click(applyFilter);
    $('.btn-clear').click(clearFilters);
    $('.quick-btn').click(quickFilter);
    $('.view-btn').click(changeView);
    $('.btn-export').click(exportData);

    // Quick filter mapping
    const dateFilters = {
        today: () => [today, today],
        yesterday: () => [frappe.datetime.add_days(today, -1), frappe.datetime.add_days(today, -1)],
        this_week: () => {
            let startOfWeek = frappe.datetime.get_week_start(today);
            let endOfWeek = frappe.datetime.get_week_end(today);
            return [startOfWeek, endOfWeek];
        },
        last_week: () => {
            let lastWeek = frappe.datetime.add_days(today, -7);
            let startOfWeek = frappe.datetime.get_week_start(lastWeek);
            let endOfWeek = frappe.datetime.get_week_end(lastWeek);
            return [startOfWeek, endOfWeek];
        },
        this_month: () => [frappe.datetime.month_start(), frappe.datetime.month_end()],
        last_month: () => {
            let lastMonth = frappe.datetime.add_months(today, -1);
            return [frappe.datetime.month_start(lastMonth), frappe.datetime.month_end(lastMonth)];
        },
        last_7_days: () => [frappe.datetime.add_days(today, -6), today],
        last_30_days: () => [frappe.datetime.add_days(today, -29), today]
    };

    // Main functions
    function applyFilter() {
        let fromDate = $('#from-date').val();
        let toDate = $('#to-date').val();
        
        if (!fromDate || !toDate) {
            frappe.msgprint('Please select dates');
            return;
        }
        
        if (new Date(fromDate) > new Date(toDate)) {
            frappe.msgprint('From date cannot be greater than To date');
            return;
        }
        
        loadCurrentView(fromDate, toDate);
        updateDashboardStats(fromDate, toDate);
    }

    function quickFilter(e) {
        let filter = $(e.target).data('filter');
        if (dateFilters[filter]) {
            let [fromDate, toDate] = dateFilters[filter]();
            $('#from-date').val(fromDate);
            $('#to-date').val(toDate);
            applyFilter();
        }
    }

    function changeView(e) {
        $('.view-btn').removeClass('active');
        $(e.target).addClass('active');
        applyFilter();
    }

    function clearFilters() {
        $('#from-date').val(oneWeekAgo);
        $('#to-date').val(today);
        $('.view-btn').removeClass('active');
        $('.view-btn[data-view="department"]').addClass('active');
        $('#results-title').text('Department Performance');
        applyFilter();
    }

    function exportData() {
        let fromDate = $('#from-date').val();
        let toDate = $('#to-date').val();
        let view = $('.view-btn.active').data('view');
        
        let exportUrl = `/api/method/wtt_module.wtt_module.page.task_summary.task_summary.export_${view}_data?`;
        exportUrl += `from_date=${fromDate}&to_date=${toDate}`;
        
        window.open(exportUrl, '_blank');
    }

    function updateDashboardStats(fromDate, toDate) {
        frappe.call({
            method: 'wtt_module.wtt_module.page.task_summary.task_summary.get_dashboard_stats',
            args: { 
                from_date: fromDate, 
                to_date: toDate 
            },
            callback: function(r) {
                if (r.message) {
                    let data = r.message;
                    $('#today-completion').text(data.completion_rate + '%');
                    $('#active-employees').text(data.total_employees);
                    $('#pending-tasks').text(data.total_pending);
                    $('#efficiency-rate').text((data.overall_efficiency_rate || 0) + '%');
                }
            }
        });
    }

    function loadCurrentView(fromDate, toDate) {
        let view = $('.view-btn.active').data('view');
        $('#content-area').html('<div class="loading"><div class="spinner"></div>Loading...</div>');
        
        const titles = {
            department: 'Department Performance',
            employee: 'Employee Performance',
            'idle-dept': 'Departments with Idle Employees',
            'idle-emp': 'Employees with No Tasks'
        };
        
        $('#results-title').text(titles[view] || 'Performance Report');
        
        const methods = {
            department: 'get_department_performance_report',
            employee: 'get_employee_task_performance_with_dept',
            'idle-dept': 'get_departments_with_no_task_employees',
            'idle-emp': 'get_employees_with_no_tasks'
        };
        
        if (methods[view]) {
            frappe.call({
                method: `wtt_module.wtt_module.page.task_summary.task_summary.${methods[view]}`,
                args: { 
                    from_date: fromDate, 
                    to_date: toDate 
                },
                callback: (r) => {
                    if (r.message) {
                        displayData(view, r.message);
                        updateResultsSummary(view, r.message);
                    }
                },
                error: () => $('#content-area').html('<div class="error">Error loading data</div>')
            });
        }
    }

    function updateResultsSummary(view, data) {
        if (!data || data.length === 0) {
            $('#dept-count').text('0');
            $('#emp-count').text('0');
            $('#task-count').text('0');
            return;
        }

        if (view === 'department') {
            let totalEmployees = 0;
            let totalTasks = 0;
            let deptCount = 0;
            
            data.forEach(item => {
                if (item.department !== 'TOTAL') {
                    totalEmployees += item.total_employees || 0;
                    totalTasks += item.total_tasks || 0;
                    deptCount++;
                }
            });
            
            $('#dept-count').text(deptCount);
            $('#emp-count').text(totalEmployees);
            $('#task-count').text(totalTasks);
            
        } else if (view === 'employee') {
            $('#dept-count').text(new Set(data.map(d => d.department)).size);
            $('#emp-count').text(data.length);
            $('#task-count').text(data.reduce((sum, d) => sum + (d.total_tasks || 0), 0));
            
        } else if (view === 'idle-dept') {
            $('#dept-count').text(data.length);
            $('#emp-count').text(data.reduce((sum, d) => sum + (d.employees_without_tasks || 0), 0));
            $('#task-count').text('0');
            
        } else if (view === 'idle-emp') {
            $('#dept-count').text(new Set(data.map(d => d.department)).size);
            $('#emp-count').text(data.length);
            $('#task-count').text('0');
        }
    }

    function displayData(view, data) {
        // Remove total row if present for display purposes
        let displayData = data.filter(item => !item.is_total);
        
        if (displayData.length === 0) {
            $('#content-area').html('<div class="empty"><i class="fa fa-database"></i><br>No data found for the selected period</div>');
            return;
        }
        
        if (view === 'department') {
            displayDepartmentData(displayData);
        } else if (view === 'employee') {
            displayEmployeeData(displayData);
        } else if (view === 'idle-dept') {
            displayIdleDepartmentData(displayData);
        } else if (view === 'idle-emp') {
            displayIdleEmployeeData(displayData);
        }
    }

    function displayDepartmentData(data) {
        let html = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Department</th>
                            <th>Employees</th>
                            <th>Tasks</th>
                            <th title="Completion Rate: % of tasks completed">Completion</th>
                            <th>Pending</th>
                            <th>Completed</th>
                            <th title="Efficiency Rate: Tasks per employee day">Efficiency</th>
                            <th>Status</th>
                            <th>Rank</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        data.forEach((item, index) => {
            let completionRate = item.completion_rate || 0;
            let efficiencyRate = item.efficiency_rate || 0;
            let pendingTasks = (item.pending || 0) + (item.partially_pending || 0);
            let completedTasks = item.completed || 0;
            let totalTasks = item.total_tasks || 0;
            
            // Calculate color based on rate
            function getColor(rate) {
                if (rate >= 80) return '#4CAF50'; // Green
                if (rate >= 50) return '#FF9800'; // Orange
                return '#F44336'; // Red
            }
            
            html += `
                <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
                    <td class="department-cell">
                        <i class="fa fa-building"></i> 
                        <strong>${item.department || 'N/A'}</strong>
                    </td>
                    <td class="text-center">${item.total_employees || 0}</td>
                    <td class="text-center">${totalTasks}</td>
                    <td>
                        <div class="rate-display">
                            <div class="progress-circle" 
                                 style="background: conic-gradient(${getColor(completionRate)} 0% ${completionRate}%, #eee ${completionRate}% 100%)">
                                <span>${completionRate}%</span>
                            </div>
                            <small class="rate-label">${completedTasks}/${totalTasks}</small>
                        </div>
                    </td>
                    <td class="text-center pending-cell">${pendingTasks}</td>
                    <td class="text-center completed-cell">${completedTasks}</td>
                    <td>
                        <div class="rate-display">
                            <div class="progress-circle" 
                                 style="background: conic-gradient(${getColor(efficiencyRate)} 0% ${efficiencyRate}%, #eee ${efficiencyRate}% 100%)">
                                <span>${efficiencyRate}%</span>
                            </div>
                            <small class="rate-label">${totalTasks}/${item.total_present_days || 0} days</small>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${completionRate >= 80 ? 'good' : completionRate >= 50 ? 'medium' : 'poor'}">
                            <i class="fa fa-${completionRate >= 80 ? 'check' : completionRate >= 50 ? 'exclamation' : 'warning'}"></i>
                            ${completionRate >= 80 ? 'Excellent' : completionRate >= 50 ? 'Good' : 'Needs Work'}
                        </span>
                    </td>
                    <td class="text-center rank-cell">
                        <span class="rank-badge">#${item.rank || index + 1}</span>
                    </td>
                </tr>`;
        });
        
        html += `</tbody>
                </table>
            </div>`;
        
        $('#content-area').html(html);
    }

    function displayEmployeeData(data) {
        let html = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Department</th>
                            <th>Designation</th>
                            <th>Present Days</th>
                            <th>Tasks</th>
                            <th title="Completion Rate: % of tasks completed">Completion</th>
                            <th title="Efficiency Rate: Tasks per day">Efficiency</th>
                            <th>Status</th>
                            <th>Rank</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        data.forEach((item, index) => {
            let completionRate = item.completion_rate || 0;
            let efficiencyRate = item.efficiency_rate || 0;
            let pendingTasks = (item.pending || 0) + (item.partially_pending || 0);
            let completedTasks = item.completed || 0;
            let totalTasks = item.total_tasks || 0;
            
            // Get initials for avatar
            let initials = '?';
            if (item.employee_name) {
                let nameParts = item.employee_name.split(' ');
                initials = nameParts.map(part => part.charAt(0).toUpperCase()).join('').substring(0, 2);
            }
            
            // Calculate color based on rate
            function getColor(rate) {
                if (rate >= 80) return '#4CAF50';
                if (rate >= 50) return '#FF9800';
                return '#F44336';
            }
            
            html += `
                <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
                    <td class="employee-cell">
                        <div class="emp-info">
                            <div class="avatar" style="background: ${getColor(completionRate)}">${initials}</div>
                            <div>
                                <div class="emp-name">${item.employee_name || 'N/A'}</div>
                                <small class="emp-id">${item.employee || ''}</small>
                            </div>
                        </div>
                    </td>
                    <td>${item.department || 'N/A'}</td>
                    <td>${item.designation || 'N/A'}</td>
                    <td class="text-center">${item.present_days || 0}</td>
                    <td class="text-center">
                        <div class="task-breakdown">
                            <span class="completed">${completedTasks}</span>
                            <span class="separator">/</span>
                            <span class="total">${totalTasks}</span>
                        </div>
                    </td>
                    <td>
                        <div class="rate-display">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${completionRate}%; background: ${getColor(completionRate)}"></div>
                                <span>${completionRate}%</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="rate-display">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${efficiencyRate}%; background: ${getColor(efficiencyRate)}"></div>
                                <span>${efficiencyRate}%</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${completionRate >= 80 ? 'good' : completionRate >= 50 ? 'medium' : 'poor'}">
                            <i class="fa fa-${completionRate >= 80 ? 'star' : completionRate >= 50 ? 'check-circle' : 'exclamation-circle'}"></i>
                            ${completionRate >= 80 ? 'Top Performer' : completionRate >= 50 ? 'Good' : 'Needs Review'}
                        </span>
                    </td>
                    <td class="text-center rank-cell">
                        <span class="rank-badge">#${item.rank || index + 1}</span>
                    </td>
                </tr>`;
        });
        
        html += `</tbody>
                </table>
            </div>`;
        
        $('#content-area').html(html);
    }

    function displayIdleDepartmentData(data) {
        let html = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Department</th>
                            <th>Total Employees</th>
                            <th>Idle Employees</th>
                            <th>Idle %</th>
                            <th>Total Days</th>
                            <th>Idle Rate</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        data.forEach((item, index) => {
            let idlePercent = item.percentage_without_tasks || 0;
            let idleRate = item.idle_rate || 0;
            
            html += `
                <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
                    <td class="department-cell">
                        <i class="fa fa-building"></i> 
                        <strong>${item.department || 'N/A'}</strong>
                    </td>
                    <td class="text-center">${item.total_present_employees || 0}</td>
                    <td class="text-center warning-cell">
                        <strong style="color:#F44336">${item.employees_without_tasks || 0}</strong>
                    </td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${idlePercent}%; background: ${idlePercent > 30 ? '#F44336' : idlePercent > 10 ? '#FF9800' : '#4CAF50'}"></div>
                            <span>${idlePercent}%</span>
                        </div>
                    </td>
                    <td class="text-center">${item.total_present_days || 0}</td>
                    <td>
                        <div class="rate-display">
                            <div class="progress-circle" 
                                 style="background: conic-gradient(${idleRate > 30 ? '#F44336' : idleRate > 10 ? '#FF9800' : '#4CAF50'} 0% ${idleRate}%, #eee ${idleRate}% 100%)">
                                <span>${idleRate}%</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${idlePercent > 30 ? 'poor' : idlePercent > 10 ? 'medium' : 'good'}">
                            <i class="fa fa-${idlePercent > 30 ? 'exclamation-triangle' : idlePercent > 10 ? 'exclamation' : 'info'}"></i>
                            ${idlePercent > 30 ? 'High Idle' : idlePercent > 10 ? 'Medium Idle' : 'Low Idle'}
                        </span>
                    </td>
                    <td class="text-center">
                        <button class="btn-action" onclick="frappe.set_route('List', 'Task Allocation', {'department': '${item.department}'})">
                            <i class="fa fa-eye"></i> View Tasks
                        </button>
                    </td>
                </tr>`;
        });
        
        html += `</tbody>
                </table>
            </div>`;
        
        $('#content-area').html(html);
    }

    function displayIdleEmployeeData(data) {
        let html = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Department</th>
                            <th>Designation</th>
                            <th>Present Days</th>
                            <th>Tasks</th>
                            <th>Task Rate</th>
                            <th>Status</th>
                            <th>Last Active</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        data.forEach((item, index) => {
            // Get initials for avatar
            let initials = '?';
            if (item.employee_name) {
                let nameParts = item.employee_name.split(' ');
                initials = nameParts.map(part => part.charAt(0).toUpperCase()).join('').substring(0, 2);
            }
            
            let presentDays = item.present_days || 0;
            let taskRate = presentDays > 0 ? 0 : 0;
            
            html += `
                <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
                    <td class="employee-cell">
                        <div class="emp-info">
                            <div class="avatar idle">${initials}</div>
                            <div>
                                <div class="emp-name">${item.employee_name || 'N/A'}</div>
                                <small class="emp-id">${item.employee || ''}</small>
                            </div>
                        </div>
                    </td>
                    <td>${item.department || 'N/A'}</td>
                    <td>${item.designation || 'N/A'}</td>
                    <td class="text-center">${presentDays}</td>
                    <td class="text-center warning-cell">
                        <strong style="color:#F44336">${item.task_count || 0}</strong>
                    </td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${taskRate}%; background: #F44336"></div>
                            <span>${taskRate}%</span>
                        </div>
                    </td>
                    <td>
                        <span class="badge poor">
                            <i class="fa fa-exclamation-triangle"></i>
                            ${item.status || 'No Tasks'}
                        </span>
                    </td>
                    <td class="text-center">
                        ${item.last_active || 'Never'}
                    </td>
                    <td class="text-center">
                        <button class="btn-action" onclick="frappe.set_route('Form', 'Employee', '${item.employee}')">
                            <i class="fa fa-user"></i> Profile
                        </button>
                    </td>
                </tr>`;
        });
        
        html += `</tbody>
                </table>
            </div>`;
        
        $('#content-area').html(html);
    }

    // Compact CSS with enhanced styling for two rates
    $('head').append(`
        <style>
            .dashboard-container {padding:12px;background:#f5f7fa;min-height:100vh}
            
            /* Header Styles */
            .dashboard-header {background:#fff;padding:16px 20px;border-radius:10px;margin-bottom:12px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}
            .dashboard-header h1 {margin:0 0 12px 0;font-size:20px;color:#2c3e50;display:flex;align-items:center;gap:10px}
            .header-stats {display:flex;gap:12px;flex-wrap:wrap}
            .stat-card {display:flex;align-items:center;gap:12px;padding:12px 15px;border-radius:8px;flex:1;min-width:160px;transition:transform 0.2s}
            .stat-card:hover {transform:translateY(-2px)}
            .stat-card i {font-size:24px}
            .stat-card small {color:#666;display:block;font-size:12px;font-weight:500}
            .stat-card div div {font-size:20px;font-weight:bold;margin-top:2px;color:#2c3e50}
            
            /* Filter Panel */
            .filter-panel {background:#fff;padding:16px 20px;border-radius:10px;margin-bottom:12px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}
            .filter-panel h4 {margin:0 0 10px 0;font-size:14px;color:#2c3e50;display:flex;align-items:center;gap:8px;font-weight:600}
            .filter-row {display:flex;gap:24px;flex-wrap:wrap;margin-bottom:16px}
            .date-section, .quick-filters {flex:1;min-width:280px}
            .date-inputs {display:flex;align-items:center;gap:10px;flex-wrap:wrap}
            .date-inputs input {padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;width:140px}
            .date-inputs span {font-size:13px;color:#666;font-weight:500}
            .btn-apply {background:#3498db;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;transition:background 0.2s}
            .btn-apply:hover {background:#2980b9}
            
            .view-section {padding-top:16px;border-top:1px solid #f0f0f0}
            .filter-buttons, .view-buttons {display:flex;gap:8px;flex-wrap:wrap}
            .quick-btn, .view-btn, .btn-clear, .btn-export {padding:6px 12px;border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:13px;transition:all 0.2s;display:flex;align-items:center;gap:6px}
            .quick-btn, .view-btn {background:#f8f9fa}
            .quick-btn:hover, .view-btn:hover {background:#e9ecef;border-color:#ccc}
            .view-btn.active {background:#3498db;color:#fff;border-color:#3498db}
            .btn-clear {background:#e74c3c;color:#fff;border:none}
            .btn-clear:hover {background:#c0392b}
            .btn-export {background:#27ae60;color:#fff;border:none}
            .btn-export:hover {background:#219955}
            
            /* Results Container */
            .results-container {background:#fff;padding:16px 20px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}
            .results-header {margin-bottom:16px;display:flex;justify-content:space-between;align-items:center}
            .results-header h3 {margin:0;font-size:18px;color:#2c3e50;font-weight:600}
            .results-summary {display:flex;gap:20px;font-size:13px;color:#666}
            .summary-item {display:flex;align-items:center;gap:6px}
            .summary-item i {color:#3498db}
            
            /* Loading and Empty States */
            .loading {text-align:center;padding:40px;color:#666;font-size:14px}
            .spinner {width:30px;height:30px;border:3px solid #eee;border-top-color:#3498db;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px}
            @keyframes spin {to{transform:rotate(360deg)}}
            .empty, .error {text-align:center;padding:40px;color:#666;font-size:14px}
            .empty i, .error i {font-size:48px;margin-bottom:16px;color:#ddd}
            
            /* Table Container */
            .table-container {overflow-x:auto}
            
            /* Data Table */
            .data-table {width:100%;border-collapse:collapse;font-size:13px;min-width:800px}
            .data-table th {background:#f8f9fa;padding:12px 15px;text-align:left;border-bottom:2px solid #e9ecef;font-weight:600;color:#2c3e50;font-size:12px;position:sticky;top:0;z-index:10}
            .data-table th[title] {cursor:help}
            .data-table td {padding:12px 15px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
            .data-table tr:hover {background:#f9fafb}
            .data-table tr:last-child td {border-bottom:none}
            .data-table tr.even {background:#fafafa}
            
            /* Text Alignment */
            .text-center {text-align:center}
            
            /* Department and Employee Cells */
            .department-cell {display:flex;align-items:center;gap:10px;font-weight:500}
            .department-cell i {color:#3498db}
            
            .employee-cell .emp-info {display:flex;align-items:center;gap:10px}
            .avatar {width:36px;height:36px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;flex-shrink:0}
            .avatar.idle {background:#e74c3c}
            .emp-name {font-weight:500;line-height:1.2}
            .emp-id, .emp-info small {font-size:11px;color:#888;line-height:1.2}
            
            /* Rate Display */
            .rate-display {display:flex;flex-direction:column;align-items:center;gap:4px}
            .rate-label {font-size:11px;color:#666;white-space:nowrap}
            
            /* Progress Indicators */
            .progress-circle {width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative}
            .progress-circle span {font-size:10px;font-weight:bold;z-index:1}
            
            .progress-bar {width:100px;height:20px;background:#eee;border-radius:10px;overflow:hidden;position:relative}
            .progress-fill {height:100%;border-radius:10px;transition:width 0.3s}
            .progress-bar span {position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:10px;font-weight:bold;color:#fff;text-shadow:0 0 2px rgba(0,0,0,0.5)}
            
            /* Badges */
            .badge {padding:4px 10px;border-radius:12px;font-size:11px;font-weight:500;white-space:nowrap;display:inline-flex;align-items:center;gap:4px}
            .badge.good {background:#d4edda;color:#155724}
            .badge.medium {background:#fff3cd;color:#856404}
            .badge.poor {background:#f8d7da;color:#721c24}
            
            /* Rank Badge */
            .rank-cell {width:60px}
            .rank-badge {display:inline-block;width:30px;height:30px;line-height:30px;border-radius:50%;background:#3498db;color:white;font-weight:bold;font-size:12px}
            
            /* Task Breakdown */
            .task-breakdown {display:flex;align-items:center;justify-content:center;gap:4px}
            .task-breakdown .completed {color:#27ae60;font-weight:bold}
            .task-breakdown .total {color:#2c3e50;font-weight:bold}
            .task-breakdown .separator {color:#999}
            
            /* Special Cells */
            .pending-cell {color:#e74c3c;font-weight:bold}
            .completed-cell {color:#27ae60;font-weight:bold}
            .warning-cell {color:#e74c3c}
            
            /* Action Buttons */
            .btn-action {background:#3498db;color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;transition:background 0.2s;display:inline-flex;align-items:center;gap:4px}
            .btn-action:hover {background:#2980b9}
            
            /* Responsive */
            @media (max-width: 768px) {
                .header-stats {flex-direction:column}
                .stat-card {min-width:100%}
                .filter-row {flex-direction:column}
                .date-section, .quick-filters {min-width:100%}
                .results-header {flex-direction:column;align-items:flex-start;gap:12px}
                .results-summary {width:100%;justify-content:space-between}
            }
        </style>
    `);

    // Load initial data
    applyFilter();
};






















// frappe.pages['task-summary'].on_page_load = function(wrapper) {
//     var page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'Task Summary Dashboard',
//         single_column: true
//     });

//     // Create main container
//     let $container = $('<div class="dashboard-container"></div>').appendTo(page.main);

//     // Header HTML
//     let headerHtml = `
//         <div class="dashboard-header">
//             <h1><i class="fa fa-tasks"></i> Task Dashboard</h1>
//             <div class="header-stats">
//                 <div class="stat-card" style="background:#e8f5e9">
//                     <i class="fa fa-check-circle" style="color:#4CAF50"></i>
//                     <div><small>Completion</small><div id="today-completion">--%</div></div>
//                 </div>
//                 <div class="stat-card" style="background:#e3f2fd">
//                     <i class="fa fa-users" style="color:#2196F3"></i>
//                     <div><small>Employees</small><div id="active-employees">--</div></div>
//                 </div>
//                 <div class="stat-card" style="background:#fff3e0">
//                     <i class="fa fa-clock-o" style="color:#FF9800"></i>
//                     <div><small>Pending</small><div id="pending-tasks">--</div></div>
//                 </div>
//             </div>
//         </div>
//     `;

//     // Filter Panel HTML
//     let filterPanelHtml = `
//         <div class="filter-panel">
//             <div class="filter-row">
//                 <div class="date-section">
//                     <h4><i class="fa fa-calendar"></i> Date Range</h4>
//                     <div class="date-inputs">
//                         <input type="date" class="from-date" id="from-date">
//                         <span>to</span>
//                         <input type="date" class="to-date" id="to-date">
//                         <button class="btn-apply"><i class="fa fa-filter"></i> Apply</button>
//                     </div>
//                 </div>
                
//                 <div class="quick-filters">
//                     <h4><i class="fa fa-bolt"></i> Quick Filters</h4>
//                     <div class="filter-buttons">
//                         ${['Today', 'Yesterday', 'This Month', 'Last Month', 'Last 7 Days', 'Last 30 Days']
//                             .map(text => `<button class="quick-btn" data-filter="${text.toLowerCase().replace(' ', '_')}">${text}</button>`).join('')}
//                     </div>
//                 </div>
//             </div>
            
//             <div class="view-section">
//                 <h4><i class="fa fa-eye"></i> View</h4>
//                 <div class="view-buttons">
//                     <button class="view-btn active" data-view="department"><i class="fa fa-building"></i> Department</button>
//                     <button class="view-btn" data-view="employee"><i class="fa fa-user"></i> Employee</button>
//                     <button class="view-btn" data-view="idle-dept"><i class="fa fa-exclamation-triangle"></i> Idle Depts</button>
//                     <button class="view-btn" data-view="idle-emp"><i class="fa fa-user-times"></i> Idle Emps</button>
//                     <button class="btn-clear"><i class="fa fa-refresh"></i> Clear</button>
//                 </div>
//             </div>
//         </div>
//     `;

//     // Results Container
//     let resultsHtml = `
//         <div class="results-container">
//             <div class="results-header">
//                 <h3 id="results-title">Department Performance</h3>
//             </div>
//             <div id="content-area"></div>
//         </div>
//     `;

//     $container.append(headerHtml + filterPanelHtml + resultsHtml);

//     // Set default dates
//     let today = frappe.datetime.get_today();
//     $('#from-date').val(today);
//     $('#to-date').val(today);

//     // Event handlers
//     $('.btn-apply').click(applyFilter);
//     $('.btn-clear').click(clearFilters);
//     $('.quick-btn').click(quickFilter);
//     $('.view-btn').click(changeView);

//     // Quick filter mapping
//     const dateFilters = {
//         today: () => [today, today],
//         yesterday: () => [frappe.datetime.add_days(today, -1), frappe.datetime.add_days(today, -1)],
//         this_month: () => [frappe.datetime.month_start(), frappe.datetime.month_end()],
//         last_month: () => {
//             let lastMonth = frappe.datetime.add_months(today, -1);
//             return [frappe.datetime.month_start(lastMonth), frappe.datetime.month_end(lastMonth)];
//         },
//         last_7_days: () => [frappe.datetime.add_days(today, -6), today],
//         last_30_days: () => [frappe.datetime.add_days(today, -29), today]
//     };

//     // Main functions
//     function applyFilter() {
//         let fromDate = $('#from-date').val();
//         let toDate = $('#to-date').val();
        
//         if (!fromDate || !toDate) {
//             frappe.msgprint('Please select dates');
//             return;
//         }
        
//         if (new Date(fromDate) > new Date(toDate)) {
//             frappe.msgprint('From date cannot be greater than To date');
//             return;
//         }
        
//         loadCurrentView(fromDate, toDate);
//     }

//     function quickFilter(e) {
//         let filter = $(e.target).data('filter');
//         if (dateFilters[filter]) {
//             let [fromDate, toDate] = dateFilters[filter]();
//             $('#from-date').val(fromDate);
//             $('#to-date').val(toDate);
//             applyFilter();
//         }
//     }

//     function changeView(e) {
//         $('.view-btn').removeClass('active');
//         $(e.target).addClass('active');
//         applyFilter();
//     }

//     function clearFilters() {
//         $('#from-date').val(today);
//         $('#to-date').val(today);
//         $('.view-btn').removeClass('active');
//         $('.view-btn[data-view="department"]').addClass('active');
//         $('#results-title').text('Department Performance');
//         loadCurrentView(today, today);
//     }

//     function loadCurrentView(fromDate, toDate) {
//         let view = $('.view-btn.active').data('view');
//         $('#content-area').html('<div class="loading"><div class="spinner"></div>Loading...</div>');
        
//         $('#results-title').text({
//             department: 'Department Performance',
//             employee: 'Employee Performance',
//             'idle-dept': 'Departments with Idle Employees',
//             'idle-emp': 'Employees with No Tasks'
//         }[view] || 'Performance Report');
        
//         const methods = {
//             department: 'get_department_performance_report',
//             employee: 'get_employee_task_performance_with_dept',
//             'idle-dept': 'get_departments_with_no_task_employees',
//             'idle-emp': 'get_employees_with_no_tasks'
//         };
        
//         if (methods[view]) {
//             frappe.call({
//                 method: `wtt_module.wtt_module.page.task_summary.task_summary.${methods[view]}`,
//                 args: { from_date: fromDate, to_date: toDate },
//                 callback: (r) => r.message && displayData(view, r.message),
//                 error: () => $('#content-area').html('<div class="error">Error loading data</div>')
//             });
//         }
//     }

//     function displayData(view, data) {
//         if (data.length === 0) {
//             $('#content-area').html('<div class="empty">No data found</div>');
//             return;
//         }
        
//         if (view === 'department') {
//             displayDepartmentData(data);
//             updateStats(data);
//         } else if (view === 'employee') {
//             displayEmployeeData(data);
//         } else if (view === 'idle-dept') {
//             displayIdleDepartmentData(data);
//         } else if (view === 'idle-emp') {
//             displayIdleEmployeeData(data);
//         }
//     }

//     function displayDepartmentData(data) {
//         let html = `
//             <table class="data-table">
//                 <thead>
//                     <tr><th>Department</th><th>Employees</th><th>Tasks</th><th>Pending</th><th>Completed</th><th>Rate</th><th>Status</th></tr>
//                 </thead>
//                 <tbody>`;
        
//         data.forEach(item => {
//             let rate = item.completion_rate || 0;
//             html += `
//                 <tr>
//                     <td><i class="fa fa-building"></i> ${item.department || 'N/A'}</td>
//                     <td>${item.total_employees || 0}</td>
//                     <td>${item.total_tasks || 0}</td>
//                     <td>${(item.pending || 0) + (item.partially_pending || 0)}</td>
//                     <td>${item.completed || 0}</td>
//                     <td>
//                         <div class="progress-circle" style="background:conic-gradient(${rate >= 80 ? '#4CAF50' : rate >= 50 ? '#FF9800' : '#F44336'} 0% ${rate}%, #eee ${rate}% 100%)">
//                             <span>${rate}%</span>
//                         </div>
//                     </td>
//                     <td><span class="badge ${rate >= 80 ? 'good' : rate >= 50 ? 'medium' : 'poor'}">
//                         ${rate >= 80 ? 'Excellent' : rate >= 50 ? 'Good' : 'Needs Work'}
//                     </span></td>
//                 </tr>`;
//         });
        
//         html += '</tbody></table>';
//         $('#content-area').html(html);
//     }

//     function displayEmployeeData(data) {
//         let html = `
//             <table class="data-table">
//                 <thead>
//                     <tr><th>Employee</th><th>Department</th><th>Designation</th><th>Tasks</th><th>Completed</th><th>Rate</th><th>Status</th></tr>
//                 </thead>
//                 <tbody>`;
        
//         data.forEach(item => {
//             let rate = item.completion_rate || 0;
//             html += `
//                 <tr>
//                     <td>
//                         <div class="emp-info">
//                             <div class="avatar">${item.employee_name?.charAt(0) || '?'}</div>
//                             <div><div class="emp-name">${item.employee_name || 'N/A'}</div><small>${item.employee || ''}</small></div>
//                         </div>
//                     </td>
//                     <td>${item.department || 'N/A'}</td>
//                     <td>${item.designation || 'N/A'}</td>
//                     <td>${item.total_tasks || 0}</td>
//                     <td>${item.completed || 0}</td>
//                     <td>
//                         <div class="progress-bar">
//                             <div class="progress-fill" style="width:${rate}%;background:${rate >= 80 ? '#4CAF50' : rate >= 50 ? '#FF9800' : '#F44336'}"></div>
//                             <span>${rate}%</span>
//                         </div>
//                     </td>
//                     <td><span class="badge ${rate >= 80 ? 'good' : rate >= 50 ? 'medium' : 'poor'}">
//                         ${rate >= 80 ? 'Excellent' : rate >= 50 ? 'Good' : 'Needs Work'}
//                     </span></td>
//                 </tr>`;
//         });
        
//         html += '</tbody></table>';
//         $('#content-area').html(html);
//     }

//     function displayIdleDepartmentData(data) {
//         let html = `
//             <table class="data-table">
//                 <thead>
//                     <tr><th>Department</th><th>Total Employees</th><th>Idle Employees</th><th>Idle %</th><th>Status</th></tr>
//                 </thead>
//                 <tbody>`;
        
//         data.forEach(item => {
//             let percent = item.percentage_without_tasks || 0;
//             html += `
//                 <tr>
//                     <td><i class="fa fa-building"></i> ${item.department || 'N/A'}</td>
//                     <td>${item.total_present_employees || 0}</td>
//                     <td><strong style="color:#F44336">${item.employees_without_tasks || 0}</strong></td>
//                     <td>${percent}%</td>
//                     <td><span class="badge ${percent > 30 ? 'poor' : percent > 10 ? 'medium' : 'good'}">
//                         ${percent > 30 ? 'High Idle' : percent > 10 ? 'Medium Idle' : 'Low Idle'}
//                     </span></td>
//                 </tr>`;
//         });
        
//         html += '</tbody></table>';
//         $('#content-area').html(html);
//     }

//     function displayIdleEmployeeData(data) {
//         let html = `
//             <table class="data-table">
//                 <thead>
//                     <tr><th>Employee</th><th>Department</th><th>Designation</th><th>Present Days</th><th>Tasks</th><th>Status</th></tr>
//                 </thead>
//                 <tbody>`;
        
//         data.forEach(item => {
//             html += `
//                 <tr>
//                     <td>
//                         <div class="emp-info">
//                             <div class="avatar idle">${item.employee_name?.charAt(0) || '?'}</div>
//                             <div><div class="emp-name">${item.employee_name || 'N/A'}</div><small>${item.employee || ''}</small></div>
//                         </div>
//                     </td>
//                     <td>${item.department || 'N/A'}</td>
//                     <td>${item.designation || 'N/A'}</td>
//                     <td>${item.present_days || 0}</td>
//                     <td><strong style="color:#F44336">${item.task_count || 0}</strong></td>
//                     <td><span class="badge poor">${item.status || 'No Tasks'}</span></td>
//                 </tr>`;
//         });
        
//         html += '</tbody></table>';
//         $('#content-area').html(html);
//     }

//     function updateStats(data) {
//         let totalTasks = 0, totalCompleted = 0, totalEmployees = 0;
//         data.forEach(item => {
//             totalTasks += item.total_tasks || 0;
//             totalCompleted += item.completed || 0;
//             totalEmployees += item.total_employees || 0;
//         });
        
//         $('#today-completion').text((totalTasks ? Math.round((totalCompleted/totalTasks)*100) : 0) + '%');
//         $('#active-employees').text(totalEmployees);
//         $('#pending-tasks').text(totalTasks - totalCompleted);
//     }

//     // Compact CSS with reduced spacing
//     $('head').append(`
//         <style>
//             .dashboard-container {padding:8px;background:#f5f7fa}
            
//             /* Compact Header */
//             .dashboard-header {background:#fff;padding:12px 15px;border-radius:8px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
//             .dashboard-header h1 {margin:0 0 10px 0;font-size:18px;color:#333;display:flex;align-items:center;gap:8px}
//             .header-stats {display:flex;gap:10px;flex-wrap:wrap}
//             .stat-card {display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:6px;flex:1;min-width:140px}
//             .stat-card i {font-size:20px}
//             .stat-card small {color:#666;display:block;font-size:11px}
//             .stat-card div div {font-size:18px;font-weight:bold;margin-top:2px}
            
//             /* Compact Filter Panel */
//             .filter-panel {background:#fff;padding:12px 15px;border-radius:8px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
//             .filter-panel h4 {margin:0 0 8px 0;font-size:13px;color:#444;display:flex;align-items:center;gap:6px;font-weight:600}
//             .filter-row {display:flex;gap:20px;flex-wrap:wrap;margin-bottom:12px}
//             .date-section, .quick-filters {flex:1;min-width:250px}
//             .date-inputs {display:flex;align-items:center;gap:8px;flex-wrap:wrap}
//             .date-inputs input {padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px}
//             .date-inputs span {font-size:12px;color:#666}
//             .btn-apply {background:#4a6cf7;color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:13px;font-weight:500}
//             .btn-apply:hover {background:#3a5ce7}
            
//             .view-section {padding-top:12px;border-top:1px solid #f0f0f0}
//             .filter-buttons, .view-buttons {display:flex;gap:6px;flex-wrap:wrap}
//             .quick-btn, .view-btn {padding:5px 10px;border:1px solid #ddd;background:#f8f9fa;border-radius:4px;cursor:pointer;font-size:12px;transition:all 0.2s}
//             .quick-btn:hover, .view-btn:hover {background:#e9ecef;border-color:#ccc}
//             .view-btn.active {background:#4a6cf7;color:#fff;border-color:#4a6cf7}
//             .btn-clear {background:#ff6b6b;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px}
//             .btn-clear:hover {background:#ff5252}
            
//             /* Compact Results */
//             .results-container {background:#fff;padding:12px 15px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
//             .results-header {margin-bottom:12px}
//             .results-header h3 {margin:0;font-size:16px;color:#333;font-weight:600}
            
//             /* Loading and Empty States */
//             .loading {text-align:center;padding:30px;color:#666;font-size:14px}
//             .spinner {width:24px;height:24px;border:2px solid #eee;border-top-color:#4a6cf7;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 8px}
//             @keyframes spin {to{transform:rotate(360deg)}}
//             .empty, .error {text-align:center;padding:30px;color:#666;font-size:14px}
            
//             /* Compact Table */
//             .data-table {width:100%;border-collapse:collapse;font-size:13px}
//             .data-table th {background:#f8f9fa;padding:8px 10px;text-align:left;border-bottom:2px solid #e9ecef;font-weight:600;color:#495057;font-size:12px}
//             .data-table td {padding:8px 10px;border-bottom:1px solid #f0f0f0}
//             .data-table tr:hover {background:#f9fafb}
//             .data-table tr:last-child td {border-bottom:none}
            
//             /* Compact Avatar and Employee Info */
//             .emp-info {display:flex;align-items:center;gap:8px}
//             .avatar {width:30px;height:30px;border-radius:50%;background:#4a6cf7;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;flex-shrink:0}
//             .avatar.idle {background:#ff6b6b}
//             .emp-name {font-weight:500;line-height:1.2}
//             .emp-info small {font-size:11px;color:#888;line-height:1.2}
            
//             /* Compact Progress Indicators */
//             .progress-circle {width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative}
//             .progress-circle span {font-size:10px;font-weight:bold;z-index:1}
            
//             .progress-bar {width:90px;height:18px;background:#eee;border-radius:9px;overflow:hidden;position:relative}
//             .progress-fill {height:100%;border-radius:9px;transition:width 0.3s}
//             .progress-bar span {position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:10px;font-weight:bold;color:#fff;text-shadow:0 0 2px #000}
            
//             /* Compact Badges */
//             .badge {padding:3px 8px;border-radius:10px;font-size:10px;font-weight:500;white-space:nowrap}
//             .badge.good {background:#d4edda;color:#155724}
//             .badge.medium {background:#fff3cd;color:#856404}
//             .badge.poor {background:#f8d7da;color:#721c24}
//         </style>
//     `);

//     // Load initial data
//     loadCurrentView(today, today);
// };

