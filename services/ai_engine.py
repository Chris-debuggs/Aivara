
import os
import sys
import json
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Add project root directory to sys.path for imports
_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(_current_dir)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

# Load environment variables from .env file
load_dotenv(os.path.join(_project_root, '.env'))

import config
from services.ollama_service import (
    call_ollama_llm,
    get_model_for_explanation,
    get_model_for_report_reading,
    get_model_for_medicine,
    get_model_for_women_health
)

def make_explanation(parsed_data: Dict[str, Any], context_text: str | None = None, 
                     historical_context: str | None = None) -> Dict[str, Any]:
    """
    Generates an LLM-based explanation for the health markers.
    
    Args:
        parsed_data: Dictionary of health markers and their values
        context_text: Context from the current report (e.g., analysis summary)
        historical_context: Historical context from patient's previous reports (RAG-retrieved)
    """
    prompt_parts = [
        "You are an AI assistant specialized in explaining medical report results to a patient in a simple, calm, and reassuring manner. Avoid medical jargon where possible.",
        "Provide a brief summary and simple explanation for the following health markers. Focus on whether they are within normal limits and what that generally means."
    ]

    if historical_context:
        prompt_parts.append("Here is relevant information from the patient's previous medical reports that may help provide context:")
        prompt_parts.append(historical_context)
        prompt_parts.append("Use this historical context to provide more informed explanations, especially if there are trends or changes to note.")

    if context_text:
        prompt_parts.append(f"Here is some additional context from the current report: {context_text}")

    marker_details = []
    for marker, value in parsed_data.items():
        if value is not None:
            marker_details.append(f"{marker.replace('_', ' ').capitalize()}: {value}")
        else:
            marker_details.append(f"{marker.replace('_', ' ').capitalize()}: Not found")

    prompt_parts.append("\nHealth Markers:\n" + "\n".join(marker_details))
    prompt_parts.append("\nGenerate a patient-friendly explanation:")

    full_prompt = "\n".join(prompt_parts)
    # print("\n--- LLM Prompt ---")
    # print(full_prompt)
    # print("\n------------------")

    # Use llama3.2 for general health explanations
    model = get_model_for_explanation()
    explanation_text = call_ollama_llm(full_prompt, model)

    if explanation_text:
        return {"llm_explanation": explanation_text}
    else:
        # Fallback explanation when LLM is not available
        # Provide a basic explanation based on the markers
        fallback_parts = []
        found_markers = []
        for marker, value in parsed_data.items():
            if value is not None:
                found_markers.append((marker.replace('_', ' ').capitalize(), value))
        
        if found_markers:
            fallback_parts.append("Based on your health markers:")
            for marker_name, value in found_markers:
                # Reference ranges for basic explanation
                ranges = {
                    "Hemoglobin": {"normal": "12.0-17.5 g/dL", "low": 12.0, "high": 17.5},
                    "Wbc": {"normal": "4.0-11.0 x10³/uL", "low": 4.0, "high": 11.0},
                    "Platelets": {"normal": "150-450 x10³/uL", "low": 150, "high": 450},
                    "Rbc": {"normal": "4.5-5.9 x10⁶/uL", "low": 4.5, "high": 5.9},
                }
                marker_range = ranges.get(marker_name, {})
                if marker_range:
                    status = "within normal range" if (marker_range.get("low", 0) <= value <= marker_range.get("high", 999)) else "outside normal range"
                    fallback_parts.append(f"• {marker_name}: {value} (Normal: {marker_range.get('normal', 'N/A')}) - {status}")
                else:
                    fallback_parts.append(f"• {marker_name}: {value}")
            fallback_parts.append("\nPlease consult with your healthcare provider for a detailed interpretation of these results. This is a basic summary and not a substitute for professional medical advice.")
        else:
            fallback_parts.append("No health markers were found in this report. Please ensure the report contains standard blood test results (Hemoglobin, WBC, Platelets, RBC).")
        
        fallback_explanation = "\n".join(fallback_parts)
        fallback_explanation += "\n\nNote: LLM-powered explanation is not available. Please ensure Ollama is running and the model is accessible."
        
        return {"llm_explanation": fallback_explanation}

