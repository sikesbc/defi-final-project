"""
Streamlit Dashboard with Chat Interface

This is an example Streamlit app that integrates the chatbot feature.
It includes a chat tab where users can ask questions about crypto attacks.

To run:
    streamlit run streamlit_app.py

Make sure to set OPENAI_API_KEY environment variable.
"""

import os
import streamlit as st
import requests
from chatbot import ChatBot, create_streamlit_chat_interface

# Page config
st.set_page_config(
    page_title="Crypto Attack Tracker",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Backend status check function
def backend_status(url):
    try:
        requests.get(f"{url}/attacks/summary", timeout=2)
        return "🟢 Backend Online"
    except:
        return "🔴 Backend Offline"

# Sidebar configuration
with st.sidebar:
    st.title("⚙️ Configuration")
    api_base_url = st.text_input(
        "API Base URL",
        value=os.getenv("API_BASE_URL", "http://localhost:8000/api/v1"),
        help="Base URL for the attacks API"
    )
    
    # Show backend status
    st.markdown(backend_status(api_base_url))
    
    # Show instructions if backend is offline
    try:
        requests.get(f"{api_base_url}/attacks/summary", timeout=2)
    except:
        st.info(
            "Start backend with:\n\n"
            "`uvicorn main:app --reload`\n"
            "or\n"
            "`python app.py`"
        )
    
    # Check OpenAI API key
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        st.error("⚠️ OPENAI_API_KEY not set")
        st.info("Please set the OPENAI_API_KEY environment variable to use the chat feature.")
    else:
        st.success("✅ OpenAI API key configured")

# Main title
st.title("🛡️ Crypto Attack Tracker Dashboard")
st.markdown("Monitor cryptocurrency protocol attacks and exploits")

# Initialize chatbot in session state
if "chatbot" not in st.session_state:
    try:
        st.session_state.chatbot = ChatBot(api_base_url=api_base_url)
    except Exception as e:
        st.session_state.chatbot = None
        st.error(f"Failed to initialize chatbot: {str(e)}")

# Create tabs
tab1, tab2, tab3 = st.tabs(["📊 Dashboard", "💬 Chat", "🤖 Chatbot"])

with tab1:
    st.header("Attack Statistics")
    st.info("""
    This is a placeholder for your dashboard visualizations.
    
    You can integrate your existing dashboard components here, such as:
    - Summary statistics
    - Timeline charts
    - Protocol breakdowns
    - Attack type analysis
    - Top attacks table
    
    Use the Chat tab to ask questions about the data!
    """)
    
    # Example: You can add API calls here to display dashboard data
    if st.button("🔄 Load Summary Statistics"):
        try:
            import requests
            response = requests.get(f"{api_base_url}/attacks/summary", timeout=10)
            if response.status_code == 200:
                stats = response.json()
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    st.metric("Total Attacks", f"{stats.get('total_attacks', 0):,}")
                
                with col2:
                    st.metric("Total Losses", f"${stats.get('total_losses_usd', 0):,.2f}")
                
                with col3:
                    st.metric("Last 30 Days", f"{stats.get('attacks_last_30_days', 0):,}")
                
                with col4:
                    st.metric("Avg Loss", f"${stats.get('average_loss_per_attack', 0):,.2f}")
            else:
                st.error(f"API request failed: {response.status_code}")
        except Exception as e:
            st.error(f"Error loading data: {str(e)}")

with tab2:
    st.header("💬 Ask Me Anything")
    st.markdown("""
    Ask natural language questions about cryptocurrency attacks, such as:
    - "What are the total losses?"
    - "Show me the top 5 attacks"
    - "Which protocols were attacked most?"
    - "What are attacks on Ethereum?"
    - "Show me timeline data by month"
    """)
    
    if st.session_state.chatbot:
        create_streamlit_chat_interface(st.session_state.chatbot)
    else:
        st.warning("⚠️ Chatbot is not initialized. Please check your configuration in the sidebar.")

with tab3:
    st.header("🤖 Chatbot")
    st.info("The interactive chat interface is available in the **💬 Chat** tab to ensure a single chat input is rendered.")

