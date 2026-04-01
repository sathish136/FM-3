import frappe
from datetime import datetime

# Departments to skip
SKIP_DEPARTMENTS = ["MD - WTT", "House keeping - WTT"]

# Admin department filter - only these employees
ADMIN_DEPT = "Admin - WTT"
ADMIN_ALLOWED_EMPLOYEES = ["WTT1599", "WTT1211"]

@frappe.whitelist()
def get_department_performance_report(from_date=None, to_date=None):
    """
    Returns department performance with two rate metrics:
    1. Completion Rate - Percentage of tasks completed
    2. Efficiency Rate - Tasks per employee day (productivity)
    """
    
    values = {
        'skip_departments': SKIP_DEPARTMENTS,
        'admin_dept': ADMIN_DEPT,
        'admin_allowed_employees': ADMIN_ALLOWED_EMPLOYEES
    }
    conditions = []
    task_conditions = []
    
    # Build conditions for attendance
    if from_date:
        conditions.append("DATE(time) >= %(from_date)s")
        task_conditions.append("DATE(wu.from_time) >= %(from_date)s")
        values["from_date"] = from_date
    
    if to_date:
        conditions.append("DATE(time) <= %(to_date)s")
        task_conditions.append("DATE(wu.to_time) <= %(to_date)s")
        values["to_date"] = to_date
    
    # Add department skip conditions
    conditions.append("custom_department NOT IN %(skip_departments)s")
    task_conditions.append("ta.department NOT IN %(skip_departments)s")
    
    # Add Admin department filter
    conditions.append("(custom_department != %(admin_dept)s OR employee IN %(admin_allowed_employees)s)")
    task_conditions.append("(ta.department != %(admin_dept)s OR ta.employee IN %(admin_allowed_employees)s)")
    
    # Build WHERE clauses
    attendance_where = ""
    if conditions:
        conditions.append("custom_department IS NOT NULL AND custom_department != ''")
        attendance_where = " WHERE " + " AND ".join(conditions)
    
    task_where = ""
    if task_conditions:
        task_where = " AND " + " AND ".join(task_conditions)
    
    # Main query with two rate calculations - FIXED: Use %% for literal % in SQL
    query = """
        WITH attendance_data AS (
            SELECT
                custom_department AS department,
                COUNT(DISTINCT employee) AS total_employees,
                SUM(employee_present_days) AS total_present_days
            FROM (
                SELECT
                    custom_department,
                    employee,
                    COUNT(DISTINCT DATE(time)) AS employee_present_days
                FROM
                    `tabEmployee Checkin`
                {attendance_where}
                GROUP BY
                    custom_department, employee
            ) AS emp_attendance
            GROUP BY
                custom_department
        ),
        task_data AS (
            SELECT
                ta.department,
                COUNT(wu.name) AS total_tasks,
                COUNT(CASE
                    WHEN wu.status = 'Pending' THEN wu.name
                END) AS pending,
                COUNT(CASE
                    WHEN wu.status = 'Partially pending' THEN wu.name
                END) AS partially_pending,
                COUNT(CASE
                    WHEN wu.status = 'Completed' THEN wu.name
                END) AS completed
            FROM
                `tabTask Allocation` ta
            LEFT JOIN
                `tabWork Update` wu
                ON wu.parent = ta.name
                AND wu.parenttype = 'Task Allocation'
            WHERE
                ta.department IS NOT NULL
                AND ta.department != ''
                AND wu.name IS NOT NULL
                {task_where}
            GROUP BY
                ta.department
        ),
        combined_data AS (
            SELECT
                COALESCE(a.department, t.department) AS department,
                COALESCE(a.total_employees, 0) AS total_employees,
                COALESCE(a.total_present_days, 0) AS total_present_days,
                COALESCE(t.total_tasks, 0) AS total_tasks,
                COALESCE(t.pending, 0) AS pending,
                COALESCE(t.partially_pending, 0) AS partially_pending,
                COALESCE(t.completed, 0) AS completed
            FROM
                attendance_data a
            LEFT JOIN
                task_data t
                ON a.department = t.department
            
            UNION
            
            SELECT
                COALESCE(a.department, t.department) AS department,
                COALESCE(a.total_employees, 0) AS total_employees,
                COALESCE(a.total_present_days, 0) AS total_present_days,
                COALESCE(t.total_tasks, 0) AS total_tasks,
                COALESCE(t.pending, 0) AS pending,
                COALESCE(t.partially_pending, 0) AS partially_pending,
                COALESCE(t.completed, 0) AS completed
            FROM
                attendance_data a
            RIGHT JOIN
                task_data t
                ON a.department = t.department
            WHERE
                a.department IS NULL
        )
        SELECT
            department,
            total_employees,
            total_present_days,
            total_tasks,
            pending,
            partially_pending,
            completed,
            
            -- Completion Rate: Completed tasks / Total tasks (percentage)
            CASE
                WHEN total_tasks > 0 
                THEN ROUND((completed * 100.0 / total_tasks), 2)
                ELSE 0
            END AS completion_rate,
            
            -- Efficiency Rate: Tasks per employee day (productivity measure)
            -- Formula: (Tasks / Employee Days) * 100, capped at 100%%
            -- This shows how many tasks are handled per employee work day
            CASE
                WHEN total_present_days > 0
                THEN LEAST(ROUND((total_tasks * 100.0 / total_present_days), 2), 100)
                ELSE 0
            END AS efficiency_rate,
            
            ROW_NUMBER() OVER (
                ORDER BY 
                CASE
                    WHEN total_tasks > 0 
                    THEN ROUND((completed * 100.0 / total_tasks), 2)
                    ELSE 0
                END DESC,
                total_tasks DESC,
                department ASC
            ) as rank
        FROM
            combined_data
        WHERE
            department NOT IN %(skip_departments)s
            AND department IS NOT NULL
            AND department != ''
        ORDER BY
            completion_rate DESC,
            total_tasks DESC,
            department ASC
    """.format(attendance_where=attendance_where, task_where=task_where)
    
    try:
        result = frappe.db.sql(query, values, as_dict=True)
        
        # Calculate overall statistics
        if result:
            total_tasks = sum(item.get('total_tasks', 0) for item in result)
            total_completed = sum(item.get('completed', 0) for item in result)
            total_employees = sum(item.get('total_employees', 0) for item in result)
            total_present_days = sum(item.get('total_present_days', 0) for item in result)
            
            # Add summary row
            summary = {
                'department': 'TOTAL',
                'total_employees': total_employees,
                'total_present_days': total_present_days,
                'total_tasks': total_tasks,
                'pending': sum(item.get('pending', 0) for item in result),
                'partially_pending': sum(item.get('partially_pending', 0) for item in result),
                'completed': total_completed,
                'completion_rate': round((total_completed * 100.0 / total_tasks) if total_tasks > 0 else 0, 2),
                'efficiency_rate': round((total_tasks * 100.0 / total_present_days) if total_present_days > 0 else 0, 2),
                'rank': None,
                'is_total': True
            }
            result.append(summary)
        
        return result
        
    except Exception as e:
        frappe.log_error(f"Error in get_department_performance_report: {str(e)}")
        frappe.throw(f"Error fetching department performance data: {str(e)}")