def analyze_health_markers(markers: Dict[str, float | None], patient_id: Optional[str] = None, 
                          query: Optional[str] = None) -> Dict[str, Any]:
    """
    Analyzes a given set of health markers based on predefined rules and thresholds.
    Returns a dictionary with analysis results, including a summary and specific observations.
    Also includes an LLM-generated explanation with optional RAG context from historical reports.
    
    Args:
        markers: Dictionary of health markers and their values
        patient_id: Optional patient ID for retrieving historical context via RAG
        query: Optional query string for RAG context retrieval (if None, generated from markers)
    """
    analysis_results = {
        "summary": "No significant anomalies detected.",
        "observations": []
    }

    # Define reference ranges (example values - these should be clinically accurate)
    reference_ranges = {
        "hemoglobin": {"low": 12.0, "normal_min": 12.0, "normal_max": 17.5, "high": 17.5},
        "wbc": {"low": 4.0, "normal_min": 4.0, "normal_max": 11.0, "high": 11.0}, # x10^3/uL
        "platelets": {"low": 150, "normal_min": 150, "normal_max": 450, "high": 450}, # x10^3/uL
        "rbc": {"low": 4.5, "normal_min": 4.5, "normal_max": 5.9, "high": 5.9} # x10^6/uL
    }

    abnormalities_found = False

    for marker, value in markers.items():
        if value is None:
            analysis_results["observations"].append(f"No value found for {marker.replace('_', ' ').capitalize()}.")
            continue

        ranges = reference_ranges.get(marker)
        if not ranges:
            analysis_results["observations"].append(f"No reference range defined for {marker.replace('_', ' ').capitalize()}.")
            continue

        if value < ranges["low"]:
            analysis_results["observations"].append(f"{marker.replace('_', ' ').capitalize()} is Low: {value} (Normal range: {ranges['normal_min']} - {ranges['normal_max']}).")
            abnormalities_found = True
        elif value > ranges["high"]:
            analysis_results["observations"].append(f"{marker.replace('_', ' ').capitalize()} is High: {value} (Normal range: {ranges['normal_min']} - {ranges['normal_max']}).")
            abnormalities_found = True
        else:
            analysis_results["observations"].append(f"{marker.replace('_', ' ').capitalize()} is within Normal range: {value}.")

    if abnormalities_found:
        analysis_results["summary"] = "Potential anomalies detected in one or more health markers. Please consult a doctor."

    # Retrieve historical context using RAG if patient_id is provided
    historical_context = None
    if patient_id:
        try:
            from app.services.vector_store import patient_context as get_patient_context
            
            # Generate query from markers if not provided
            if query is None:
                marker_query_parts = []
                for marker, value in markers.items():
                    if value is not None:
                        marker_query_parts.append(f"{marker.replace('_', ' ')} {value}")
                if marker_query_parts:
                    query = f"Previous reports with {', '.join(marker_query_parts)}"
                else:
                    query = "Previous medical reports and health history"
            
            # Retrieve historical context
            try:
                historical_context = get_patient_context(patient_id=patient_id, query=query, k=config.RAG_TOP_K)
            except Exception as rag_e:
                print(f"Warning: RAG retrieval failed: {rag_e}")
                historical_context = None
            
            if not historical_context:
                # Fallback: try a more general query
                try:
                    historical_context = get_patient_context(
                        patient_id=patient_id, 
                        query="Previous medical reports and test results", 
                        k=config.RAG_TOP_K
                    )
                except Exception as fallback_e:
                    print(f"Warning: Fallback RAG retrieval also failed: {fallback_e}")
                    historical_context = None
        except ImportError as ie:
            # Handle case where vector store is not available
            print(f"Warning: Vector store not available for RAG: {ie}")
            historical_context = None
        except Exception as e:
            # Log error but don't fail analysis if RAG retrieval fails
            print(f"Warning: Failed to retrieve historical context for patient {patient_id}: {e}")
            historical_context = None

    # Generate LLM explanation with historical context
    llm_explanation_data = make_explanation(
        markers, 
        context_text=analysis_results["summary"],
        historical_context=historical_context
    )
    analysis_results.update(llm_explanation_data)

    return analysis_results

