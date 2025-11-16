# Ollama Service Fixes

## Issues Fixed

### 1. **Timeout Issues** (`services/ollama_service.py`)
- **Problem**: 120-second timeout was causing long hangs when Ollama wasn't responding
- **Solution**: 
  - Added pre-flight connection check (`check_ollama_connection()`) before API calls
  - Connection check uses 3-second timeout to fail fast
  - Increased API call timeout to 300 seconds for legitimate long-running model inference
  - Added specific timeout exception handling with informative messages

### 2. **No Connection Validation** (`services/ollama_service.py`)
- **Problem**: API calls would hang for 120+ seconds waiting for unavailable Ollama server
- **Solution**:
  - Both `call_ollama_llm()` and `call_ollama_chat()` now call `check_ollama_connection()` first
  - Failed connection checks exit immediately with "not accessible" message
  - Prevents wasted time on requests to non-responsive server

### 3. **Poor Error Handling** (`services/ollama_service.py`)
- **Problem**: Generic exception catching, no distinction between timeout and network errors
- **Solution**:
  - Explicit handling of `requests.exceptions.Timeout`
  - Explicit handling of `requests.exceptions.ConnectionError`
  - Better error messages for debugging

### 4. **RAG Retrieval Error Handling** (`services/ai_engine.py`)
- **Problem**: Vector store import/function calls could fail silently or crash analysis
- **Solution**:
  - Added try-except around import of vector store
  - Added nested try-except around RAG retrieval calls
  - Falls back gracefully to generating explanations without historical context
  - Won't crash if vector store is unavailable

## Behavior After Fixes

### When Ollama is Running
- API calls proceed normally after quick 3-second connection check
- 300-second timeout allows large models to complete inference

### When Ollama is NOT Running
- Connection check fails immediately (3 seconds)
- API calls return `None` instead of hanging
- Fallback mechanisms activate:
  - **Embeddings**: Use local SentenceTransformer instead
  - **LLM explanations**: Use template-based fallback
  - **Analysis**: Continue without waiting for Ollama

### When Ollama is Overloaded
- Connection check timeout message logged
- API calls skip, fallback to local processing
- No 120+ second hangs

## Testing the Fixes

### Check Ollama Connection
```bash
curl http://localhost:11434/api/tags
```

### Run Backend Tests
```bash
python -m pytest tests/ -v
```

### Monitor Logs
Watch for these positive messages:
- `"Embedding successfully retrieved from Ollama"`
- `"Embedding successfully generated using local SentenceTransformer model"`
- `"LLM explanation retrieved successfully"`

Or these fallback messages (if Ollama unavailable):
- `"Falling back to local SentenceTransformer model..."`
- `"Ollama server at http://localhost:11434 is not accessible. Skipping LLM generation."`

## Configuration

If you need to change Ollama connection:

1. Edit `.env` file:
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_LLM_GENERAL=llama3.2
OLLAMA_EMBED_MODEL=embeddinggemma:latest
```

2. Restart backend service

## Running Ollama

To start Ollama locally:
```bash
ollama serve
```

In a separate terminal, pull models:
```bash
ollama pull llama3.2
ollama pull embeddinggemma:latest
ollama pull qwen3-vl:2b
```

## Next Steps

1. Start Ollama server (if available on your system)
2. Restart the backend service
3. Test report analysis — should now complete without timeouts
4. Monitor logs for proper fallback behavior when Ollama unavailable