@frappe.whitelist()
def get_employee_task_performance_with_dept(from_date=None, to_date=None):
    """
    Returns individual employee task performance with department info
    Includes both completion rate and efficiency rate
    """
    
    conditions = []
    values = {
        'skip_departments': SKIP_DEPARTMENTS,
        'admin_dept': ADMIN_DEPT,
        'admin_allowed_employees': ADMIN_ALLOWED_EMPLOYEES
    }

    if from_date:
        conditions.append("DATE(wu.from_time) >= %(from_date)s")
        values["from_date"] = from_date

    if to_date:
        conditions.append("DATE(wu.to_time) <= %(to_date)s")
        values["to_date"] = to_date

    # Add department skip condition
    conditions.append("e.department NOT IN %(skip_departments)s")
    
    # Add Admin department filter
    conditions.append("(e.department != %(admin_dept)s OR ta.employee IN %(admin_allowed_employees)s)")

    condition_str = ""
    if conditions:
        condition_str = " AND " + " AND ".join(conditions)

    # Query with two rate calculations for employees
    query = """
        WITH employee_attendance AS (
            SELECT
                employee,
                COUNT(DISTINCT DATE(time)) AS present_days
            FROM
                `tabEmployee Checkin`
            WHERE
                employee IS NOT NULL
                {date_condition}
            GROUP BY
                employee
        ),
        employee_tasks AS (
            SELECT
                ta.employee,
                e.employee_name,
                e.department,
                e.designation,
                COUNT(wu.name) AS total_tasks,
                COUNT(CASE
                    WHEN wu.status = 'Pending' THEN wu.name
                END) AS pending,
                COUNT(CASE
                    WHEN wu.status = 'Partially pending' THEN wu.name
                END) AS partially_pending,
                COUNT(CASE
                    WHEN wu.status = 'Completed' THEN wu.name
                END) AS completed
            FROM
                `tabTask Allocation` ta
            LEFT JOIN
                `tabEmployee` e ON ta.employee = e.name
            LEFT JOIN
                `tabWork Update` wu
                ON wu.parent = ta.name
                AND wu.parenttype = 'Task Allocation'
            WHERE
                ta.employee IS NOT NULL
                AND e.department IS NOT NULL
                AND wu.name IS NOT NULL
                {condition_str}
            GROUP BY
                ta.employee
        )
        SELECT
            et.employee,
            et.employee_name,
            et.department,
            et.designation,
            et.total_tasks,
            et.pending,
            et.partially_pending,
            et.completed,
            COALESCE(ea.present_days, 0) AS present_days,
            
            -- Completion Rate
            CASE
                WHEN et.total_tasks > 0 
                THEN ROUND((et.completed * 100.0 / et.total_tasks), 2)
                ELSE 0
            END AS completion_rate,
            
            -- Efficiency Rate (Tasks per day)
            CASE
                WHEN COALESCE(ea.present_days, 0) > 0
                THEN LEAST(ROUND((et.total_tasks * 100.0 / ea.present_days), 2), 100)
                ELSE 0
            END AS efficiency_rate,
            
            ROW_NUMBER() OVER (
                ORDER BY 
                CASE
                    WHEN et.total_tasks > 0 
                    THEN ROUND((et.completed * 100.0 / et.total_tasks), 2)
                    ELSE 0
                END DESC,
                et.total_tasks DESC,
                et.employee_name ASC
            ) as rank
        FROM
            employee_tasks et
        LEFT JOIN
            employee_attendance ea
            ON et.employee = ea.employee
        WHERE
            et.department NOT IN %(skip_departments)s
            AND (et.department != %(admin_dept)s OR et.employee IN %(admin_allowed_employees)s)
        ORDER BY
            completion_rate DESC,
            et.total_tasks DESC,
            et.employee_name ASC
    """
    
    # Build date condition for attendance
    date_condition = ""
    if from_date and to_date:
        date_condition = f" AND DATE(time) BETWEEN '{from_date}' AND '{to_date}'"
    elif from_date:
        date_condition = f" AND DATE(time) >= '{from_date}'"
    elif to_date:
        date_condition = f" AND DATE(time) <= '{to_date}'"
    
    query = query.format(condition_str=condition_str, date_condition=date_condition)
    
    try:
        return frappe.db.sql(query, values, as_dict=True)
    except Exception as e:
        frappe.log_error(f"Error in get_employee_task_performance_with_dept: {str(e)}")
        frappe.throw(f"Error fetching employee performance data: {str(e)}")

