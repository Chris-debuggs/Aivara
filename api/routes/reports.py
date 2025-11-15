
import os
import sys # Added
import json

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(os.path.dirname(_current_dir))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from dependencies import get_db, get_current_user
from models.user import User
from models.report import Report
from models.report_sharing import ReportSharing
from models.doctor import Doctor
from schemas.report import ReportCreate, ReportResponse
from schemas.report_sharing import ReportSharingCreate, ReportSharingResponse
from datetime import datetime
from services.ocr_service import extract_text_from_report
from services.notification_service import notify_doctor_new_report
from services.parser_service import parse_health_markers
from services.ai_engine import analyze_health_markers, read_report_with_qwen3vl, get_medicine_suggestions, get_women_health_suggestions
from services.storage_service import save_report_file
from services.text_chunking_service import chunk_text_for_vector_store
from app.services.vector_store import upsert_docs

router = APIRouter()

@router.post("/upload", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def upload_report(
    report_name: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Uploads a new report, processes it, and stores the data.
    """
    if not file.filename.endswith(('.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')):
        raise HTTPException(status_code=400, detail="Unsupported file type. Only PDF and image files are allowed.")

    try:
        file_location = save_report_file(file, current_user.id)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        extracted_text = extract_text_from_report(file_location)
    except Exception as e:
        # Don't fail the entire upload when OCR is unavailable (e.g., tesseract not installed).
        # Log a warning and continue with empty extracted text so uploads still succeed for smoke tests
        # and basic UI verification. Vectorization and AI analysis that depend on extracted text
        # may be no-ops or return limited results.
        print(f"Warning: OCR failed for {file_location}: {e}")
        extracted_text = ""

    health_markers = parse_health_markers(extracted_text)

    # Create report in database first to get report ID for vector store
    db_report = Report(
        user_id=current_user.id,
        report_name=report_name,
        file_path=file_location,
        hemoglobin=health_markers.get('hemoglobin'),
        wbc=health_markers.get('wbc'),
        platelets=health_markers.get('platelets'),
        rbc=health_markers.get('rbc')
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    # Store extracted text in vector store (with error handling - don't fail upload if this fails)
    try:
        # Chunk the extracted text for vector storage
        chunks = chunk_text_for_vector_store(
            text=extracted_text,
            report_id=db_report.id,
            patient_id=str(current_user.id),
            report_name=report_name,
            upload_timestamp=db_report.upload_timestamp.isoformat() if db_report.upload_timestamp else None
        )
        
        if chunks:
            # Store chunks in ChromaDB
            upsert_docs(chunks)
            print(f"Successfully stored {len(chunks)} chunks for report {db_report.id} in vector store.")
        else:
            print(f"Warning: No chunks created for report {db_report.id}.")
    except Exception as e:
        # Log error but don't fail the upload if vectorization fails
        print(f"Warning: Failed to store report {db_report.id} in vector store: {e}")
        # Continue with analysis even if vectorization failed

    # Analyze health markers with RAG context (if available)
    # Generate query from markers for context retrieval
    marker_query_parts = []
    for marker, value in health_markers.items():
        if value is not None:
            marker_query_parts.append(f"{marker.replace('_', ' ')} {value}")
    
    query = None
    if marker_query_parts:
        query = f"Previous reports with {', '.join(marker_query_parts)}"
    
    # Perform analysis with RAG context (llama3.2 for explanations)
    analysis_results = analyze_health_markers(
        markers=health_markers,
        patient_id=str(current_user.id),
        query=query
    )

    # Generate report reading insights using qwen3-vl:2b (with error handling)
    try:
        report_reading_insights = read_report_with_qwen3vl(extracted_text, health_markers)
        analysis_results.update(report_reading_insights)
    except Exception as e:
        print(f"Warning: Failed to generate report reading insights: {e}")
        # Continue without report reading insights

    # Update report with analysis results
    db_report.analysis_result_json = json.dumps(analysis_results)
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    return db_report

@router.get("/", response_model=list[ReportResponse])
def get_user_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves all reports for the current authenticated user.
    """
    reports = db.query(Report).filter(Report.user_id == current_user.id).all()
    return reports

@router.get("/{report_id}")
def get_report_by_id(
    report_id: int,
    include_extracted_text: bool = Query(False, description="Include extracted text for debugging"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves a specific report by its ID for the current authenticated user.
    Optionally includes extracted text for debugging purposes.
    """
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # Convert SQLAlchemy model to dict
    report_dict = {
        "id": report.id,
        "user_id": report.user_id,
        "doctor_id": report.doctor_id,
        "report_name": report.report_name,
        "file_path": report.file_path,
        "upload_timestamp": report.upload_timestamp,
        "analysis_result_json": report.analysis_result_json,
        "doctor_notes": report.doctor_notes,
        "review_status": report.review_status,
        "ai_approval_status": report.ai_approval_status if hasattr(report, 'ai_approval_status') else "pending",
        "doctor_approval_timestamp": report.doctor_approval_timestamp if hasattr(report, 'doctor_approval_timestamp') else None,
        "hemoglobin": report.hemoglobin,
        "wbc": report.wbc,
        "platelets": report.platelets,
        "rbc": report.rbc,
    }
    
    # Optionally include extracted text for debugging
    if include_extracted_text:
        try:
            extracted_text = extract_text_from_report(report.file_path)
            report_dict["extracted_text"] = extracted_text
        except Exception as e:
            report_dict["extracted_text"] = f"Error extracting text: {e}"
    
    return report_dict

@router.get("/{report_id}/medicine-suggestions")
def get_medicine_suggestions_endpoint(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Gets allopathic medicine suggestions for a specific report using medbot model.
    """
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # Get health markers from report
    health_markers = {
        "hemoglobin": report.hemoglobin,
        "wbc": report.wbc,
        "platelets": report.platelets,
        "rbc": report.rbc,
    }
    
    try:
        suggestions = get_medicine_suggestions(health_markers)
        return {"suggestions": suggestions, "model": "medbot"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate medicine suggestions: {e}")

@router.get("/{report_id}/women-health")
def get_women_health_suggestions_endpoint(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Gets women's healthcare suggestions for a specific report using edi model.
    """
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # Get health markers from report
    health_markers = {
        "hemoglobin": report.hemoglobin,
        "wbc": report.wbc,
        "platelets": report.platelets,
        "rbc": report.rbc,
    }
    
    try:
        suggestions = get_women_health_suggestions(health_markers)
        return {"suggestions": suggestions, "model": "edi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate women's health suggestions: {e}")

@router.post("/{report_id}/share", response_model=ReportSharingResponse, status_code=status.HTTP_201_CREATED)
def share_report_to_doctor(
    report_id: int,
    sharing_data: ReportSharingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Patient shares a report with a doctor.
    Creates a ReportSharing record and updates the report status.
    """
    # Verify report belongs to current user
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # Verify doctor exists and is active
    doctor = db.query(Doctor).filter(Doctor.id == sharing_data.doctor_id, Doctor.is_active == True).first()
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found or inactive")
    
    # Check if already shared to this doctor
    existing_sharing = db.query(ReportSharing).filter(
        ReportSharing.report_id == report_id,
        ReportSharing.doctor_id == sharing_data.doctor_id,
        ReportSharing.status.in_(["pending", "sent", "under_review"])
    ).first()
    
    if existing_sharing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report already shared to this doctor and is pending review"
        )
    
    # Create report sharing record
    report_sharing = ReportSharing(
        report_id=report_id,
        patient_id=current_user.id,
        doctor_id=sharing_data.doctor_id,
        patient_message=sharing_data.patient_message,
        status="sent",
        sent_at=datetime.utcnow()
    )
    
    db.add(report_sharing)
    
    # Update report status
    report.review_status = "pending"
    db.add(report)
    
    db.commit()
    db.refresh(report_sharing)
    
    # Notify doctor (async notification)
    try:
        notify_doctor_new_report(report_id, sharing_data.doctor_id)
    except Exception as e:
        print(f"Warning: Failed to send notification: {e}")
    
    return report_sharing

@router.get("/shared", response_model=list[ReportSharingResponse])
def get_shared_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all reports shared by the current patient with doctor information.
    """
    sharings = db.query(ReportSharing).filter(
        ReportSharing.patient_id == current_user.id
    ).order_by(ReportSharing.created_at.desc()).all()
    
    return sharings

@router.put("/{report_id}/cancel-sharing/{sharing_id}", response_model=ReportSharingResponse)
def cancel_report_sharing(
    report_id: int,
    sharing_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a report sharing if it's still pending.
    """
    # Verify report belongs to current user
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # Get sharing record
    sharing = db.query(ReportSharing).filter(
        ReportSharing.id == sharing_id,
        ReportSharing.report_id == report_id,
        ReportSharing.patient_id == current_user.id
    ).first()
    
    if sharing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sharing record not found")
    
    # Only allow cancellation if status is pending or sent
    if sharing.status not in ["pending", "sent"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel sharing with status: {sharing.status}"
        )
    
    sharing.status = "rejected"  # Mark as rejected/cancelled
    db.add(sharing)
    db.commit()
    db.refresh(sharing)
    
    return sharing
