import os

# Create directories
os.makedirs('static/css', exist_ok=True)
os.makedirs('static/js', exist_ok=True)

# Create index.html
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write('''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WTT International - Dashboard</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="header">
        <button class="menu-toggle" onclick="toggleMenu()">☰</button>
        <div class="logo-section">
            <img src="https://res.cloudinary.com/dd8fsxba6/image/upload/v1755166473/logo-bg_less_yaefzj.png" alt="WTT Logo" class="logo">
            <h1>WTT International Pvt Ltd</h1>
        </div>
    </div>
    <div class="sidebar">
        <nav>
            <a href="index.html">Dashboard</a>
            <a href="sales.html">Sales</a>
            <a href="hr.html">Human Resources</a>
            <a href="finance.html">Finance</a>
            <a href="operations.html">Operations</a>
            <a href="marketing.html">Marketing</a>
        </nav>
    </div>
    <div class="overlay" onclick="closeMenu()"></div>
    <div class="container">
        <h2>Business Analysis Dashboard</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Total Revenue</div>
                <div class="metric-value">$2.5M</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Total Employees</div>
                <div class="metric-value">250</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Active Projects</div>
                <div class="metric-value">68</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Client Satisfaction</div>
                <div class="metric-value">4.5/5</div>
            </div>
        </div>
        <div class="data-table">
            <h3>Department Overview</h3>
            <table>
                <thead>
                    <tr><th>Department</th><th>Key Metric</th><th>Performance</th><th>Status</th></tr>
                </thead>
                <tbody>
                    <tr><td>Sales</td><td>Revenue Growth</td><td>15.5%</td><td>✓ On Track</td></tr>
                    <tr><td>Human Resources</td><td>Employee Satisfaction</td><td>4.2/5</td><td>✓ Good</td></tr>
                    <tr><td>Finance</td><td>Profit Margin</td><td>28.5%</td><td>✓ Excellent</td></tr>
                    <tr><td>Operations</td><td>On-Time Delivery</td><td>88.5%</td><td>✓ Good</td></tr>
                    <tr><td>Marketing</td><td>Campaign ROI</td><td>245.5%</td><td>✓ Excellent</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    <script src="js/main.js"></script>
</body>
</html>''')

# Create sales.html
with open('static/sales.html', 'w', encoding='utf-8') as f:
    f.write('''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sales Department - WTT International</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="header">
        <button class="menu-toggle" onclick="toggleMenu()">☰</button>
        <div class="logo-section">
            <img src="https://res.cloudinary.com/dd8fsxba6/image/upload/v1755166473/logo-bg_less_yaefzj.png" alt="WTT Logo" class="logo">
            <h1>WTT International Pvt Ltd</h1>
        </div>
    </div>
    <div class="sidebar">
        <nav>
            <a href="index.html">Dashboard</a>
            <a href="sales.html">Sales</a>
            <a href="hr.html">Human Resources</a>
            <a href="finance.html">Finance</a>
            <a href="operations.html">Operations</a>
            <a href="marketing.html">Marketing</a>
        </nav>
    </div>
    <div class="overlay" onclick="closeMenu()"></div>
    <div class="container">
        <h2>Sales Department</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Total Revenue</div>
                <div class="metric-value">$2.5M</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Monthly Growth</div>
                <div class="metric-value">15.5%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Active Clients</div>
                <div class="metric-value">145</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Conversion Rate</div>
                <div class="metric-value">32.8%</div>
            </div>
        </div>
        <div class="data-table">
            <h3>Quarterly Performance</h3>
            <table>
                <thead>
                    <tr><th>Quarter</th><th>Revenue</th><th>Clients</th><th>Growth</th></tr>
                </thead>
                <tbody>
                    <tr><td>Q1 2024</td><td>$550,000</td><td>120</td><td>-</td></tr>
                    <tr><td>Q2 2024</td><td>$620,000</td><td>135</td><td>+12.7%</td></tr>
                    <tr><td>Q3 2024</td><td>$680,000</td><td>140</td><td>+9.7%</td></tr>
                    <tr><td>Q4 2024</td><td>$650,000</td><td>145</td><td>-4.4%</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    <script src="js/main.js"></script>
</body>
</html>''')

print("Files created successfully!")