@frappe.whitelist()
def get_departments_with_no_task_employees(from_date=None, to_date=None):
    """
    Returns departments with count of employees who had NO tasks in the given period
    Includes efficiency metrics
    """
    
    if not from_date:
        from_date = frappe.utils.today()
    if not to_date:
        to_date = frappe.utils.today()
    
    values = {
        'from_date': from_date,
        'to_date': to_date,
        'skip_departments': SKIP_DEPARTMENTS,
        'admin_dept': ADMIN_DEPT,
        'admin_allowed_employees': ADMIN_ALLOWED_EMPLOYEES
    }
    
    query = """
        WITH present_employees AS (
            SELECT DISTINCT
                ec.custom_department AS department,
                ec.employee,
                COUNT(DISTINCT DATE(ec.time)) AS present_days
            FROM
                `tabEmployee Checkin` ec
            WHERE
                DATE(ec.time) BETWEEN %(from_date)s AND %(to_date)s
                AND ec.custom_department IS NOT NULL
                AND ec.custom_department != ''
                AND ec.custom_department NOT IN %(skip_departments)s
                AND (ec.custom_department != %(admin_dept)s OR ec.employee IN %(admin_allowed_employees)s)
            GROUP BY
                ec.custom_department, ec.employee
        ),
        employees_with_tasks AS (
            SELECT DISTINCT
                ta.department,
                ta.employee
            FROM
                `tabTask Allocation` ta
            INNER JOIN
                `tabWork Update` wu
                ON wu.parent = ta.name
                AND wu.parenttype = 'Task Allocation'
            WHERE
                (
                    DATE(wu.from_time) BETWEEN %(from_date)s AND %(to_date)s
                    OR DATE(wu.to_time) BETWEEN %(from_date)s AND %(to_date)s
                )
                AND ta.department IS NOT NULL
                AND ta.department != ''
                AND ta.department NOT IN %(skip_departments)s
                AND (ta.department != %(admin_dept)s OR ta.employee IN %(admin_allowed_employees)s)
        ),
        department_summary AS (
            SELECT
                pe.department,
                COUNT(DISTINCT pe.employee) AS total_present_employees,
                SUM(pe.present_days) AS total_present_days,
                COUNT(DISTINCT CASE 
                    WHEN ewt.employee IS NULL THEN pe.employee 
                END) AS employees_without_tasks
            FROM
                present_employees pe
            LEFT JOIN
                employees_with_tasks ewt
                ON pe.department = ewt.department
                AND pe.employee = ewt.employee
            GROUP BY
                pe.department
        )
        SELECT
            ds.department,
            ds.total_present_employees,
            ds.total_present_days,
            ds.employees_without_tasks,
            ROUND(
                (ds.employees_without_tasks * 100.0 / 
                NULLIF(ds.total_present_employees, 0)), 
                2
            ) AS percentage_without_tasks,
            -- Idle Rate: Percentage of idle employees
            ROUND(
                (ds.employees_without_tasks * 100.0 / 
                NULLIF(ds.total_present_employees, 0)), 
                2
            ) AS idle_rate
        FROM
            department_summary ds
        WHERE
            ds.employees_without_tasks > 0
        ORDER BY
            percentage_without_tasks DESC,
            employees_without_tasks DESC,
            ds.department ASC
    """
    
    try:
        return frappe.db.sql(query, values, as_dict=True)
    except Exception as e:
        frappe.log_error(f"Error in get_departments_with_no_task_employees: {str(e)}")
        frappe.throw(f"Error fetching idle departments data: {str(e)}")

