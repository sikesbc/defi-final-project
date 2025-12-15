# Crypto Attack Tracker

A full-stack web application for tracking cryptocurrency protocol attacks and exploits. Data refreshes automatically every 48 hours via Supabase cron jobs, with an interactive dashboard for visualization and analysis.

## Features

- Real-time attack tracking across multiple protocols
- Interactive dashboard with charts and visualizations
- AI-powered chatbot for natural language queries about attacks
- Automated data refresh (every 48 hours)
- Multiple data sources: Rekt.news, DeFiYield, and SlowMist
- CSV export for offline analysis
- Responsive design for desktop and mobile

## Technology Stack

### Frontend
- React 18+ with TypeScript
- Vite (build tool)
- Tailwind CSS
- Recharts (data visualization)
- React Query for state management
- Axios for HTTP requests

### Backend
- FastAPI (Python 3.11+)
- Supabase PostgreSQL
- Supabase Python Client
- pandas for data processing

### Infrastructure
- Supabase PostgreSQL database
- Supabase Edge Functions for cron jobs
- Vercel (frontend) and Railway/Render (backend) for deployment

## Project Structure

```
defi-final-project/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API client services
│   │   ├── types/           # TypeScript interfaces
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── api/                      # FastAPI backend
│   ├── app/
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── models/          # Pydantic schemas
│   │   ├── utils/           # Helper functions
│   │   └── main.py
│   ├── scripts/             # Utility scripts
│   └── requirements.txt
│
├── supabase/                 # Supabase configuration
│   ├── migrations/          # Database migrations
│   └── functions/           # Edge functions
│
└── README.md
```

## Quick Start

See [QUICKSTART.md](QUICKSTART.md) for a detailed setup guide.

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Supabase account

### Backend Setup

#### Option 1: Run from Project Root (Recommended)

1. Create a virtual environment (from project root):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r api/requirements.txt
   ```

3. Create `.env` file in the `api` directory with your Supabase credentials:
   ```bash
   # Create api/.env file
   cat > api/.env << EOF
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   FRONTEND_URL=http://localhost:5173
   PORT=8000
   ENVIRONMENT=development
   EOF
   ```

   **Note:** If Supabase credentials are not provided, the backend will still run but return empty data. This is useful for testing the chatbot without a database.

4. Run the development server from project root:
   ```bash
   python -m uvicorn main:app --reload
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --reload
   ```

   The API will be available at `http://localhost:8000`

#### Option 2: Run from API Directory

1. Navigate to the API directory:
   ```bash
   cd api
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create `.env` file with your Supabase credentials:
   ```bash
   cat > .env << EOF
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   FRONTEND_URL=http://localhost:5173
   PORT=8000
   ENVIRONMENT=development
   EOF
   ```

5. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create .env file:
   ```bash
   cat > .env << EOF
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   EOF
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

### Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Run the migration:
   - Go to the SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
   - Execute the query

3. Deploy the Edge Function:
   ```bash
   supabase functions deploy refresh-data
   ```

4. Set up the cron job:
   - Run the SQL in `supabase/cron_schedule.sql` in the SQL Editor
   - Update the URLs with your actual function URL

## API Endpoints

### Base URL: `http://localhost:8000/api/v1`

- `GET /attacks` - Get all attacks with optional filters
- `GET /attacks/summary` - Get summary statistics
- `GET /attacks/timeline` - Get timeline data
- `GET /attacks/by-protocol` - Get protocol breakdown
- `GET /attacks/by-type` - Get attack type breakdown
- `GET /attacks/top` - Get top attacks by loss amount
- `GET /attacks/export` - Export data to CSV
- `POST /attacks/refresh` - Trigger manual data refresh (requires service key)
- `GET /attacks/refresh/status` - Get refresh status

**Note:** All endpoints are accessible at `http://localhost:8000/api/v1/attacks/*` and work even without Supabase credentials (returning empty data).

## Chatbot

The project includes an AI-powered chatbot that allows users to ask natural language questions about cryptocurrency attacks. The chatbot uses OpenAI to convert questions into API calls and provides formatted responses.

### Running the Chatbot

1. Install chatbot dependencies:
   ```bash
   pip install -r chatbot_requirements.txt
   ```

2. Set your OpenAI API key:
   ```bash
   export OPENAI_API_KEY=your_openai_api_key
   ```
   Or create a `.env` file in the project root:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

3. Start the backend (required for chatbot to work):
   ```bash
   python -m uvicorn main:app --reload
   ```

4. Run the Streamlit chatbot:
   ```bash
   streamlit run chatbot.py
   ```

   The chatbot will be available at `http://localhost:8501`

For detailed chatbot documentation, see [CHATBOT_README.md](CHATBOT_README.md).

## Data Refresh

The application automatically refreshes data every 48 hours at 2 AM UTC. You can also trigger a manual refresh:

```bash
cd api
source venv/bin/activate
python scripts/manual_refresh.py
```

## Environment Variables

IMPORTANT: Never commit `.env` files or expose your `SUPABASE_SERVICE_KEY` in client-side code.

### Backend (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
FRONTEND_URL=http://localhost:5173
PORT=8000
ENVIRONMENT=development
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Frontend (Vercel)
```bash
cd frontend
npm run build
vercel deploy
```

### Backend (Railway/Render)
1. Connect your repository
2. Set environment variables
3. Deploy from the `api` directory

## Security

- All sensitive credentials stored in `.env` files (git-ignored)
- Service role key never exposed to frontend
- CORS configured for specific origins only
- API authentication on protected endpoints
- Input validation on all endpoints

## Documentation

- [QUICKSTART.md](QUICKSTART.md) - Setup guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment instructions
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions

## Notes / Known Limitations

If no attack data is present, the API returns an empty dataset and the chatbot responds accordingly. This is expected behavior when Supabase is not populated.

## License

MIT License

## Contributing

Contributions welcome. Submit a pull request or open an issue for bugs and feature requests.

---

CS 194 - DeFi Final Project
