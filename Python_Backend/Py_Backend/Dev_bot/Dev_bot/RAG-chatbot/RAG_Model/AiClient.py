from openai import OpenAI
import sys
import os
from dotenv import load_dotenv
load_dotenv()
from sentence_transformers import SentenceTransformer

OPENROUTER_API_KEY=os.getenv("OPENROUTER_API_KEY")

if not OPENROUTER_API_KEY :
    print("Error: OPENROUTER_KEY environment variable is not set", file=sys.stderr)
    sys.exit(1)

from openai import OpenAI as ORClient
OR_client = ORClient(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1"
)

bge = SentenceTransformer("BAAI/bge-small-en-v1.5")



 