@frappe.whitelist()
def get_employees_with_no_tasks(from_date=None, to_date=None):
    """
    Returns individual employees who had NO tasks in the given period
    """
    
    if not from_date:
        from_date = frappe.utils.today()
    if not to_date:
        to_date = frappe.utils.today()
    
    values = {
        'from_date': from_date,
        'to_date': to_date,
        'skip_departments': SKIP_DEPARTMENTS,
        'admin_dept': ADMIN_DEPT,
        'admin_allowed_employees': ADMIN_ALLOWED_EMPLOYEES
    }
    
    query = """
        WITH present_employees AS (
            SELECT DISTINCT
                ec.custom_department AS department,
                ec.employee,
                e.employee_name,
                e.designation,
                COUNT(DISTINCT DATE(ec.time)) AS present_days
            FROM
                `tabEmployee Checkin` ec
            LEFT JOIN
                `tabEmployee` e ON ec.employee = e.name
            WHERE
                DATE(ec.time) BETWEEN %(from_date)s AND %(to_date)s
                AND ec.custom_department IS NOT NULL
                AND ec.custom_department != ''
                AND ec.custom_department NOT IN %(skip_departments)s
                AND (ec.custom_department != %(admin_dept)s OR ec.employee IN %(admin_allowed_employees)s)
            GROUP BY
                ec.custom_department, ec.employee
        ),
        employees_with_tasks AS (
            SELECT DISTINCT
                ta.employee
            FROM
                `tabTask Allocation` ta
            INNER JOIN
                `tabWork Update` wu
                ON wu.parent = ta.name
                AND wu.parenttype = 'Task Allocation'
            WHERE
                (
                    DATE(wu.from_time) BETWEEN %(from_date)s AND %(to_date)s
                    OR DATE(wu.to_time) BETWEEN %(from_date)s AND %(to_date)s
                )
                AND ta.employee IS NOT NULL
        )
        SELECT
            pe.department,
            pe.employee,
            pe.employee_name,
            pe.designation,
            pe.present_days,
            0 AS task_count,
            0.00 AS completion_rate,
            0.00 AS efficiency_rate,
            'No Tasks Assigned' AS status,
            ROW_NUMBER() OVER (
                ORDER BY 
                pe.present_days DESC,
                pe.employee_name ASC
            ) as rank
        FROM
            present_employees pe
        LEFT JOIN
            employees_with_tasks ewt
            ON pe.employee = ewt.employee
        WHERE
            ewt.employee IS NULL
        ORDER BY
            pe.department ASC,
            pe.present_days DESC,
            pe.employee_name ASC
    """
    
    try:
        return frappe.db.sql(query, values, as_dict=True)
    except Exception as e:
        frappe.log_error(f"Error in get_employees_with_no_tasks: {str(e)}")
        frappe.throw(f"Error fetching idle employees data: {str(e)}")

