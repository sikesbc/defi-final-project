# Chatbot Feature Documentation

This document describes the AI chatbot feature for querying cryptocurrency attack data.

## Overview

The chatbot allows users to ask natural language questions about cryptocurrency protocol attacks. It uses OpenAI to convert questions into API calls and returns formatted, easy-to-read answers.

## Files

- `chatbot.py` - Main chatbot implementation
- `streamlit_app.py` - Example Streamlit dashboard with chat integration
- `chatbot_requirements.txt` - Python dependencies for the chatbot

## Installation

1. Install dependencies:
```bash
pip install -r chatbot_requirements.txt
```

2. Set environment variables:
```bash
export OPENAI_API_KEY="your-openai-api-key"
export API_BASE_URL="http://localhost:8000/api/v1"  # Optional, defaults to localhost
```

On Windows:
```powershell
$env:OPENAI_API_KEY="your-openai-api-key"
$env:API_BASE_URL="http://localhost:8000/api/v1"
```

## Usage

### Standalone Chatbot

The chatbot can be used programmatically:

```python
from chatbot import ChatBot

# Initialize chatbot
chatbot = ChatBot(
    api_base_url="http://localhost:8000/api/v1",
    openai_api_key="your-key-here"  # Or set OPENAI_API_KEY env var
)

# Process a query
response = chatbot.process_query("What are the total losses?")
print(response)
```

### Streamlit Integration

#### Option 1: Use the provided Streamlit app

```bash
streamlit run streamlit_app.py
```

#### Option 2: Integrate into your existing Streamlit app

```python
import streamlit as st
from chatbot import ChatBot, create_streamlit_chat_interface

# Initialize chatbot (once per session)
if "chatbot" not in st.session_state:
    st.session_state.chatbot = ChatBot(api_base_url="http://localhost:8000/api/v1")

# Add chat tab
tab1, tab2 = st.tabs(["Dashboard", "Chat"])

with tab1:
    # Your existing dashboard code
    pass

with tab2:
    create_streamlit_chat_interface(st.session_state.chatbot)
```

#### Option 3: Manual integration with custom UI

```python
import streamlit as st
from chatbot import ChatBot

chatbot = ChatBot(api_base_url="http://localhost:8000/api/v1")

# Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# User input
if prompt := st.chat_input("Ask a question..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    
    with st.chat_message("user"):
        st.markdown(prompt)
    
    with st.chat_message("assistant"):
        response = chatbot.process_query(prompt)
        st.markdown(response)
        st.session_state.messages.append({"role": "assistant", "content": response})
```

## How It Works

1. **Query Parsing**: User's natural language question is sent to OpenAI (gpt-4o-mini)
2. **API Call Generation**: OpenAI determines which API endpoint to call and what parameters to use
3. **Data Fetching**: The chatbot makes an HTTP request to the attacks API
4. **Response Formatting**: OpenAI formats the API response into a natural language answer

## Supported Queries

The chatbot can answer questions that map to these API endpoints:

- **Summary Statistics**: "What are the total losses?", "How many attacks happened?"
- **Attack Lists**: "Show me attacks on Ethereum", "List recent attacks"
- **Timeline Data**: "Show timeline by month", "What happened in 2023?"
- **Protocol Breakdown**: "Which protocols were attacked most?"
- **Attack Type Breakdown**: "What types of attacks are most common?"
- **Top Attacks**: "Show me the top 5 attacks", "What's the biggest attack?"

## API Endpoints Used

The chatbot uses these endpoints from your API:

- `GET /api/v1/attacks/summary` - Summary statistics
- `GET /api/v1/attacks` - List of attacks with filters
- `GET /api/v1/attacks/timeline` - Timeline data
- `GET /api/v1/attacks/by-protocol` - Protocol breakdown
- `GET /api/v1/attacks/by-type` - Attack type breakdown
- `GET /api/v1/attacks/top` - Top attacks by loss

## Configuration

### ChatBot Class Parameters

- `api_base_url` (str): Base URL for the attacks API (default: "http://localhost:8000/api/v1")
- `openai_api_key` (str, optional): OpenAI API key (default: reads from OPENAI_API_KEY env var)
- `model` (str): OpenAI model to use (default: "gpt-4o-mini")

### Environment Variables

- `OPENAI_API_KEY` (required): Your OpenAI API key
- `API_BASE_URL` (optional): Base URL for the attacks API

## Error Handling

The chatbot handles errors gracefully:

- If OpenAI API call fails, returns error message
- If API request fails, returns error message
- If query cannot be parsed, attempts to handle gracefully
- Falls back to simple formatting if OpenAI formatting fails

## Cost Considerations

The chatbot uses OpenAI's API with two calls per query:
1. One call to parse the query into an API specification
2. One call to format the API response into natural language

Using `gpt-4o-mini` keeps costs low (typically < $0.01 per query).

## Troubleshooting

**Error: "OpenAI API key required"**
- Set the `OPENAI_API_KEY` environment variable
- Or pass `openai_api_key` parameter when initializing ChatBot

**Error: "API request failed"**
- Make sure your API server is running on the configured base URL
- Check that the API endpoints are accessible
- Verify network connectivity

**Chatbot gives incorrect answers**
- Check that the API is returning correct data
- Try rephrasing your question
- The chatbot may misinterpret very complex queries

## Example Questions

Try asking:

- "What are the total losses?"
- "Show me the top 10 attacks"
- "Which protocol was attacked most?"
- "What types of attacks are most common?"
- "Show me attacks from 2023"
- "List attacks on Ethereum"
- "What's the timeline of attacks by month?"