def read_report_with_qwen3vl(extracted_text: str, health_markers: Dict[str, Any]) -> Dict[str, Any]:
    """
    Reads and interprets medical reports using qwen3-vl:2b model.
    
    Args:
        extracted_text: The OCR-extracted text from the medical report
        health_markers: Dictionary of health markers and their values
    
    Returns:
        Dictionary with report reading insights and interpretations
    """
    prompt_parts = [
        "You are a medical report analysis AI specialized in reading and interpreting medical reports.",
        "Analyze the following medical report text and provide detailed insights about:",
        "1. Overall health status based on the report",
        "2. Key findings and observations",
        "3. Any abnormalities or areas of concern",
        "4. Recommendations based on the report content",
        "\nMedical Report Text:",
        extracted_text[:3000],  # Limit text length
        "\nHealth Markers Found:",
    ]
    
    marker_details = []
    for marker, value in health_markers.items():
        if value is not None:
            marker_details.append(f"{marker.replace('_', ' ').capitalize()}: {value}")
        else:
            marker_details.append(f"{marker.replace('_', ' ').capitalize()}: Not found")
    
    prompt_parts.append("\n".join(marker_details))
    prompt_parts.append("\nProvide a comprehensive analysis of this medical report:")
    
    full_prompt = "\n".join(prompt_parts)
    
    # Use qwen3-vl:2b for report reading
    model = get_model_for_report_reading()
    analysis_text = call_ollama_llm(full_prompt, model)
    
    if analysis_text:
        return {
            "report_reading_insights": analysis_text,
            "analysis_model": model
        }
    else:
        return {
            "report_reading_insights": "Unable to generate report reading insights. Please ensure Ollama is running and qwen3-vl:2b model is available.",
            "analysis_model": model
        }

def get_medicine_suggestions(health_markers: Dict[str, Any], condition: str = None) -> str:
    """
    Gets allopathic medicine suggestions using medbot model.
    
    Args:
        health_markers: Dictionary of health markers and their values
        condition: Optional specific medical condition to focus on
    
    Returns:
        String with allopathic medicine suggestions
    """
    prompt_parts = [
        "You are a medical AI specialized in providing allopathic medicine suggestions.",
        "Based on the health markers provided, suggest appropriate allopathic medications from a database of 10000+ medications.",
        "Include: medication names, typical dosages, and when they might be appropriate.",
        "Important: These are general suggestions only. Always consult with a qualified healthcare provider before taking any medication.",
        "\nHealth Markers:",
    ]
    
    marker_details = []
    for marker, value in health_markers.items():
        if value is not None:
            marker_details.append(f"{marker.replace('_', ' ').capitalize()}: {value}")
        else:
            marker_details.append(f"{marker.replace('_', ' ').capitalize()}: Not found")
    
    prompt_parts.append("\n".join(marker_details))
    
    if condition:
        prompt_parts.append(f"\nSpecific Condition: {condition}")
    
    prompt_parts.append("\nProvide allopathic medicine suggestions based on these markers:")
    
    full_prompt = "\n".join(prompt_parts)
    
    # Use medbot model for medicine suggestions
    model = get_model_for_medicine()
    suggestions = call_ollama_llm(full_prompt, model)
    
    if suggestions:
        return suggestions
    else:
        return "Unable to generate medicine suggestions. Please ensure Ollama is running and medbot model is available. Always consult with a qualified healthcare provider before taking any medication."