@frappe.whitelist()
def get_dashboard_stats(from_date=None, to_date=None):
    """
    Returns summary statistics for the dashboard header
    """
    
    if not from_date:
        from_date = frappe.utils.today()
    if not to_date:
        to_date = frappe.utils.today()
    
    values = {
        'from_date': from_date,
        'to_date': to_date,
        'skip_departments': SKIP_DEPARTMENTS,
        'admin_dept': ADMIN_DEPT,
        'admin_allowed_employees': ADMIN_ALLOWED_EMPLOYEES
    }
    
    # Simpler query for dashboard stats
    stats_query = """
        WITH task_stats AS (
            SELECT
                COUNT(wu.name) as total_tasks,
                COUNT(CASE WHEN wu.status = 'Completed' THEN wu.name END) as completed_tasks,
                COUNT(CASE WHEN wu.status = 'Pending' THEN wu.name END) as pending_tasks,
                COUNT(CASE WHEN wu.status = 'Partially pending' THEN wu.name END) as partially_pending_tasks
            FROM
                `tabWork Update` wu
            INNER JOIN
                `tabTask Allocation` ta ON wu.parent = ta.name
            WHERE
                DATE(wu.from_time) BETWEEN %(from_date)s AND %(to_date)s
                AND ta.department NOT IN %(skip_departments)s
                AND (ta.department != %(admin_dept)s OR ta.employee IN %(admin_allowed_employees)s)
        ),
        employee_stats AS (
            SELECT
                COUNT(DISTINCT employee) as total_employees,
                COUNT(DISTINCT DATE(time)) as total_days
            FROM
                `tabEmployee Checkin`
            WHERE
                DATE(time) BETWEEN %(from_date)s AND %(to_date)s
                AND custom_department NOT IN %(skip_departments)s
                AND (custom_department != %(admin_dept)s OR employee IN %(admin_allowed_employees)s)
        ),
        attendance_stats AS (
            SELECT
                custom_department,
                employee,
                COUNT(DISTINCT DATE(time)) as present_days
            FROM
                `tabEmployee Checkin`
            WHERE
                DATE(time) BETWEEN %(from_date)s AND %(to_date)s
                AND custom_department NOT IN %(skip_departments)s
                AND (custom_department != %(admin_dept)s OR employee IN %(admin_allowed_employees)s)
            GROUP BY
                custom_department, employee
        )
        SELECT
            es.total_employees,
            es.total_days,
            ts.total_tasks,
            ts.pending_tasks + ts.partially_pending_tasks as total_pending,
            ts.completed_tasks as total_completed,
            ROUND(
                CASE 
                    WHEN ts.total_tasks > 0 
                    THEN (ts.completed_tasks * 100.0 / ts.total_tasks)
                    ELSE 0 
                END, 2
            ) as completion_rate,
            ROUND(
                CASE 
                    WHEN es.total_days > 0 
                    THEN LEAST((ts.total_tasks * 100.0 / es.total_days), 100)
                    ELSE 0 
                END, 2
            ) as efficiency_rate
        FROM
            task_stats ts, employee_stats es
    """
    
    try:
        result = frappe.db.sql(stats_query, values, as_dict=True)
        
        if result:
            return result[0]
        else:
            return {
                'total_employees': 0,
                'total_tasks': 0,
                'total_pending': 0,
                'total_completed': 0,
                'completion_rate': 0,
                'efficiency_rate': 0
            }
    except Exception as e:
        frappe.log_error(f"Error in get_dashboard_stats: {str(e)}")
        return {
            'total_employees': 0,
            'total_tasks': 0,
            'total_pending': 0,
            'total_completed': 0,
            'completion_rate': 0,
            'efficiency_rate': 0
        }

@frappe.whitelist()
def get_performance_trend(from_date=None, to_date=None, interval='daily'):
    """
    Returns performance trend data for charts
    interval: 'daily', 'weekly', 'monthly'
    """
    
    if not from_date:
        from_date = frappe.utils.today()
    if not to_date:
        to_date = frappe.utils.today()
    
    values = {
        'from_date': from_date,
        'to_date': to_date,
        'skip_departments': SKIP_DEPARTMENTS,
        'admin_dept': ADMIN_DEPT,
        'admin_allowed_employees': ADMIN_ALLOWED_EMPLOYEES
    }
    
    # Determine date grouping based on interval
    if interval == 'daily':
        date_format = "DATE(wu.from_time)"
        group_by = "DATE(wu.from_time)"
    elif interval == 'weekly':
        date_format = "DATE_FORMAT(wu.from_time, '%%Y-%%u')"
        group_by = "YEAR(wu.from_time), WEEK(wu.from_time)"
    else:  # monthly
        date_format = "DATE_FORMAT(wu.from_time, '%%Y-%%m')"
        group_by = "YEAR(wu.from_time), MONTH(wu.from_time)"
    
    query = f"""
        SELECT
            {date_format} as period,
            COUNT(wu.name) as total_tasks,
            COUNT(CASE WHEN wu.status = 'Completed' THEN wu.name END) as completed_tasks,
            COUNT(CASE WHEN wu.status = 'Pending' THEN wu.name END) as pending_tasks,
            COUNT(CASE WHEN wu.status = 'Partially pending' THEN wu.name END) as partially_pending_tasks,
            ROUND(
                CASE 
                    WHEN COUNT(wu.name) > 0 
                    THEN (COUNT(CASE WHEN wu.status = 'Completed' THEN wu.name END) * 100.0 / COUNT(wu.name))
                    ELSE 0 
                END, 2
            ) as completion_rate
        FROM
            `tabWork Update` wu
        INNER JOIN
            `tabTask Allocation` ta ON wu.parent = ta.name
        WHERE
            DATE(wu.from_time) BETWEEN %(from_date)s AND %(to_date)s
            AND ta.department NOT IN %(skip_departments)s
            AND (ta.department != %(admin_dept)s OR ta.employee IN %(admin_allowed_employees)s)
        GROUP BY
            {group_by}
        ORDER BY
            period ASC
    """
    
    try:
        return frappe.db.sql(query, values, as_dict=True)
    except Exception as e:
        frappe.log_error(f"Error in get_performance_trend: {str(e)}")
        return []

# Simple export function
@frappe.whitelist()
def export_department_data(from_date=None, to_date=None):
    """Export department data to CSV"""
    data = get_department_performance_report(from_date, to_date)
    # Remove the TOTAL row for export
    export_data = [item for item in data if not item.get('is_total')]
    return export_data

@frappe.whitelist()
def export_employee_data(from_date=None, to_date=None):
    """Export employee data to CSV"""
    return get_employee_task_performance_with_dept(from_date, to_date)

@frappe.whitelist()
def export_idle_dept_data(from_date=None, to_date=None):
    """Export idle department data to CSV"""
    return get_departments_with_no_task_employees(from_date, to_date)