# Create hr.html
with open('static/hr.html', 'w', encoding='utf-8') as f:
    f.write('''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Human Resources - WTT International</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="header">
        <button class="menu-toggle" onclick="toggleMenu()">☰</button>
        <div class="logo-section">
            <img src="https://res.cloudinary.com/dd8fsxba6/image/upload/v1755166473/logo-bg_less_yaefzj.png" alt="WTT Logo" class="logo">
            <h1>WTT International Pvt Ltd</h1>
        </div>
    </div>
    <div class="sidebar">
        <nav>
            <a href="index.html">Dashboard</a>
            <a href="sales.html">Sales</a>
            <a href="hr.html">Human Resources</a>
            <a href="finance.html">Finance</a>
            <a href="operations.html">Operations</a>
            <a href="marketing.html">Marketing</a>
        </nav>
    </div>
    <div class="overlay" onclick="closeMenu()"></div>
    <div class="container">
        <h2>Human Resources Department</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Total Employees</div>
                <div class="metric-value">250</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">New Hires</div>
                <div class="metric-value">18</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Attrition Rate</div>
                <div class="metric-value">8.5%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Satisfaction Score</div>
                <div class="metric-value">4.2/5</div>
            </div>
        </div>
        <div class="data-table">
            <h3>Department Breakdown</h3>
            <table>
                <thead>
                    <tr><th>Department</th><th>Employee Count</th><th>Percentage</th></tr>
                </thead>
                <tbody>
                    <tr><td>Engineering</td><td>85</td><td>34%</td></tr>
                    <tr><td>Sales</td><td>60</td><td>24%</td></tr>
                    <tr><td>Operations</td><td>45</td><td>18%</td></tr>
                    <tr><td>Marketing</td><td>35</td><td>14%</td></tr>
                    <tr><td>HR</td><td>25</td><td>10%</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    <script src="js/main.js"></script>
</body>
</html>''')

# Create finance.html
with open('static/finance.html', 'w', encoding='utf-8') as f:
    f.write('''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Finance Department - WTT International</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="header">
        <button class="menu-toggle" onclick="toggleMenu()">☰</button>
        <div class="logo-section">
            <img src="https://res.cloudinary.com/dd8fsxba6/image/upload/v1755166473/logo-bg_less_yaefzj.png" alt="WTT Logo" class="logo">
            <h1>WTT International Pvt Ltd</h1>
        </div>
    </div>
    <div class="sidebar">
        <nav>
            <a href="index.html">Dashboard</a>
            <a href="sales.html">Sales</a>
            <a href="hr.html">Human Resources</a>
            <a href="finance.html">Finance</a>
            <a href="operations.html">Operations</a>
            <a href="marketing.html">Marketing</a>
        </nav>
    </div>
    <div class="overlay" onclick="closeMenu()"></div>
    <div class="container">
        <h2>Finance Department</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Total Expenses</div>
                <div class="metric-value">$1.8M</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Profit Margin</div>
                <div class="metric-value">28.5%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Operating Costs</div>
                <div class="metric-value">$1.2M</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Net Profit</div>
                <div class="metric-value">$700K</div>
            </div>
        </div>
        <div class="data-table">
            <h3>Expense Breakdown</h3>
            <table>
                <thead>
                    <tr><th>Category</th><th>Amount</th><th>Percentage</th></tr>
                </thead>
                <tbody>
                    <tr><td>Salaries</td><td>$900,000</td><td>50%</td></tr>
                    <tr><td>Operations</td><td>$400,000</td><td>22%</td></tr>
                    <tr><td>Marketing</td><td>$250,000</td><td>14%</td></tr>
                    <tr><td>Infrastructure</td><td>$250,000</td><td>14%</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    <script src="js/main.js"></script>
</body>
</html>''')

# Create operations.html
with open('static/operations.html', 'w', encoding='utf-8') as f:
    f.write('''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Operations Department - WTT International</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="header">
        <button class="menu-toggle" onclick="toggleMenu()">☰</button>
        <div class="logo-section">
            <img src="https://res.cloudinary.com/dd8fsxba6/image/upload/v1755166473/logo-bg_less_yaefzj.png" alt="WTT Logo" class="logo">
            <h1>WTT International Pvt Ltd</h1>
        </div>
    </div>
    <div class="sidebar">
        <nav>
            <a href="index.html">Dashboard</a>
            <a href="sales.html">Sales</a>
            <a href="hr.html">Human Resources</a>
            <a href="finance.html">Finance</a>
            <a href="operations.html">Operations</a>
            <a href="marketing.html">Marketing</a>
        </nav>
    </div>
    <div class="overlay" onclick="closeMenu()"></div>
    <div class="container">
        <h2>Operations Department</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Projects Completed</div>
                <div class="metric-value">42</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">On-Time Delivery</div>
                <div class="metric-value">88.5%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Resource Utilization</div>
                <div class="metric-value">76.3%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Client Satisfaction</div>
                <div class="metric-value">4.5/5</div>
            </div>
        </div>
        <div class="data-table">
            <h3>Project Status</h3>
            <table>
                <thead>
                    <tr><th>Status</th><th>Count</th><th>Percentage</th></tr>
                </thead>
                <tbody>
                    <tr><td>Completed</td><td>42</td><td>62%</td></tr>
                    <tr><td>In Progress</td><td>18</td><td>26%</td></tr>
                    <tr><td>Planning</td><td>8</td><td>12%</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    <script src="js/main.js"></script>
</body>
</html>''')

