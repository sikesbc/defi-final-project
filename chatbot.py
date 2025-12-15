"""
AI Chatbot for Crypto Attack Tracker

This module provides a simple chatbot interface that allows users to ask
natural language questions about cryptocurrency attack data. The chatbot
uses OpenAI to convert questions into API calls and returns formatted results.

Quick Usage:
    from chatbot import ask_question
    
    answer = ask_question("What is the most costly DeFi attack?")
    print(answer)

Usage in Streamlit:
    from chatbot import ChatBot
    
    chatbot = ChatBot(api_base_url="http://localhost:8000/api/v1")
    
    # In your Streamlit app, use Streamlit's chat input component
    # to capture user questions and pass them to the chatbot:
    #
    # if prompt := st.chat_input(\"Ask a question about crypto attacks...\"):
    #     response = chatbot.process_query(prompt)
    #     st.chat_message(\"user\").write(prompt)
    #     st.chat_message(\"assistant\").write(response)
"""

from dotenv import load_dotenv
import os
import openai
import streamlit as st
from typing import Optional, Dict, Any
import json
import requests

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")


class ChatBot:
    """Simple chatbot that converts natural language queries to API calls."""
    
    def __init__(
        self, 
        api_base_url: str = "http://localhost:8000/api/v1",
        openai_api_key: Optional[str] = None,
        model="gpt-3.5-turbo"

    ):
        """
        Initialize the chatbot.
        
        Args:
            api_base_url: Base URL for the attacks API
            openai_api_key: OpenAI API key (if None, reads from OPENAI_API_KEY env var)
            model: OpenAI model to use (default: gpt-4o-mini)
        """
        self.api_base_url = api_base_url.rstrip('/')
        self.model = model
        
        # Get OpenAI API key
        api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "OpenAI API key required. Set OPENAI_API_KEY environment variable "
                "or pass openai_api_key parameter."
            )
        
        # Available API endpoints documentation
        self.api_docs = {
            "summary": {
                "endpoint": "/attacks/summary",
                "method": "GET",
                "description": "Get summary statistics (total attacks, losses, etc.)",
                "params": {}
            },
            "attacks": {
                "endpoint": "/attacks",
                "method": "GET",
                "description": "Get list of attacks with optional filters",
                "params": {
                    "limit": "int (1-10000), default 1000",
                    "offset": "int, default 0",
                    "start_date": "string (YYYY-MM-DD), optional",
                    "end_date": "string (YYYY-MM-DD), optional",
                    "protocol": "string, optional",
                    "attack_type": "string, optional"
                }
            },
            "timeline": {
                "endpoint": "/attacks/timeline",
                "method": "GET",
                "description": "Get timeline data grouped by period",
                "params": {
                    "granularity": "string: 'day', 'week', or 'month', default 'month'",
                    "start_date": "string (YYYY-MM-DD), optional",
                    "end_date": "string (YYYY-MM-DD), optional"
                }
            },
            "protocol_breakdown": {
                "endpoint": "/attacks/by-protocol",
                "method": "GET",
                "description": "Get breakdown of attacks by protocol",
                "params": {}
            },
            "attack_type_breakdown": {
                "endpoint": "/attacks/by-type",
                "method": "GET",
                "description": "Get breakdown of attacks by attack type",
                "params": {}
            },
            "top_attacks": {
                "endpoint": "/attacks/top",
                "method": "GET",
                "description": "Get top attacks by loss amount",
                "params": {
                    "limit": "int (1-100), default 10"
                }
            }
        }
    
    def _convert_query_to_api_call(self, user_query: str) -> Dict[str, Any]:
        """
        Use OpenAI to convert natural language query to API call specification.
        
        Args:
            user_query: User's natural language question
            
        Returns:
            Dictionary with 'endpoint', 'params', and 'reasoning' keys
        """
        system_prompt = """You are a helpful assistant that converts natural language questions about cryptocurrency attacks into API calls.

Available API endpoints:
1. /attacks/summary - Get summary statistics (total attacks, total losses, etc.)
2. /attacks - Get list of attacks with filters (limit, offset, start_date, end_date, protocol, attack_type)
3. /attacks/timeline - Get timeline data (granularity: day/week/month, start_date, end_date)
4. /attacks/by-protocol - Get breakdown by protocol
5. /attacks/by-type - Get breakdown by attack type
6. /attacks/top - Get top attacks by loss (limit parameter)

Your job is to determine which endpoint to call and what parameters to use based on the user's question.

Return ONLY valid JSON in this exact format:
{
    "endpoint": "endpoint_name (one of: summary, attacks, timeline, protocol_breakdown, attack_type_breakdown, top_attacks)",
    "params": {
        "param_name": "value"
    },
    "reasoning": "brief explanation of why you chose this endpoint"
}

Examples:
- "What are the total losses?" -> {"endpoint": "summary", "params": {}, "reasoning": "User wants summary statistics"}
- "Show me attacks on Ethereum" -> {"endpoint": "attacks", "params": {"protocol": "Ethereum", "limit": 100}, "reasoning": "Filtering by protocol"}
- "Top 5 attacks" -> {"endpoint": "top_attacks", "params": {"limit": 5}, "reasoning": "User wants top attacks"}
- "Show timeline by month" -> {"endpoint": "timeline", "params": {"granularity": "month"}, "reasoning": "User wants timeline data"}
- "What protocols were attacked most?" -> {"endpoint": "protocol_breakdown", "params": {}, "reasoning": "User wants protocol statistics"}

Important:
- Use "summary" for questions about totals, averages, overall statistics
- Use "attacks" for questions about specific attacks or filtering
- Use "timeline" for questions about trends over time
- Use "protocol_breakdown" for questions about which protocols
- Use "attack_type_breakdown" for questions about attack types
- Use "top_attacks" for questions about biggest/largest attacks
- For date queries, extract dates in YYYY-MM-DD format
- For protocol names, preserve exact capitalization if provided
- Default limit for attacks should be 50 unless user specifies otherwise
"""

        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query}
                ],
                temperature=0.1,  # Low temperature for more deterministic outputs
            )
            
            result = json.loads(response["choices"][0]["message"]["content"])
            return result
            
        except Exception as e:
            raise Exception(f"Failed to convert query to API call: {str(e)}")
    
    def _call_api(self, endpoint_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make API call to the attacks API.
        
        Args:
            endpoint_name: Name of the endpoint (e.g., "summary", "attacks")
            params: Query parameters for the API call
            
        Returns:
            API response as dictionary
        """
        # Map endpoint names to actual API paths
        endpoint_map = {
            "summary": "/attacks/summary",
            "attacks": "/attacks",
            "timeline": "/attacks/timeline",
            "protocol_breakdown": "/attacks/by-protocol",
            "attack_type_breakdown": "/attacks/by-type",
            "top_attacks": "/attacks/top"
        }
        
        if endpoint_name not in endpoint_map:
            raise ValueError(f"Unknown endpoint: {endpoint_name}")
        
        url = f"{self.api_base_url}{endpoint_map[endpoint_name]}"
        
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")
    
    def _format_response(self, user_query: str, api_result: Dict[str, Any], endpoint_name: str) -> str:
        """
        Format API response into a natural language answer.
        
        Args:
            user_query: Original user query
            api_result: Result from API call
            endpoint_name: Name of the endpoint that was called
            
        Returns:
            Formatted response string
        """
        # Use OpenAI to format the response naturally
        formatting_prompt = f"""You are a helpful assistant that formats API responses into clear, natural language answers.

User's question: {user_query}

API Response:
{json.dumps(api_result, indent=2)}

Format this data into a clear, conversational answer. Include specific numbers and details from the data. 
Be concise but informative. Use bullet points or numbered lists when appropriate.
Don't just repeat the JSON - explain what the data means in the context of the user's question.

Answer:"""

        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that explains data clearly and concisely."},
                    {"role": "user", "content": formatting_prompt}
                ],
                temperature=0.3
            )
            
            return response["choices"][0]["message"]["content"]
            
        except Exception as e:
            # Fallback to simple formatting if OpenAI fails
            return self._simple_format(api_result, endpoint_name)
    
    def _simple_format(self, api_result: Dict[str, Any], endpoint_name: str) -> str:
        """Simple fallback formatting without OpenAI."""
        if endpoint_name == "summary":
            stats = api_result
            return f"""**Summary Statistics:**

- **Total Attacks**: {stats.get('total_attacks', 0):,}
- **Total Losses**: ${stats.get('total_losses_usd', 0):,.2f}
- **Attacks (Last 30 Days)**: {stats.get('attacks_last_30_days', 0):,}
- **Losses (Last 30 Days)**: ${stats.get('losses_last_30_days', 0):,.2f}
- **Average Loss per Attack**: ${stats.get('average_loss_per_attack', 0):,.2f}
- **Most Targeted Protocol**: {stats.get('most_targeted_protocol', 'N/A')}
- **Most Common Attack Type**: {stats.get('most_common_attack_type', 'N/A')}"""
        
        elif endpoint_name == "top_attacks":
            attacks = api_result.get('top_attacks', [])
            result = "**Top Attacks by Loss Amount:**\n\n"
            for i, attack in enumerate(attacks, 1):
                result += f"{i}. **{attack.get('protocol_name', 'Unknown')}** - ${attack.get('loss_amount_usd', 0):,.2f}\n"
                result += f"   Date: {attack.get('attack_date', 'N/A')}, Type: {attack.get('attack_type', 'N/A')}\n\n"
            return result
        
        elif endpoint_name == "protocol_breakdown":
            protocols = api_result.get('protocols', [])
            result = "**Attacks by Protocol:**\n\n"
            for protocol in protocols[:10]:  # Top 10
                result += f"- **{protocol.get('protocol_name', 'Unknown')}**: {protocol.get('attack_count', 0)} attacks, ${protocol.get('total_loss_usd', 0):,.2f} ({protocol.get('percentage', 0):.1f}%)\n"
            return result
        
        elif endpoint_name == "attack_type_breakdown":
            types = api_result.get('attack_types', [])
            result = "**Attacks by Type:**\n\n"
            for attack_type in types:
                result += f"- **{attack_type.get('attack_type', 'Unknown')}**: {attack_type.get('attack_count', 0)} attacks, ${attack_type.get('total_loss_usd', 0):,.2f} ({attack_type.get('percentage', 0):.1f}%)\n"
            return result
        
        elif endpoint_name == "timeline":
            timeline = api_result.get('timeline', [])
            result = "**Timeline Data:**\n\n"
            for point in timeline[:20]:  # Last 20 points
                result += f"- **{point.get('period', 'N/A')}**: {point.get('attack_count', 0)} attacks, ${point.get('total_loss_usd', 0):,.2f}\n"
            return result
        
        elif endpoint_name == "attacks":
            attacks = api_result.get('data', [])
            count = api_result.get('count', 0)
            result = f"**Found {count} attack(s):**\n\n"
            for i, attack in enumerate(attacks[:10], 1):  # Show first 10
                result += f"{i}. **{attack.get('protocol_name', 'Unknown')}** - ${attack.get('loss_amount_usd', 0):,.2f}\n"
                result += f"   Date: {attack.get('attack_date', 'N/A')}, Type: {attack.get('attack_type', 'N/A')}\n"
                if attack.get('description'):
                    result += f"   {attack.get('description', '')[:100]}...\n"
                result += "\n"
            if count > 10:
                result += f"\n*Showing first 10 of {count} results.*"
            return result
        
        else:
            return f"Retrieved data:\n```json\n{json.dumps(api_result, indent=2)}\n```"
    
    def _check_backend(self):
        """Check if the backend API is available."""
        try:
            health_url = self.api_base_url.replace('/api/v1', '') + '/health'
            r = requests.get(health_url, timeout=3)
            r.raise_for_status()
            return True
        except Exception:
            return False
    
    def process_query(self, user_query: str) -> str:
        """
        Process a user query and return a formatted response.
        
        Args:
            user_query: Natural language question from user
            
        Returns:
            Formatted response string
        """
        if not self._check_backend():
            return (
                "⚠️ Backend API is not running.\n\n"
                "Please start the API server on http://localhost:8000 "
                "before asking questions."
            )

        try:
            # Step 1: Convert query to API call
            api_spec = self._convert_query_to_api_call(user_query)
            endpoint = api_spec.get("endpoint")
            params = api_spec.get("params", {})
            
            # Step 2: Make API call
            api_result = self._call_api(endpoint, params)
            
            # Step 3: Format response
            formatted = self._format_response(user_query, api_result, endpoint)
            
            return formatted
            
        except Exception as e:
            return f"Sorry, I encountered an error: {str(e)}\n\nPlease try rephrasing your question or check if the API is running."


def ask_question(
    question: str,
    api_base_url: str = "http://localhost:8000/api/v1",
    openai_api_key: Optional[str] = None
) -> str:
    """
    Simple convenience function to ask a question about DeFi attacks.
    
    This function creates a ChatBot instance and processes the query.
    It's a convenient wrapper for one-off questions.
    
    Args:
        question: Natural language question about DeFi attacks
        api_base_url: Base URL for the attacks API (default: http://localhost:8000/api/v1)
        openai_api_key: OpenAI API key (optional, reads from OPENAI_API_KEY env var if not provided)
        
    Returns:
        Formatted response string
        
    Example:
        from chatbot import ask_question
        
        answer = ask_question("What is the most costly DeFi attack?")
        print(answer)
    """
    chatbot = ChatBot(api_base_url=api_base_url, openai_api_key=openai_api_key)
    return chatbot.process_query(question)


def create_streamlit_chat_interface(chatbot: ChatBot):
    """
    Create a Streamlit chat interface using the chatbot.
    
    This function sets up the Streamlit UI for the chatbot.
    Call this from your Streamlit app.
    
    Example:
        import streamlit as st
        from chatbot import ChatBot, create_streamlit_chat_interface
        
        chatbot = ChatBot(api_base_url="http://localhost:8000/api/v1")
        create_streamlit_chat_interface(chatbot)
    """
    import streamlit as st
    
    # Initialize chat history
    if "messages" not in st.session_state:
        st.session_state.messages = []
    
    # Display chat messages from history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
    
    # Accept user input (single chat input per rerun)
    if prompt := st.chat_input(
        "Ask a question about crypto attacks...",
        key="chat_input_main",
    ):
        # Add user message to chat history
        st.session_state.messages.append({"role": "user", "content": prompt})
        
        # Display user message
        with st.chat_message("user"):
            st.markdown(prompt)
        
        # Display assistant response
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                response = chatbot.process_query(prompt)
                st.markdown(response)
        
        # Add assistant response to chat history
        st.session_state.messages.append({"role": "assistant", "content": response})


# Example standalone Streamlit app
if __name__ == "__main__":
    import streamlit as st
    import requests
    
    st.set_page_config(
        page_title="Crypto Attack Tracker - Chat",
        page_icon="💬",
        layout="wide"
    )
    
    st.title("💬 Crypto Attack Tracker Chat")
    st.markdown("Ask me anything about cryptocurrency protocol attacks!")
    
    # Get API base URL from environment or use default
    api_base_url = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")
    
    # Backend status check function
    def backend_status(url):
        try:
            requests.get(f"{url}/attacks/summary", timeout=2)
            return "🟢 Backend Online"
        except:
            return "🔴 Backend Offline"
    
    # Show backend status in sidebar
    with st.sidebar:
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
    
    # Initialize chatbot
    try:
        chatbot = ChatBot(api_base_url=api_base_url)
        create_streamlit_chat_interface(chatbot)
    except ValueError as e:
        st.error(f"Configuration error: {str(e)}")
        st.info("Please set the OPENAI_API_KEY environment variable.")
    except Exception as e:
        st.error(f"Error initializing chatbot: {str(e)}")

