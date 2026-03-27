# WTT International Business Analysis Dashboard

## Setup Instructions

1. Install dependencies:
```
pip install -r requirements.txt
```

2. Run the application:
```
python main.py
```

3. Open browser and navigate to:
```
http://localhost:5000/static/index.html
```

The server will display startup messages and run on port 5000.

## Features

- Dashboard with company overview
- Separate pages for each department:
  - Sales
  - Human Resources
  - Finance
  - Operations
  - Marketing
- Collapsible sidebar navigation
- Sample data for all departments
- API endpoints ready for integration

## API Endpoints

- GET /api/sales - Sales department data
- GET /api/hr - HR department data
- GET /api/finance - Finance department data
- GET /api/operations - Operations department data
- GET /api/marketing - Marketing department data
