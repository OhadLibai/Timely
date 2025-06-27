# ml-service/app/api/evaluation_api.py
"""
Model evaluation API endpoints for TIFU-KNN performance metrics
"""

import os
from dotenv import load_dotenv
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import Optional, Dict, Any
from datetime import datetime
from loguru import logger
import asyncio
import uuid

from app.models.schemas import (
    EvaluationRequest,
    EvaluationResponse,
    EvaluationStatus,
    MetricsVisualization
)
from app.services.evaluation import EvaluationService
from app.core.database import get_db_connection

# Load root .env
root_dir = Path(__file__).parent.parent.parent.parent
load_dotenv(root_dir / '.env')

router = APIRouter()

# Store for async evaluation jobs
evaluation_jobs: Dict[str, Dict[str, Any]] = {}

def get_evaluation_service() -> EvaluationService:
    """Dependency to get evaluation service from app state"""
    from app.main import app
    if not hasattr(app.state, 'evaluation_service'):
        raise HTTPException(status_code=503, detail="Evaluation service not initialized")
    return app.state.evaluation_service

# ============================================================================
# MODEL EVALUATION ENDPOINTS
# ============================================================================

@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_model(
    request: Optional[EvaluationRequest] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    service: EvaluationService = Depends(get_evaluation_service)
):
    """
    Evaluate TIFU-KNN model performance (Demand #2)
    
    This endpoint runs a comprehensive evaluation on the Instacart dataset,
    calculating metrics like Recall@20, Precision@20, F1@20, and Hit Rate.
    
    For large evaluations, it runs in the background and returns a job ID.
    """
    try:
        # Default sample size from request or environment
        sample_size = None
        if request and request.sample_size:
            sample_size = request.sample_size
        else:
            sample_size = int(os.getenv("EVALUATION_SAMPLE_SIZE", "100"))
            
        logger.info(f"Starting model evaluation with sample_size={sample_size or 'all'}")
        
        # For small samples, run synchronously
        if sample_size and sample_size <= 100:
            metrics = await service.evaluate_model(sample_size=sample_size)
            
            return EvaluationResponse(
                evaluation_id=str(uuid.uuid4()),
                status="completed",
                metrics=metrics['metrics'],
                detailed_metrics=metrics.get('detailed_metrics', {}),
                sample_size=sample_size,
                users_evaluated=metrics['users_evaluated'],
                evaluation_time=metrics['evaluation_time'],
                timestamp=datetime.utcnow(),
                model_info={
                    "algorithm": "TIFU-KNN",
                    "version": "1.0",
                    "parameters": metrics.get('parameters', {})
                }
            )
        
        # For large evaluations, run in background
        job_id = str(uuid.uuid4())
        evaluation_jobs[job_id] = {
            "status": "running",
            "started_at": datetime.utcnow(),
            "sample_size": sample_size
        }
        
        # Start background task
        background_tasks.add_task(
            run_evaluation_async,
            job_id,
            service,
            sample_size
        )
        
        return EvaluationResponse(
            evaluation_id=job_id,
            status="running",
            metrics={},
            sample_size=sample_size or "all",
            users_evaluated=0,
            evaluation_time=0,
            timestamp=datetime.utcnow(),
            message="Evaluation started. Use GET /evaluate/{job_id} to check status."
        )
        
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@router.get("/evaluate/{job_id}", response_model=EvaluationResponse)
async def get_evaluation_status(
    job_id: str,
    service: EvaluationService = Depends(get_evaluation_service)
):
    """Check status of a running evaluation job"""
    if job_id not in evaluation_jobs:
        # Try to fetch from database if implemented
        stored_result = await service.get_stored_evaluation(job_id)
        if stored_result:
            return EvaluationResponse(**stored_result)
        raise HTTPException(status_code=404, detail="Evaluation job not found")
    
    job = evaluation_jobs[job_id]
    
    if job["status"] == "running":
        elapsed = (datetime.utcnow() - job["started_at"]).total_seconds()
        return EvaluationResponse(
            evaluation_id=job_id,
            status="running",
            metrics={},
            sample_size=job["sample_size"] or "all",
            users_evaluated=0,
            evaluation_time=elapsed,
            timestamp=job["started_at"],
            message=f"Evaluation in progress... ({elapsed:.0f}s elapsed)"
        )
    
    return EvaluationResponse(**job["result"])