# Create marketing.html
with open('static/marketing.html', 'w', encoding='utf-8') as f:
    f.write('''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marketing Department - WTT International</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="header">
        <button class="menu-toggle" onclick="toggleMenu()">☰</button>
        <div class="logo-section">
            <img src="https://res.cloudinary.com/dd8fsxba6/image/upload/v1755166473/logo-bg_less_yaefzj.png" alt="WTT Logo" class="logo">
            <h1>WTT International Pvt Ltd</h1>
        </div>
    </div>
    <div class="sidebar">
        <nav>
            <a href="index.html">Dashboard</a>
            <a href="sales.html">Sales</a>
            <a href="hr.html">Human Resources</a>
            <a href="finance.html">Finance</a>
            <a href="operations.html">Operations</a>
            <a href="marketing.html">Marketing</a>
        </nav>
    </div>
    <div class="overlay" onclick="closeMenu()"></div>
    <div class="container">
        <h2>Marketing Department</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Campaign ROI</div>
                <div class="metric-value">245.5%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Leads Generated</div>
                <div class="metric-value">1,250</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Social Reach</div>
                <div class="metric-value">85K</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Engagement Rate</div>
                <div class="metric-value">6.8%</div>
            </div>
        </div>
        <div class="data-table">
            <h3>Channel Performance</h3>
            <table>
                <thead>
                    <tr><th>Channel</th><th>Leads</th><th>Cost</th><th>Cost per Lead</th></tr>
                </thead>
                <tbody>
                    <tr><td>Social Media</td><td>450</td><td>$25,000</td><td>$55.56</td></tr>
                    <tr><td>Email</td><td>380</td><td>$15,000</td><td>$39.47</td></tr>
                    <tr><td>SEO</td><td>280</td><td>$20,000</td><td>$71.43</td></tr>
                    <tr><td>PPC</td><td>140</td><td>$18,000</td><td>$128.57</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    <script src="js/main.js"></script>
</body>
</html>''')

# Create CSS
with open('static/css/style.css', 'w', encoding='utf-8') as f:
    f.write('''* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #f5f5f5;
}

.header {
    background: #fff;
    padding: 15px 30px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    gap: 20px;
}

.logo-section {
    display: flex;
    align-items: center;
    gap: 15px;
}

.logo {
    height: 50px;
}

.header h1 {
    font-size: 24px;
    color: #333;
}

.menu-toggle {
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: #333;
}

.sidebar {
    position: fixed;
    left: -250px;
    top: 0;
    width: 250px;
    height: 100vh;
    background: #2c3e50;
    transition: left 0.3s;
    z-index: 1000;
    padding-top: 80px;
}

.sidebar.active {
    left: 0;
}

.sidebar nav a {
    display: block;
    color: #ecf0f1;
    padding: 15px 25px;
    text-decoration: none;
    transition: background 0.3s;
}

.sidebar nav a:hover, .sidebar nav a.active {
    background: #34495e;
}

.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: none;
    z-index: 999;
}

.overlay.active {
    display: block;
}

.container {
    padding: 30px;
    max-width: 1400px;
    margin: 0 auto;
}

.container h2 {
    font-size: 32px;
    color: #2c3e50;
    margin-bottom: 30px;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.metric-card {
    background: #fff;
    padding: 25px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.metric-label {
    color: #7f8c8d;
    font-size: 14px;
    margin-bottom: 10px;
}

.metric-value {
    font-size: 32px;
    font-weight: bold;
    color: #2c3e50;
}

.data-table {
    background: #fff;
    padding: 25px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    overflow-x: auto;
}

.data-table h3 {
    margin-bottom: 20px;
    color: #2c3e50;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ecf0f1;
}

th {
    background: #34495e;
    color: #fff;
    font-weight: 600;
}

tr:hover {
    background: #f8f9fa;
}''')

# Create JS
with open('static/js/main.js', 'w', encoding='utf-8') as f:
    f.write('''function toggleMenu() {
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

document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.sidebar nav a');
    
    links.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
});''')

print("All files created successfully!")
