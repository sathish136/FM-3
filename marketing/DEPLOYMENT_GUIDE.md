# WTT Dashboard Deployment Guide

## Environment Variables Setup

### 1. Create .env file
Create a `.env` file in your project root with the following content:

```env
ERP_API_KEY=your_actual_api_key_here
ERP_API_SECRET=your_actual_api_secret_here
```

### 2. Replace with your actual credentials
Replace `your_actual_api_key_here` and `your_actual_api_secret_here` with your real ERP credentials.

### 3. Server Deployment Steps

#### For Production Server:

1. **Copy the .env file to your server:**
   ```bash
   scp .env user@your-server:/path/to/your/app/
   ```

2. **Set proper file permissions:**
   ```bash
   chmod 600 .env  # Only owner can read/write
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   pip install python-dotenv
   ```

4. **Test the environment setup:**
   ```bash
   python main.py
   ```
   
   You should see:
   ```
   ✅ Environment variables validated successfully
   ```

5. **Run with a production server:**
   ```bash
   # For main.py (FastAPI)
   uvicorn main:app --host 0.0.0.0 --port 5000

   # For Purchase_app.py (Flask)
   gunicorn --bind 0.0.0.0:3000 Purchase_app:app

   # For stores_app.py (Flask)  
   gunicorn --bind 0.0.0.0:5000 stores_app:app
   ```

### 4. Common Issues & Solutions

#### Issue: "Environment variables missing" error
**Solution:** Ensure .env file exists in the same directory as your Python files and contains valid API credentials.

#### Issue: API calls work locally but fail on server
**Solution:** 
1. Verify .env file is on the server
2. Check file permissions (should be readable by the application user)
3. Ensure firewall allows outbound connections to `https://erp.wttint.com`

#### Issue: Authorization failures
**Solution:**
1. Verify API key and secret are correct
2. Ensure no extra spaces or newline characters in .env file
3. Check that the credentials have proper permissions in your ERP system

### 5. Security Best Practices

1. **Never commit .env file to version control**
2. **Use different credentials for development and production**
3. **Regularly rotate your API keys**
4. **Monitor API usage for unusual activity**

### 6. Testing API Connection

Create a test script `test_api.py`:

```python
import os
from dotenv import load_dotenv
import requests

load_dotenv()

def test_api():
    api_key = os.getenv('ERP_API_KEY')
    api_secret = os.getenv('ERP_API_SECRET')
    
    if not api_key or not api_secret:
        print("❌ Missing environment variables")
        return False
    
    url = "https://erp.wttint.com/api/method/wtt_module.customization.custom.rfq.get_project"
    headers = {"Authorization": f"token {api_key}:{api_secret}"}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            print("✅ API connection successful")
            return True
        else:
            print(f"❌ API returned status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API connection failed: {e}")
        return False

if __name__ == "__main__":
    test_api()
```

Run this test before deploying to ensure your credentials work correctly.

### 7. Environment-Specific Configurations

For different environments (dev/staging/prod), you can use different .env files:

```bash
# Development
cp .env.example .env.dev

# Staging  
cp .env.example .env.staging

# Production
cp .env.example .env.prod
```

Then load the appropriate file:
```python
load_dotenv('.env.prod')  # For production
```

## Quick Start Checklist

- [ ] .env file created with correct API credentials
- [ ] python-dotenv package installed
- [ ] Environment variables validated on startup
- [ ] API connection tested successfully
- [ ] Server running with proper host/port configuration
- [ ] Firewall rules allow ERP API access
- [ ] Monitoring and logging configured

## Support

If you still encounter issues:

1. Check the server logs for specific error messages
2. Verify network connectivity to `erp.wttint.com`
3. Confirm API credentials are valid and not expired
4. Check if the ERP API is accessible from your server's IP address
