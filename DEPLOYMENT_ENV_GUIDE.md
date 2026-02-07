# Deployment Environment Variables Guide

## Backend Environment Variables (Railway)

### Essential Django Settings

```bash
# Django Secret Key - Generate a new one for production
SECRET_KEY=your-django-secret-key-here
# Generate using: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Django Settings Module - Use production settings
DJANGO_SETTINGS_MODULE=config.settings.prod

# Debug Mode - MUST be False in production
DEBUG=False
```

### Database Configuration

```bash
# PostgreSQL Database URL (Railway will auto-generate this)
DATABASE_URL=postgresql://user:password@host:port/dbname
```

### Twilio Configuration (REQUIRED for Phone OTP)

**Where to get Twilio credentials:**
1. Sign up at https://www.twilio.com/
2. Go to Console Dashboard
3. Get your Account SID and Auth Token
4. Purchase/configure a phone number with SMS capabilities

```bash
# Twilio Account SID (starts with AC...)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Twilio Auth Token
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

# Twilio Phone Number (must be in E.164 format: +1234567890)
TWILIO_PHONE_NUMBER=+1234567890
```

### Email Configuration

**For Gmail:**
1. Enable 2-Factor Authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the 16-character app password (remove spaces)

```bash
# Email Host User
EMAIL_HOST_USER=your-email@gmail.com

# Email App Password (NOT your regular password)
EMAIL_HOST_PASSWORD=your-app-specific-password
```

### JWT Configuration (Optional)

```bash
# Access Token Lifetime (in minutes) - Default: 60
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60

# Refresh Token Lifetime (in days) - Default: 7
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
```

### Allowed Hosts & CORS (Optional - already configured in prod.py)

```bash
# Comma-separated list of allowed hosts
ALLOWED_HOSTS=backend-production-8d38.up.railway.app

# Comma-separated list of allowed origins
CORS_ALLOWED_ORIGINS=https://your-frontend-url.app
```

---

## Frontend Environment Variables (Vercel/Railway)

### Backend API URL

```bash
# Production Backend API URL
NEXT_PUBLIC_API_URL=https://backend-production-8d38.up.railway.app/api
```

---

## Quick Setup Guide

### Backend on Railway:

1. **Create New Project** on Railway
2. **Add PostgreSQL Database** service
3. **Deploy from GitHub** repository (backend folder)
4. **Add Environment Variables**:
   - Copy all backend variables from above
   - Railway auto-generates `DATABASE_URL`
   - **CRITICAL**: Add Twilio credentials for OTP functionality
   - Add your email credentials
   - Generate and add SECRET_KEY

5. **Configure Build**:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - Start Command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`

### Frontend on Vercel/Railway:

1. **Deploy from GitHub** repository (frontend folder)
2. **Add Environment Variable**:
   ```
   NEXT_PUBLIC_API_URL=https://backend-production-8d38.up.railway.app/api
   ```

3. **Configure Build**:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

---

## Environment Variables Priority

### Must Have (Backend):
- ✅ SECRET_KEY
- ✅ DATABASE_URL
- ✅ DJANGO_SETTINGS_MODULE
- ✅ TWILIO_ACCOUNT_SID
- ✅ TWILIO_AUTH_TOKEN
- ✅ TWILIO_PHONE_NUMBER

### Recommended (Backend):
- EMAIL_HOST_USER
- EMAIL_HOST_PASSWORD

### Must Have (Frontend):
- ✅ NEXT_PUBLIC_API_URL

---

## Testing Your Setup

### Test Backend:
```bash
curl https://backend-production-8d38.up.railway.app/api/health/
```

### Test Frontend:
1. Open your deployed frontend URL
2. Try to signup/login
3. Check browser console for API connection errors

---

## Troubleshooting

### CORS Errors:
- Verify `CORS_ALLOWED_ORIGINS` includes your frontend URL
- Check browser console for specific origin being blocked

### Twilio OTP Not Working:
- Verify Twilio credentials are correct
- Check Twilio phone number has SMS capabilities
- Verify phone number format is E.164 (+1234567890)
- Check Twilio Console for error logs

### 500 Internal Server Errors:
- Check Railway backend logs
- Verify DATABASE_URL is set correctly
- Ensure all migrations are run
- Check SECRET_KEY is set

### Database Connection Issues:
- Railway auto-generates DATABASE_URL
- Ensure PostgreSQL service is running
- Check database credentials in Railway

---

## Security Notes

⚠️ **NEVER commit these environment variables to Git**
⚠️ **Always use strong SECRET_KEY in production**
⚠️ **Set DEBUG=False in production**
⚠️ **Use app-specific passwords for email, not your main password**
⚠️ **Keep Twilio credentials secure**

---

## Additional Resources

- [Django Production Checklist](https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/)
- [Railway Docs](https://docs.railway.app/)
- [Twilio Python SDK](https://www.twilio.com/docs/libraries/python)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