def get_women_health_suggestions(health_markers: Dict[str, Any], context: str = None) -> str:
    """
    Gets women's healthcare suggestions using edi model.
    
    Args:
        health_markers: Dictionary of health markers and their values
        context: Optional additional context about women's health concerns
    
    Returns:
        String with women-specific healthcare suggestions
    """
    prompt_parts = [
        "You are a women's healthcare AI specialized in providing healthcare suggestions for women.",
        "Based on the health markers provided, provide women-specific healthcare suggestions, considerations, and recommendations.",
        "Consider factors like: hormonal health, reproductive health, bone health, cardiovascular health in women, and other women-specific concerns.",
        "Important: These are general suggestions only. Always consult with a qualified healthcare provider for personalized advice.",
        "\nHealth Markers:",
    ]
    
    marker_details = []
    for marker, value in health_markers.items():
        if value is not None:
            marker_details.append(f"{marker.replace('_', ' ').capitalize()}: {value}")
        else:
            marker_details.append(f"{marker.replace('_', ' ').capitalize()}: Not found")
    
    prompt_parts.append("\n".join(marker_details))
    
    if context:
        prompt_parts.append(f"\nAdditional Context: {context}")
    
    prompt_parts.append("\nProvide women-specific healthcare suggestions based on these markers:")
    
    full_prompt = "\n".join(prompt_parts)
    
    # Use edi model for women's health suggestions
    model = get_model_for_women_health()
    suggestions = call_ollama_llm(full_prompt, model)
    
    if suggestions:
        return suggestions
    else:
        return "Unable to generate women's health suggestions. Please ensure Ollama is running and edi model is available. Always consult with a qualified healthcare provider for personalized advice."

if __name__ == '__main__':
    print("--- Testing analyze_health_markers with Ollama LLM explanation ---")

    # Test Case 1: All markers normal
    normal_markers = {"hemoglobin": 14.5, "wbc": 7.0, "platelets": 300.0, "rbc": 5.2}
    print(f"\nAnalyzing normal markers: {normal_markers}")
    normal_analysis = analyze_health_markers(normal_markers)
    print("Analysis Result:")
    for obs in normal_analysis["observations"]:
        print(f"  - {obs}")
    print(f"Summary: {normal_analysis['summary']}")
    print(f"LLM Explanation: {normal_analysis.get('llm_explanation')}")

    # Test Case 2: Low Hemoglobin, High WBC
    abnormal_markers_1 = {"hemoglobin": 11.0, "wbc": 12.5, "platelets": 280.0, "rbc": 5.0}
    print(f"\nAnalyzing abnormal markers (Low Hb, High WBC): {abnormal_markers_1}")
    abnormal_analysis_1 = analyze_health_markers(abnormal_markers_1)
    print("Analysis Result:")
    for obs in abnormal_analysis_1["observations"]:
        print(f"  - {obs}")
    print(f"Summary: {abnormal_analysis_1['summary']}")
    print(f"LLM Explanation: {abnormal_analysis_1.get('llm_explanation')}")

    # Test Case 3: Missing marker value, High Platelets
    abnormal_markers_2 = {"hemoglobin": 13.0, "wbc": None, "platelets": 500.0, "rbc": 4.8}
    print(f"\nAnalyzing abnormal markers (Missing WBC, High Platelets): {abnormal_markers_2}")
    abnormal_analysis_2 = analyze_health_markers(abnormal_markers_2)
    print("Analysis Result:")
    for obs in abnormal_analysis_2["observations"]:
        print(f"  - {obs}")
    print(f"Summary: {abnormal_analysis_2['summary']}")
    print(f"LLM Explanation: {abnormal_analysis_2.get('llm_explanation')}")

    print("\nAll analyze_health_markers test cases completed.")
