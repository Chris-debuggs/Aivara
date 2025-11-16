
import os
import sys
import requests
from typing import Optional
from dotenv import load_dotenv

# Add project root directory to sys.path for imports
_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(_current_dir)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

# Load environment variables from .env file
load_dotenv(os.path.join(_project_root, '.env'))

import config

# Ollama API Configuration
OLLAMA_BASE_URL = getattr(config, 'OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_LLM_GENERAL = getattr(config, 'OLLAMA_LLM_GENERAL', 'llama3.2')
OLLAMA_LLM_REPORT_READING = getattr(config, 'OLLAMA_LLM_REPORT_READING', 'qwen3-vl:2b')
OLLAMA_LLM_MEDICINE = getattr(config, 'OLLAMA_LLM_MEDICINE', 'medbot')
OLLAMA_LLM_WOMEN_HEALTH = getattr(config, 'OLLAMA_LLM_WOMEN_HEALTH', 'edi')
OLLAMA_EMBED_MODEL = getattr(config, 'OLLAMA_EMBED_MODEL', 'embeddinggemma:latest')

def call_ollama_llm(prompt: str, model: str, stream: bool = False) -> Optional[str]:
    """
    Calls the Ollama LLM API with the given prompt and model.
    
    Args:
        prompt: The prompt to send to the model
        model: The Ollama model name to use
        stream: Whether to stream the response (default: False)
    
    Returns:
        The generated text response, or None if the request failed
    """
    # Check Ollama connection first before making request
    if not check_ollama_connection():
        print(f"Ollama server at {OLLAMA_BASE_URL} is not accessible. Skipping LLM generation.")
        return None
    
    url = f"{OLLAMA_BASE_URL}/api/generate"
    
    data = {
        "model": model,
        "prompt": prompt,
        "stream": stream,
        "options": {
            "temperature": 0.7,
        }
    }
    
    try:
        response = requests.post(url, json=data, timeout=300)  # Increased timeout for large models
        response.raise_for_status()
        result = response.json()
        
        if "response" in result:
            return result["response"]
        else:
            print(f"Ollama API returned an unexpected format: {result}")
            return None
    except requests.exceptions.Timeout:
        print(f"Ollama API request timed out after 300 seconds. Model {model} may be too large or system too slow.")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Ollama API request failed: {e}")
        return None
    except Exception as e:
        print(f"Error processing Ollama API response: {e}")
        return None

def call_ollama_chat(messages: list[dict], model: str, stream: bool = False) -> Optional[str]:
    """
    Calls the Ollama Chat API with messages (useful for chat-based models).
    
    Args:
        messages: List of message dictionaries with 'role' and 'content' keys
        model: The Ollama model name to use
        stream: Whether to stream the response (default: False)
    
    Returns:
        The generated text response, or None if the request failed
    """
    # Check Ollama connection first before making request
    if not check_ollama_connection():
        print(f"Ollama server at {OLLAMA_BASE_URL} is not accessible. Skipping chat generation.")
        return None
    
    url = f"{OLLAMA_BASE_URL}/api/chat"
    
    data = {
        "model": model,
        "messages": messages,
        "stream": stream,
        "options": {
            "temperature": 0.7,
        }
    }
    
    try:
        response = requests.post(url, json=data, timeout=300)
        response.raise_for_status()
        result = response.json()
        
        if "message" in result and "content" in result["message"]:
            return result["message"]["content"]
        else:
            print(f"Ollama Chat API returned an unexpected format: {result}")
            return None
    except requests.exceptions.Timeout:
        print(f"Ollama Chat API request timed out after 300 seconds. Model {model} may be too large or system too slow.")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Ollama Chat API request failed: {e}")
        return None
    except Exception as e:
        print(f"Error processing Ollama Chat API response: {e}")
        return None

def get_embedding_via_ollama(text: str) -> Optional[list[float]]:
    """
    Gets embeddings from Ollama using the configured embedding model.
    
    Args:
        text: The text to embed
    
    Returns:
        List of floats representing the embedding vector, or None if failed
    """
    url = f"{OLLAMA_BASE_URL}/api/embeddings"
    
    data = {
        "model": OLLAMA_EMBED_MODEL,
        "prompt": text
    }
    
    try:
        response = requests.post(url, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        
        if "embedding" in result:
            return result["embedding"]
        else:
            print(f"Ollama Embeddings API returned an unexpected format: {result}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Ollama Embeddings API request failed: {e}")
        return None
    except Exception as e:
        print(f"Error processing Ollama Embeddings API response: {e}")
        return None

# Model selection helpers
def get_model_for_explanation() -> str:
    """Returns the model name for general health explanations."""
    return OLLAMA_LLM_GENERAL

def get_model_for_report_reading() -> str:
    """Returns the model name for reading and interpreting medical reports."""
    return OLLAMA_LLM_REPORT_READING

def get_model_for_medicine() -> str:
    """Returns the model name for allopathic medicine suggestions."""
    return OLLAMA_LLM_MEDICINE

def get_model_for_women_health() -> str:
    """Returns the model name for women's healthcare suggestions."""
    return OLLAMA_LLM_WOMEN_HEALTH

def check_ollama_connection() -> bool:
    """
    Checks if Ollama server is running and accessible.
    
    Returns:
        True if Ollama is accessible, False otherwise
    """
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
        return response.status_code == 200
    except requests.exceptions.Timeout:
        print(f"Ollama connection check timed out. Server may be overloaded.")
        return False
    except requests.exceptions.ConnectionError:
        return False
    except Exception as e:
        return False