@frappe.whitelist()
def export_idle_emp_data(from_date=None, to_date=None):
    """Export idle employee data to CSV"""
    return get_employees_with_no_tasks(from_date, to_date)





























# import frappe

# # Departments to skip
# SKIP_DEPARTMENTS = ["MD - WTT", "House keeping - WTT"]

# # Admin department filter - only these employees
# ADMIN_DEPT = "Admin - WTT"
# ADMIN_ALLOWED_EMPLOYEES = ["WTT1599", "WTT1211"]

# @frappe.whitelist()
# def get_department_performance_report(from_date=None, to_date=None):
#     """
#     Returns department performance sorted by completion rate (highest first)
#     """
    
#     values = {
#         'skip_departments': SKIP_DEPARTMENTS,
#         'admin_dept': ADMIN_DEPT,
#         'admin_allowed_employees': ADMIN_ALLOWED_EMPLOYEES
#     }
#     conditions = []
#     task_conditions = []
    
#     # Build conditions for attendance
#     if from_date:
#         conditions.append("DATE(time) >= %(from_date)s")
#         task_conditions.append("DATE(wu.from_time) >= %(from_date)s")
#         values["from_date"] = from_date
    
#     if to_date:
#         conditions.append("DATE(time) <= %(to_date)s")
#         task_conditions.append("DATE(wu.to_time) <= %(to_date)s")
#         values["to_date"] = to_date
    
#     # Add department skip conditions
#     conditions.append("custom_department NOT IN %(skip_departments)s")
#     task_conditions.append("ta.department NOT IN %(skip_departments)s")
    
#     # Add Admin department filter
#     conditions.append("(custom_department != %(admin_dept)s OR employee IN %(admin_allowed_employees)s)")
#     task_conditions.append("(ta.department != %(admin_dept)s OR ta.employee IN %(admin_allowed_employees)s)")
    
#     # Build WHERE clauses
#     attendance_where = ""
#     if conditions:
#         conditions.append("custom_department IS NOT NULL AND custom_department != ''")
#         attendance_where = " WHERE " + " AND ".join(conditions)
    
#     task_where = ""
#     if task_conditions:
#         task_where = " AND " + " AND ".join(task_conditions)
    
#     # Main query - sorted by completion rate DESC
#     # NOW COUNTING wu.name (child table records) instead of ta.name
#     query = f"""
#         WITH attendance_data AS (
#             SELECT
#                 custom_department AS department,
#                 COUNT(DISTINCT employee) AS total_employees,
#                 SUM(employee_present_days) AS total_present_days
#             FROM (
#                 SELECT
#                     custom_department,
#                     employee,
#                     COUNT(DISTINCT DATE(time)) AS employee_present_days
#                 FROM
#                     `tabEmployee Checkin`
#                 {attendance_where}
#                 GROUP BY
#                     custom_department, employee
#             ) AS emp_attendance
#             GROUP BY
#                 custom_department
#         ),
#         task_data AS (
#             SELECT
#                 ta.department,
#                 COUNT(wu.name) AS total_tasks,
#                 COUNT(CASE
#                     WHEN wu.status = 'Pending' THEN wu.name
#                 END) AS pending,
#                 COUNT(CASE
#                     WHEN wu.status = 'Partially pending' THEN wu.name
#                 END) AS partially_pending,
#                 COUNT(CASE
#                     WHEN wu.status = 'Completed' THEN wu.name
#                 END) AS completed,
#                 CASE
#                     WHEN COUNT(wu.name) > 0 
#                     THEN ROUND((COUNT(CASE WHEN wu.status = 'Completed' THEN wu.name END) * 100.0 / COUNT(wu.name)), 2)
#                     ELSE 0
#                 END AS completion_rate
#             FROM
#                 `tabTask Allocation` ta
#             LEFT JOIN
#                 `tabWork Update` wu
#                 ON wu.parent = ta.name
#                 AND wu.parenttype = 'Task Allocation'
#             WHERE
#                 ta.department IS NOT NULL
#                 AND ta.department != ''
#                 AND wu.name IS NOT NULL
#                 {task_where}
#             GROUP BY
#                 ta.department
#         ),
#         combined_data AS (
#             SELECT
#                 COALESCE(a.department, t.department) AS department,
#                 COALESCE(a.total_employees, 0) AS total_employees,
#                 COALESCE(a.total_present_days, 0) AS total_present_days,
#                 COALESCE(t.total_tasks, 0) AS total_tasks,
#                 COALESCE(t.pending, 0) AS pending,
#                 COALESCE(t.partially_pending, 0) AS partially_pending,
#                 COALESCE(t.completed, 0) AS completed,
#                 COALESCE(t.completion_rate, 0) AS completion_rate
#             FROM
#                 attendance_data a
#             LEFT JOIN
#                 task_data t
#                 ON a.department = t.department
            
#             UNION
            
