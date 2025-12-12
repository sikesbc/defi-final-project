# Quick Start Guide

Get the Crypto Attack Tracker running locally in under 10 minutes.

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Supabase account (free tier)

## 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Once created, go to Settings > API and copy:
   - Project URL
   - anon public key
   - service_role secret key
4. Go to SQL Editor and run the migration:
   - Copy contents from `supabase/migrations/001_initial_schema.sql`
   - Execute

## 2. Set Up Backend

```bash
# Navigate to API directory
cd api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_KEY=[YOUR-SERVICE-ROLE-KEY]
FRONTEND_URL=http://localhost:5173
PORT=8000
ENVIRONMENT=development
EOF

# Start the server
uvicorn app.main:app --reload
```

The API will be running at `http://localhost:8000`

## 3. Set Up Frontend

Open a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
EOF

# Start the development server
npm run dev
```

The app will be running at `http://localhost:5173`

## 4. Load Initial Data

Open a third terminal:

```bash
cd api
source venv/bin/activate  # Windows: venv\Scripts\activate
python scripts/manual_refresh.py
```

This will fetch initial data from the sources. It may take a minute to complete.

## 5. View the Dashboard

Open your browser to `http://localhost:5173` to see the dashboard with attack data.

## What's Included

- Interactive dashboard with charts and graphs
- Summary statistics of all attacks
- Timeline showing attacks over time
- Protocol breakdown by loss amount
- Attack type analysis
- Top 10 attacks table
- CSV export functionality

## Common Issues

### Backend won't start
- Make sure virtual environment is activated
- Check that all dependencies installed: `pip list`
- Verify .env file has correct Supabase credentials

### Frontend shows "Error Loading Data"
- Ensure backend is running on port 8000
- Check that VITE_API_BASE_URL is correct in frontend/.env
- Verify CORS settings in backend allow localhost:5173

### No data showing
- Run the manual refresh script: `python scripts/manual_refresh.py`
- Check that database tables were created properly
- View API logs for any errors

### Data sources failing
- Some sources may be temporarily unavailable
- The app will continue working with data from available sources
- Check API logs for specific error messages

## Next Steps

- Customize the dashboard: Edit components in `frontend/src/components/`
- Add more data sources: Extend `api/app/services/data_fetcher.py`
- Deploy to production: See `DEPLOYMENT.md`
- Set up automated refresh: Configure Supabase cron job (see README)

## Development Commands

### Backend
```bash
# Start dev server
uvicorn app.main:app --reload

# Manual data refresh
python scripts/manual_refresh.py

# Run with different port
uvicorn app.main:app --reload --port 8001
```

### Frontend
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## API Documentation

Once the backend is running, visit:
- Interactive API docs: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

## Project Structure

```
defi-final-project/
├── api/              # FastAPI backend
│   ├── app/          # Application code
│   └── scripts/      # Utility scripts
├── frontend/         # React frontend
│   └── src/          # Source code
└── supabase/         # Database migrations
```

## Getting Help

- Check `README.md` for detailed documentation
- View API docs at `http://localhost:8000/docs`
- Open an issue on GitHub
- Check Supabase dashboard for database issues

---

