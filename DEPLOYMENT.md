# Deployment Guide

This guide walks you through deploying the Crypto Attack Tracker to production.

## Prerequisites

- Supabase account and project
- Vercel account (for frontend)
- Railway or Render account (for backend)
- GitHub repository

## Step 1: Set Up Supabase

1. **Create a new project** at [supabase.com](https://supabase.com)

2. **Get your credentials:**
   - Project URL: `https://[your-project-id].supabase.co`
   - Anon/Public Key: Found in Settings > API
   - Service Role Key: Found in Settings > API (keep this secret!)

3. **Run database migrations:**
   - Navigate to SQL Editor
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Execute the query

4. **Deploy Edge Function:**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link your project
   supabase link --project-ref [your-project-id]
   
   # Deploy the function
   supabase functions deploy refresh-data
   ```

5. **Set up cron job:**
   - Go to SQL Editor
   - Update URLs in `supabase/cron_schedule.sql` with your function URL
   - Execute the query

## Step 2: Deploy Backend (Railway)

1. **Create new project** on [Railway](https://railway.app)

2. **Connect GitHub repository:**
   - Select your repository
   - Set root directory to `/api`

3. **Add environment variables:**
   ```
   SUPABASE_URL=https://[your-project-id].supabase.co
   SUPABASE_ANON_KEY=[your-anon-key]
   SUPABASE_SERVICE_KEY=[your-service-key]
   FRONTEND_URL=https://[your-vercel-domain].vercel.app
   PORT=8000
   ENVIRONMENT=production
   ```

4. **Configure build settings:**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. **Deploy:**
   - Railway will automatically deploy on push to main branch

6. **Get your API URL:**
   - Copy the generated Railway URL (e.g., `https://[your-app].railway.app`)

## Step 3: Deploy Backend (Alternative: Render)

1. **Create new Web Service** on [Render](https://render.com)

2. **Connect GitHub repository:**
   - Select your repository
   - Root Directory: `api`

3. **Configure:**
   - Environment: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **Add environment variables** (same as Railway)

5. **Deploy:**
   - Render will automatically deploy

## Step 4: Deploy Frontend (Vercel)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

3. **Add environment variables:**
   Create `.env.production`:
   ```
   VITE_API_BASE_URL=https://[your-railway-or-render-url].app/api/v1
   VITE_SUPABASE_URL=https://[your-project-id].supabase.co
   VITE_SUPABASE_ANON_KEY=[your-anon-key]
   ```

4. **Deploy:**
   ```bash
   vercel --prod
   ```

   Or connect via Vercel dashboard:
   - Import your GitHub repository
   - Set root directory to `frontend`
   - Add environment variables in dashboard
   - Deploy

## Step 5: Configure CORS

Update your backend CORS settings to include your production frontend URL:

In `api/app/config.py`, add your Vercel domain:
```python
CORS_ORIGINS: list = [
    "https://[your-vercel-domain].vercel.app",
    "http://localhost:5173",
]
```

## Step 6: Update Edge Function

Update the Edge Function environment variables:

```bash
supabase secrets set API_URL=https://[your-backend-url].app
supabase secrets set SERVICE_ROLE_KEY=[your-service-key]
```

## Step 7: Test the Deployment

1. **Test the API:**
   ```bash
   curl https://[your-backend-url].app/health
   ```

2. **Test the frontend:**
   - Visit your Vercel URL
   - Check that data loads correctly

3. **Test manual refresh:**
   ```bash
   curl -X POST https://[your-backend-url].app/api/v1/attacks/refresh \
     -H "X-Service-Key: [your-service-key]"
   ```

## Step 8: Monitor

1. **Check Supabase logs:**
   - Database > Logs
   - Edge Functions > Logs

2. **Check Railway/Render logs:**
   - View application logs in dashboard

3. **Check Vercel logs:**
   - View build and runtime logs

## Troubleshooting

### API not connecting to database
- Verify Supabase credentials
- Check network settings in Supabase
- Ensure service role key is correct

### Frontend showing CORS errors
- Verify backend CORS_ORIGINS includes your frontend URL
- Check that API URL is correct in frontend .env

### Cron job not running
- Verify Edge Function is deployed
- Check cron schedule syntax
- View Edge Function logs

### Data not refreshing
- Check refresh logs in database
- Verify service key is set in Edge Function
- Test manual refresh endpoint

## Security Checklist

- [ ] Service role key is not exposed in frontend
- [ ] CORS is configured with specific origins
- [ ] Environment variables are set in deployment platforms
- [ ] .env files are in .gitignore
- [ ] Database row level security policies are configured
- [ ] API rate limiting is enabled (if applicable)

## Maintenance

### Updating the application

1. **Backend updates:**
   - Push to GitHub
   - Railway/Render will auto-deploy

2. **Frontend updates:**
   - Push to GitHub
   - Vercel will auto-deploy

3. **Database migrations:**
   - Create new migration file
   - Run in Supabase SQL Editor
   - Document in migration history

### Monitoring data freshness

Check the refresh status endpoint:
```bash
curl https://[your-backend-url].app/api/v1/attacks/refresh/status
```

### Manual data refresh

If needed, trigger manually:
```bash
curl -X POST https://[your-backend-url].app/api/v1/attacks/refresh \
  -H "X-Service-Key: [your-service-key]"
```

## Cost Estimates

- **Supabase Free Tier**: $0/month (500MB database, 2GB bandwidth)
- **Railway Hobby**: $5/month (500 hours, $0.01/hour after)
- **Render Free Tier**: $0/month (750 hours)
- **Vercel Free Tier**: $0/month (100GB bandwidth)

**Total**: $0-5/month for hobby/development use

## Support

If you encounter issues:
1. Check application logs
2. Review error messages
3. Consult platform documentation
4. Open an issue on GitHub

---

Last updated: December 2024