#             SELECT
#                 COALESCE(a.department, t.department) AS department,
#                 COALESCE(a.total_employees, 0) AS total_employees,
#                 COALESCE(a.total_present_days, 0) AS total_present_days,
#                 COALESCE(t.total_tasks, 0) AS total_tasks,
#                 COALESCE(t.pending, 0) AS pending,
#                 COALESCE(t.partially_pending, 0) AS partially_pending,
#                 COALESCE(t.completed, 0) AS completed,
#                 COALESCE(t.completion_rate, 0) AS completion_rate
#             FROM
#                 attendance_data a
#             RIGHT JOIN
#                 task_data t
#                 ON a.department = t.department
#             WHERE
#                 a.department IS NULL
#         )
#         SELECT
#             *,
#             ROW_NUMBER() OVER (ORDER BY completion_rate DESC, total_tasks DESC, department ASC) as rank
#         FROM
#             combined_data
#         WHERE
#             department NOT IN %(skip_departments)s
#         ORDER BY
#             completion_rate DESC,
#             total_tasks DESC,
#             department ASC
#     """
    
#     return frappe.db.sql(query, values, as_dict=True)



# @frappe.whitelist()
# def get_employee_task_performance_with_dept(from_date=None, to_date=None):
#     """
#     Returns individual employee task performance sorted by completion rate (highest first)
#     """
    
#     conditions = []
#     values = {
#         'skip_departments': SKIP_DEPARTMENTS,
#         'admin_dept': ADMIN_DEPT,
#         'admin_allowed_employees': ADMIN_ALLOWED_EMPLOYEES
#     }

#     if from_date:
#         conditions.append("DATE(wu.from_time) >= %(from_date)s")
#         values["from_date"] = from_date

#     if to_date:
#         conditions.append("DATE(wu.to_time) <= %(to_date)s")
#         values["to_date"] = to_date

#     # Add department skip condition
#     conditions.append("e.department NOT IN %(skip_departments)s")
    
#     # Add Admin department filter
#     conditions.append("(e.department != %(admin_dept)s OR ta.employee IN %(admin_allowed_employees)s)")

#     condition_str = ""
#     if conditions:
#         condition_str = " AND " + " AND ".join(conditions)

#     # NOW COUNTING wu.name (child table records) instead of ta.name
#     query = f"""
#         SELECT
#             ta.employee,
#             e.employee_name,
#             e.department,
#             e.designation,
#             COUNT(wu.name) AS total_tasks,
#             COUNT(CASE
#                 WHEN wu.status = 'Pending' THEN wu.name
#             END) AS pending,
#             COUNT(CASE
#                 WHEN wu.status = 'Partially pending' THEN wu.name
#             END) AS partially_pending,
#             COUNT(CASE
#                 WHEN wu.status = 'Completed' THEN wu.name
#             END) AS completed,
#             CASE
#                 WHEN COUNT(wu.name) > 0 
#                 THEN ROUND((COUNT(CASE WHEN wu.status = 'Completed' THEN wu.name END) * 100.0 / COUNT(wu.name)), 2)
#                 ELSE 0
#             END AS completion_rate,
#             ROW_NUMBER() OVER (ORDER BY 
#                 CASE
#                     WHEN COUNT(wu.name) > 0 
#                     THEN ROUND((COUNT(CASE WHEN wu.status = 'Completed' THEN wu.name END) * 100.0 / COUNT(wu.name)), 2)
#                     ELSE 0
#                 END DESC,
#                 COUNT(wu.name) DESC,
#                 e.employee_name ASC
#             ) as rank
#         FROM
#             `tabTask Allocation` ta
#         LEFT JOIN
#             `tabEmployee` e ON ta.employee = e.name
#         LEFT JOIN
#             `tabWork Update` wu
#             ON wu.parent = ta.name
#             AND wu.parenttype = 'Task Allocation'
#         WHERE
#             ta.employee IS NOT NULL
#             AND e.department IS NOT NULL
#             AND wu.name IS NOT NULL
#             {condition_str}
#         GROUP BY
#             ta.employee
#         ORDER BY
#             completion_rate DESC,
#             total_tasks DESC,
#             e.employee_name ASC
#     """

#     return frappe.db.sql(query, values, as_dict=True)



# @frappe.whitelist()
# def get_departments_with_no_task_employees(from_date=None, to_date=None):
#     """
#     Returns departments with count of employees who had NO tasks in the given period
#     """
    
#     if not from_date:
#         from_date = frappe.utils.today()
#     if not to_date:
#         to_date = frappe.utils.today()
    
#     values = {
#         'from_date': from_date,
#         'to_date': to_date,
#         'skip_departments': SKIP_DEPARTMENTS,
#         'admin_dept': ADMIN_DEPT,
#         'admin_allowed_employees': ADMIN_ALLOWED_EMPLOYEES
#     }
    
