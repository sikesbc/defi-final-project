import os
from dotenv import load_dotenv
import openai

# Load .env
load_dotenv()

# Get API key
api_key = os.getenv("OPENAI_API_KEY")

# Create client
client = openai.OpenAI(api_key=api_key)

# Test prompt
try:
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "Say hello in a fun way!"}],
        max_tokens=50
    )
    print("Response from OpenAI:", response.choices[0].message.content)
except Exception as e:
    print("Error:", e)
