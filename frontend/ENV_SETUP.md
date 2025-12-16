# Environment Variables Setup

## Location
Create a `.env` file in the `frontend/` directory (same level as `package.json`).

## Required Format

```bash
# Supabase Configuration (REQUIRED)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# OpenAI Configuration (OPTIONAL - for enhanced LLM processing)
VITE_OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

## Important Notes

1. **Variable Names Must Start with `VITE_`**: Vite only exposes environment variables that start with `VITE_` to the client-side code.

2. **No Quotes Needed**: Don't wrap values in quotes unless the value itself contains spaces.

3. **No Spaces Around `=`**: Use `KEY=value` not `KEY = value`

4. **Restart Dev Server**: After creating or modifying `.env`, you MUST restart the Vite dev server:
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

5. **Check if Loaded**: You can verify the key is loaded by checking the browser console. The code will log a warning if the key is not set.

## Example .env file:

```bash
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.example
VITE_OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890
```

## Troubleshooting

If you see "OpenAI API key not set":
1. Check the file is named exactly `.env` (not `.env.local` or `.env.development`)
2. Check the variable name is exactly `VITE_OPENAI_API_KEY`
3. Check there are no extra spaces or quotes
4. Restart the dev server
5. Check browser console for any errors