#     query = """
#         WITH present_employees AS (
#             SELECT DISTINCT
#                 ec.custom_department AS department,
#                 ec.employee
#             FROM
#                 `tabEmployee Checkin` ec
#             WHERE
#                 DATE(ec.time) BETWEEN %(from_date)s AND %(to_date)s
#                 AND ec.custom_department IS NOT NULL
#                 AND ec.custom_department != ''
#                 AND ec.custom_department NOT IN %(skip_departments)s
#                 AND (ec.custom_department != %(admin_dept)s OR ec.employee IN %(admin_allowed_employees)s)
#         ),
#         employees_with_tasks AS (
#             SELECT DISTINCT
#                 ta.department,
#                 ta.employee
#             FROM
#                 `tabTask Allocation` ta
#             INNER JOIN
#                 `tabWork Update` wu
#                 ON wu.parent = ta.name
#                 AND wu.parenttype = 'Task Allocation'
#             WHERE
#                 (
#                     DATE(wu.from_time) BETWEEN %(from_date)s AND %(to_date)s
#                     OR DATE(wu.to_time) BETWEEN %(from_date)s AND %(to_date)s
#                 )
#                 AND ta.department IS NOT NULL
#                 AND ta.department != ''
#                 AND ta.department NOT IN %(skip_departments)s
#                 AND (ta.department != %(admin_dept)s OR ta.employee IN %(admin_allowed_employees)s)
#         )
#         SELECT
#             pe.department,
#             COUNT(DISTINCT pe.employee) AS total_present_employees,
#             COUNT(DISTINCT CASE 
#                 WHEN ewt.employee IS NULL THEN pe.employee 
#             END) AS employees_without_tasks,
#             ROUND(
#                 (COUNT(DISTINCT CASE WHEN ewt.employee IS NULL THEN pe.employee END) * 100.0 / 
#                 NULLIF(COUNT(DISTINCT pe.employee), 0)), 
#                 2
#             ) AS percentage_without_tasks
#         FROM
#             present_employees pe
#         LEFT JOIN
#             employees_with_tasks ewt
#             ON pe.department = ewt.department
#             AND pe.employee = ewt.employee
#         GROUP BY
#             pe.department
#         HAVING
#             COUNT(DISTINCT CASE WHEN ewt.employee IS NULL THEN pe.employee END) > 0
#         ORDER BY
#             employees_without_tasks DESC,
#             percentage_without_tasks DESC
#     """
    
#     return frappe.db.sql(query, values, as_dict=True)


# @frappe.whitelist()
# def get_employees_with_no_tasks(from_date=None, to_date=None):
#     """
#     Returns individual employees who had NO tasks in the given period
#     """
    
#     if not from_date:
#         from_date = frappe.utils.today()
#     if not to_date:
#         to_date = frappe.utils.today()
    
#     values = {
#         'from_date': from_date,
#         'to_date': to_date,
#         'skip_departments': SKIP_DEPARTMENTS,
#         'admin_dept': ADMIN_DEPT,
#         'admin_allowed_employees': ADMIN_ALLOWED_EMPLOYEES
#     }
    
#     query = """
#         WITH present_employees AS (
#             SELECT DISTINCT
#                 ec.custom_department AS department,
#                 ec.employee,
#                 e.employee_name,
#                 e.designation,
#                 COUNT(DISTINCT DATE(ec.time)) AS present_days
#             FROM
#                 `tabEmployee Checkin` ec
#             LEFT JOIN
#                 `tabEmployee` e ON ec.employee = e.name
#             WHERE
#                 DATE(ec.time) BETWEEN %(from_date)s AND %(to_date)s
#                 AND ec.custom_department IS NOT NULL
#                 AND ec.custom_department != ''
#                 AND ec.custom_department NOT IN %(skip_departments)s
#                 AND (ec.custom_department != %(admin_dept)s OR ec.employee IN %(admin_allowed_employees)s)
#             GROUP BY
#                 ec.custom_department, ec.employee
#         ),
#         employees_with_tasks AS (
#             SELECT DISTINCT
#                 ta.employee
#             FROM
#                 `tabTask Allocation` ta
#             INNER JOIN
#                 `tabWork Update` wu
#                 ON wu.parent = ta.name
#                 AND wu.parenttype = 'Task Allocation'
#             WHERE
#                 (
#                     DATE(wu.from_time) BETWEEN %(from_date)s AND %(to_date)s
#                     OR DATE(wu.to_time) BETWEEN %(from_date)s AND %(to_date)s
#                 )
#                 AND ta.employee IS NOT NULL
#         )
#         SELECT
#             pe.department,
#             pe.employee,
#             pe.employee_name,
#             pe.designation,
#             pe.present_days,
#             0 AS task_count,
#             0.00 AS completion_rate,
#             'No Tasks Assigned' AS status
#         FROM
#             present_employees pe
#         LEFT JOIN
#             employees_with_tasks ewt
#             ON pe.employee = ewt.employee
#         WHERE
#             ewt.employee IS NULL
#         ORDER BY
#             pe.department ASC,
#             pe.present_days DESC,
#             pe.employee_name ASC
#     """
    
#     return frappe.db.sql(query, values, as_dict=True)

