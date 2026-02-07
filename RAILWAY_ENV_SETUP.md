# Railway Environment Variables Setup Guide

## Critical: Add These Environment Variables to Railway Backend

Your backend is failing because **Twilio credentials are missing** in Railway.   

### Step 1: Access Railway Dashboard
1. Go to https://railway.app
2. Select your backend service: `backend-production-8d38`
3. Click **Variables** tab

### Step 2: Get Credentials from Local .env File
Open `backend/.env` on your computer and copy the Twilio values.

### Step 3: Add These Variables in Railway

Click **"+ New Variable"** for each:

| Variable Name | Where to Get Value |
|--------------|-------------------|
| `TWILIO_ACCOUNT_SID` | From your backend/.env file |
| `TWILIO_AUTH_TOKEN` | From your backend/.env file |
| `TWILIO_PHONE_NUMBER` | From your backend/.env file |
| `DJANGO_SETTINGS_MODULE` | Set to: `config.settings.prod` |
| `SECRET_KEY` | Generate new strong random key |
| `DATABASE_URL` | Railway auto-adds when you link Postgres |

**For SECRET_KEY**, generate a new Django secret key:
```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Step 4: Deploy
After adding all variables:
1. Click **Deploy** or wait for auto-redeploy
2. Wait 1-2 minutes for deployment  
3. Check logs for errors

### Step 5: Test
1. Hard refresh frontend: `Ctrl + Shift + R`
2. Try signup with phone OTP
3. Should now work!

---

## Troubleshooting

**Still getting errors?**
- Verify all 3 Twilio variables are added correctly
- Check Railway deployment logs
- Make sure phone number includes `+` and country code
- Try clearing browser cache

**Database issues?**  
- Make sure Postgres is linked to your backend service
- DATABASE_URL should be auto-populated
