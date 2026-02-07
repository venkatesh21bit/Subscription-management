# Complete Railway Environment Setup Guide

## Critical Issue
Your app is failing because **environment variables are missing** in both frontend and backend Railway deployments.

---

## Part 1: Backend Environment Variables

### Go to Backend Service
1. Open https://railway.app
2. Find service: **backend-production-8d38**
3. Click **Variables** tab
4. Add these variables:

| Variable Name | Value | Where to Get It |
|---------------|-------|-----------------|
| `TWILIO_ACCOUNT_SID` | `AC...` | Copy from local `backend/.env` file |
| `TWILIO_AUTH_TOKEN` | Your token | Copy from local `backend/.env` file |
| `TWILIO_PHONE_NUMBER` | `+1...` | Copy from local `backend/.env` file |
| `DJANGO_SETTINGS_MODULE` | `config.settings.prod` | Type exactly as shown |
| `SECRET_KEY` | Generate new | See command below |
| `DATABASE_URL` | Auto-set | Railway adds this when you link Postgres |

**Generate SECRET_KEY:**  
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## Part 2: Frontend Environment Variables ⚠️ CRITICAL

### Go to Frontend Service  
1. Open https://railway.app
2. Find service: **frontend-production-fbef1** 
3. Click **Variables** tab
4. Add this ONE variable:

| Variable Name | Value |
|---------------|-------|
| `NEXT_PUBLIC_API_URL` | `https://backend-production-8d38.up.railway.app/api` |

**Important:** The URL MUST end with `/api` ⚠️

---

## Part 3: Deploy & Test

### After Adding ALL Variables:

1. **Both services will auto-redeploy** (wait 2-3 minutes)

2. **Check Backend Deployment Logs:**
   - Go to backend service → **Deployments** tab
   - Click latest deployment
   - Check logs for errors
   - Should see: "Starting gunicorn..." (success)

3. **Check Frontend Deployment:**
   - Go to frontend service → **Deployments** tab  
   - Should complete without errors

4. **Test Your App:**
   - **Hard refresh** frontend: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - **Clear browser cache** (important!)
   - Try signup flow again
   - Check Network tab - requests should go to:
     ✅ `https://backend-production-8d38.up.railway.app/api/users/send-phone-otp/`
   - NOT:
     ❌ `https://backend-production-8d38.up.railway.app/users/send-phone-otp/`

---

## Verification Checklist

### Backend Variables (6 total):
- [ ] TWILIO_ACCOUNT_SID
- [ ] TWILIO_AUTH_TOKEN  
- [ ] TWILIO_PHONE_NUMBER
- [ ] DJANGO_SETTINGS_MODULE
- [ ] SECRET_KEY
- [ ] DATABASE_URL (auto-added by Railway)

### Frontend Variables (1 total):
- [ ] NEXT_PUBLIC_API_URL

### Testing:
- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] Hard refresh browser
- [ ] Clear browser cache
- [ ] Signup form loads
- [ ] Phone OTP sends successfully
- [ ] No CORS errors in console

---

## Troubleshooting

### Still getting CORS errors?
- Make sure `NEXT_PUBLIC_API_URL` ends with `/api`
- Hard refresh: `Ctrl + Shift + R`
- **Clear all browser cache and cookies**
- Check Network tab: URL should include `/api/`

### OTP not sending?
- Verify all 3 Twilio variables are correct
- Check backend deployment logs for errors
- Make sure phone number has `+` and country code

### Frontend showing wrong URL?
- Frontend environment variable is case-sensitive: `NEXT_PUBLIC_API_URL`
- Must start with `NEXT_PUBLIC_` for Next.js
- Must redeploy after adding variable  
- **Clear browser cache completely**

### Build failures?
- Backend: Check Python dependencies in `requirements.txt`
- Frontend: Check Node.js version (should be 18.x or higher)
- Check Railway build logs for specific error

---

## Quick Command Reference

### Test backend is running:
```bash
curl https://backend-production-8d38.up.railway.app/
```

### Test API endpoint:
```bash
curl https://backend-production-8d38.up.railway.app/api/users/send-phone-otp/ \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"phone": "+911234567890"}'
```

### Generate new Django SECRET_KEY:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## Next Steps After Setup

1. ✅ Add backend environment variables
2. ✅ Add frontend environment variable  
3. ✅ Wait for both services to redeploy (2-3 min)
4. ✅ Hard refresh browser + clear cache
5. ✅ Test complete signup flow
6. ✅ Verify OTP received on phone
7. ✅ Test login with created account
8. ✅ Verify admin access: https://backend-production-8d38.up.railway.app/admin/
   - Username: `admin`
   - Password: `admin*123`