@router.post("/evaluate/quick")
async def quick_evaluation(
    user_count: int = Query(10, ge=1, le=100),
    service: EvaluationService = Depends(get_evaluation_service)
):
    """
    Run a quick evaluation on a small sample for testing
    
    This is useful for demos and quick sanity checks.
    """
    try:
        logger.info(f"Running quick evaluation on {user_count} users")
        
        metrics = await service.evaluate_model(sample_size=user_count)
        
        # Simplified response for quick checks
        return {
            "recall_at_20": round(metrics['metrics'].get('recall@20', 0), 3),
            "precision_at_20": round(metrics['metrics'].get('precision@20', 0), 3),
            "hit_rate": round(metrics['metrics'].get('hit_rate@20', 0), 3),
            "users_evaluated": user_count,
            "evaluation_time_seconds": round(metrics['evaluation_time'], 2),
            "summary": f"Model correctly predicted {metrics['metrics'].get('hit_rate@20', 0)*100:.1f}% of users' next baskets"
        }
        
    except Exception as e:
        logger.error(f"Quick evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# METRICS VISUALIZATION ENDPOINTS
# ============================================================================

@router.get("/metrics/visualization", response_model=MetricsVisualization)
async def get_metrics_for_visualization(
    metric_type: str = Query("overview", enum=["overview", "detailed", "comparison"]),
    service: EvaluationService = Depends(get_evaluation_service)
):
    """
    Get evaluation metrics formatted for visualization
    
    This endpoint provides data optimized for creating charts
    in the admin dashboard.
    """
    try:
        # Get latest evaluation results
        latest_metrics = await service.get_latest_evaluation_metrics()
        
        if not latest_metrics:
            raise HTTPException(
                status_code=404,
                detail="No evaluation results available. Run an evaluation first."
            )
        
        if metric_type == "overview":
            # Format for bar chart
            return MetricsVisualization(
                chart_type="bar",
                title="TIFU-KNN Model Performance",
                data={
                    "labels": ["Recall@20", "Precision@20", "F1@20", "Hit Rate"],
                    "values": [
                        latest_metrics.get('recall@20', 0) * 100,
                        latest_metrics.get('precision@20', 0) * 100,
                        latest_metrics.get('f1@20', 0) * 100,
                        latest_metrics.get('hit_rate@20', 0) * 100
                    ]
                },
                options={
                    "y_axis": {"min": 0, "max": 100, "label": "Percentage (%)"},
                    "colors": ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B"]
                }
            )
            
        elif metric_type == "detailed":
            # Format for multi-metric visualization
            return MetricsVisualization(
                chart_type="radar",
                title="Detailed Performance Metrics",
                data={
                    "metrics": {
                        "Recall": latest_metrics.get('recall@20', 0),
                        "Precision": latest_metrics.get('precision@20', 0),
                        "F1-Score": latest_metrics.get('f1@20', 0),
                        "Coverage": latest_metrics.get('coverage', 0),
                        "Diversity": latest_metrics.get('diversity', 0),
                        "Novelty": latest_metrics.get('novelty', 0)
                    }
                }
            )
            
        else:  # comparison
            # Compare with baseline
            return MetricsVisualization(
                chart_type="grouped_bar",
                title="TIFU-KNN vs Baseline Performance",
                data={
                    "categories": ["Recall@20", "Precision@20", "Hit Rate"],
                    "series": [
                        {
                            "name": "TIFU-KNN",
                            "values": [
                                latest_metrics.get('recall@20', 0) * 100,
                                latest_metrics.get('precision@20', 0) * 100,
                                latest_metrics.get('hit_rate@20', 0) * 100
                            ]
                        },
                        {
                            "name": "Frequency Baseline",
                            "values": [15.2, 8.5, 45.3]  # Example baseline values
                        }
                    ]
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error preparing visualization data: {e}")
        raise HTTPException(status_code=500, detail="Failed to prepare visualization")

# ============================================================================
# PERFORMANCE ANALYSIS ENDPOINTS
# ============================================================================

@router.get("/metrics/by-user-segment")
async def get_metrics_by_user_segment(
    service: EvaluationService = Depends(get_evaluation_service)
):
    """
    Get evaluation metrics broken down by user segments
    
    This helps understand where the model performs well or poorly.
    """
    try:
        segments = await service.analyze_performance_by_segment()
        
        return {
            "segments": segments,
            "insights": {
                "best_performing": max(segments, key=lambda x: x['recall']),
                "worst_performing": min(segments, key=lambda x: x['recall']),
                "most_users": max(segments, key=lambda x: x['user_count'])
            }
        }
        
    except Exception as e:
        logger.error(f"Segment analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze segments")

@router.get("/metrics/confidence-calibration")
async def get_confidence_calibration(
    service: EvaluationService = Depends(get_evaluation_service)
):
    """
    Analyze how well calibrated the confidence scores are
    
    This shows if high confidence predictions are actually more accurate.
    """
    try:
        calibration = await service.analyze_confidence_calibration()
        
        return {
            "calibration_data": calibration,
            "is_well_calibrated": calibration.get('calibration_score', 0) > 0.8,
            "interpretation": "Higher confidence predictions should have higher accuracy"
        }
        
    except Exception as e:
        logger.error(f"Calibration analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze calibration")

# ============================================================================
# HISTORICAL METRICS ENDPOINTS
# ============================================================================

@router.get("/metrics/history")
async def get_evaluation_history(
    limit: int = Query(10, ge=1, le=100),
    service: EvaluationService = Depends(get_evaluation_service)
):
    """Get history of evaluation runs"""
    try:
        history = await service.get_evaluation_history(limit)
        
        return {
            "evaluations": history,
            "total_count": len(history),
            "latest": history[0] if history else None
        }
        
    except Exception as e:
        logger.error(f"Failed to get evaluation history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve history")

@router.delete("/metrics/history")
async def clear_evaluation_history(
    service: EvaluationService = Depends(get_evaluation_service)
):
    """Clear evaluation history"""
    try:
        await service.clear_history()
        return {"message": "Evaluation history cleared successfully"}
        
    except Exception as e:
        logger.error(f"Failed to clear history: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear history")

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def run_evaluation_async(job_id: str, service: EvaluationService, sample_size: Optional[int]):
    """Run evaluation in background"""
    try:
        logger.info(f"Starting async evaluation job {job_id}")
        
        # Run evaluation
        metrics = await service.evaluate_model(sample_size=sample_size)
        
        # Store result
        evaluation_jobs[job_id] = {
            "status": "completed",
            "result": {
                "evaluation_id": job_id,
                "status": "completed",
                "metrics": metrics['metrics'],
                "detailed_metrics": metrics.get('detailed_metrics', {}),
                "sample_size": sample_size or "all",
                "users_evaluated": metrics['users_evaluated'],
                "evaluation_time": metrics['evaluation_time'],
                "timestamp": datetime.utcnow(),
                "model_info": {
                    "algorithm": "TIFU-KNN",
                    "version": "1.0",
                    "parameters": metrics.get('parameters', {})
                }
            }
        }
        
        # Optionally store in database
        await service.store_evaluation_result(job_id, evaluation_jobs[job_id]["result"])
        
        logger.info(f"Evaluation job {job_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Evaluation job {job_id} failed: {e}")
        evaluation_jobs[job_id] = {
            "status": "failed",
            "error": str(e)
        }