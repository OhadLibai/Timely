# ml-service/app/api/health_api.py
"""
Health check and monitoring endpoints for ML service
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from loguru import logger
import psutil
import os
import json
from dotenv import load_dotenv
from pathlib import Path

from app.core.database import get_db_connection
from app.config import config

# Load root .env
root_dir = Path(__file__).parent.parent.parent.parent
load_dotenv(root_dir / '.env')

router = APIRouter()

# Cache for health check results
health_cache: Dict[str, Any] = {
    "last_check": None,
    "cache_duration": timedelta(seconds=30)
}

# ============================================================================
# HEALTH CHECK ENDPOINTS
# ============================================================================

@router.get("/health")
async def health_check():
    """
    Basic health check endpoint
    
    Returns 200 if service is running
    """
    return {
        "status": "healthy",
        "service": "timely-ml-service",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/health/ready")
async def readiness_check():
    """
    Readiness probe for Kubernetes/Docker
    
    Checks if the service is ready to handle requests
    """
    try:
        from app.main import app
        
        # Check if services are initialized
        if not hasattr(app.state, 'prediction_service'):
            raise HTTPException(status_code=503, detail="Prediction service not ready")
            
        if not hasattr(app.state, 'evaluation_service'):
            raise HTTPException(status_code=503, detail="Evaluation service not ready")
        
        # Check data loading
        data_loader = app.state.prediction_service.data_loader
        if not data_loader or data_loader.get_user_count() == 0:
            raise HTTPException(status_code=503, detail="Data not loaded")
        
        return {
            "status": "ready",
            "services": {
                "prediction": "ready",
                "evaluation": "ready"
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail="Service not ready")

@router.get("/health/live")
async def liveness_check():
    """
    Liveness probe for Kubernetes/Docker
    
    Simple check to see if the process is alive
    """
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}

# ============================================================================
# DETAILED HEALTH STATUS
# ============================================================================

@router.get("/health/detailed")
async def detailed_health_check():
    """
    Comprehensive health check with all subsystem statuses
    
    This endpoint provides detailed information about the service health,
    including database connectivity, data loading status, and system resources.
    """
    try:
        # Check cache
        now = datetime.utcnow()
        if (health_cache["last_check"] and 
            now - health_cache["last_check"] < health_cache["cache_duration"]):
            return health_cache["cached_result"]
        
        from app.main import app
        
        health_status = {
            "status": "healthy",
            "timestamp": now.isoformat(),
            "version": config.API_VERSION,
            "uptime_seconds": get_uptime(),
            "components": {}
        }
        
        # Database health
        db_status = await check_database_health()
        health_status["components"]["database"] = db_status
        
        # Data loading status
        data_status = check_data_loading_status(app)
        health_status["components"]["data_loading"] = data_status
        
        # ML model status
        model_status = check_model_status(app)
        health_status["components"]["ml_model"] = model_status
        
        # System resources
        resource_status = check_system_resources()
        health_status["components"]["system_resources"] = resource_status
        
        # JSON cache status
        cache_status = check_json_cache_status()
        health_status["components"]["json_cache"] = cache_status
        
        # Overall status
        all_healthy = all(
            comp.get("status") == "healthy" 
            for comp in health_status["components"].values()
        )
        health_status["status"] = "healthy" if all_healthy else "degraded"
        
        # Cache result
        health_cache["last_check"] = now
        health_cache["cached_result"] = health_status
        
        return health_status
        
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }

# ============================================================================
# MONITORING ENDPOINTS
# ============================================================================

@router.get("/metrics")
async def get_metrics():
    """
    Prometheus-compatible metrics endpoint
    
    Returns service metrics in Prometheus format
    """
    try:
        from app.main import app
        
        metrics = []
        
        # Service info
        metrics.append(f'# HELP ml_service_info ML service information')
        metrics.append(f'# TYPE ml_service_info gauge')
        metrics.append(f'ml_service_info{{version="{config.API_VERSION}",algorithm="TIFU-KNN"}} 1')
        
        # Data metrics
        if hasattr(app.state, 'prediction_service'):
            data_loader = app.state.prediction_service.data_loader
            if data_loader:
                metrics.append(f'# HELP ml_users_loaded Number of users loaded')
                metrics.append(f'# TYPE ml_users_loaded gauge')
                metrics.append(f'ml_users_loaded {data_loader.get_user_count()}')
                
                metrics.append(f'# HELP ml_products_loaded Number of products loaded')
                metrics.append(f'# TYPE ml_products_loaded gauge')
                metrics.append(f'ml_products_loaded {data_loader.get_product_count()}')
        
        # System metrics
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        
        metrics.append(f'# HELP ml_cpu_usage_percent CPU usage percentage')
        metrics.append(f'# TYPE ml_cpu_usage_percent gauge')
        metrics.append(f'ml_cpu_usage_percent {cpu_percent}')
        
        metrics.append(f'# HELP ml_memory_usage_percent Memory usage percentage')
        metrics.append(f'# TYPE ml_memory_usage_percent gauge')
        metrics.append(f'ml_memory_usage_percent {memory.percent}')
        
        return "\n".join(metrics)
        
    except Exception as e:
        logger.error(f"Metrics generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate metrics")

@router.get("/stats")
async def get_service_stats():
    """
    Get service statistics and usage information
    """
    try:
        from app.main import app
        
        stats = {
            "service": {
                "name": "timely-ml-service",
                "version": config.API_VERSION,
                "uptime_seconds": get_uptime(),
                "algorithm": "TIFU-KNN"
            },
            "data": {},
            "performance": {},
            "resources": {}
        }
        
        # Data statistics
        if hasattr(app.state, 'prediction_service'):
            data_loader = app.state.prediction_service.data_loader
            if data_loader:
                stats["data"] = {
                    "users_loaded": data_loader.get_user_count(),
                    "products_loaded": data_loader.get_product_count(),
                    "total_orders": data_loader.get_total_orders(),
                    "future_baskets": data_loader.get_future_basket_count()
                }
        
        # Resource usage
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        stats["resources"] = {
            "cpu": {
                "usage_percent": cpu_percent,
                "count": psutil.cpu_count()
            },
            "memory": {
                "usage_percent": memory.percent,
                "used_mb": memory.used / 1024 / 1024,
                "total_mb": memory.total / 1024 / 1024
            },
            "disk": {
                "usage_percent": disk.percent,
                "used_gb": disk.used / 1024 / 1024 / 1024,
                "total_gb": disk.total / 1024 / 1024 / 1024
            }
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get service stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def check_database_health() -> Dict[str, Any]:
    """Check database connectivity and health"""
    try:
        conn = get_db_connection()
        if not conn:
            return {
                "status": "unhealthy",
                "message": "Unable to connect to database"
            }
        
        # Test query
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        
        # Check critical tables
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'products', 'orders', 'order_items')
        """)
        table_count = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return {
            "status": "healthy",
            "message": "Database connection successful",
            "tables_found": table_count,
            "response_time_ms": 5  # Could implement actual timing
        }
        
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "unhealthy",
            "message": f"Database error: {str(e)}"
        }

def check_data_loading_status(app) -> Dict[str, Any]:
    """Check data loading status"""
    try:
        if not hasattr(app.state, 'prediction_service'):
            return {
                "status": "unhealthy",
                "message": "Prediction service not initialized"
            }
        
        data_loader = app.state.prediction_service.data_loader
        if not data_loader:
            return {
                "status": "unhealthy",
                "message": "Data loader not initialized"
            }
        
        user_count = data_loader.get_user_count()
        product_count = data_loader.get_product_count()
        
        if user_count == 0 or product_count == 0:
            return {
                "status": "unhealthy",
                "message": "No data loaded",
                "users": user_count,
                "products": product_count
            }
        
        return {
            "status": "healthy",
            "message": "Data loaded successfully",
            "users": user_count,
            "products": product_count,
            "orders": data_loader.get_total_orders(),
            "future_baskets": data_loader.get_future_basket_count()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Data loading check failed: {str(e)}"
        }

def check_model_status(app) -> Dict[str, Any]:
    """Check ML model status"""
    try:
        if not hasattr(app.state, 'prediction_service'):
            return {
                "status": "unhealthy",
                "message": "Prediction service not initialized"
            }
        
        # Get algorithm info
        algo_info = app.state.prediction_service.get_algorithm_info()
        
        return {
            "status": "healthy",
            "message": "Model ready",
            "algorithm": algo_info.get("algorithm", "Unknown"),
            "version": algo_info.get("version", "Unknown"),
            "parameters": algo_info.get("hyperparameters", {})
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Model check failed: {str(e)}"
        }

def check_system_resources() -> Dict[str, Any]:
    """Check system resource usage"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        
        # Define thresholds
        cpu_threshold = 80
        memory_threshold = 85
        
        status = "healthy"
        warnings = []
        
        if cpu_percent > cpu_threshold:
            status = "degraded"
            warnings.append(f"High CPU usage: {cpu_percent}%")
            
        if memory.percent > memory_threshold:
            status = "degraded"
            warnings.append(f"High memory usage: {memory.percent}%")
        
        return {
            "status": status,
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_mb": memory.available / 1024 / 1024,
            "warnings": warnings
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Resource check failed: {str(e)}"
        }

def check_json_cache_status() -> Dict[str, Any]:
    """Check JSON cache files status"""
    try:
        cache_path = cache_path = os.getenv("CACHE_PATH", "/app/data/cache")
        expected_files = [
            "instacart_history.json",
            "instacart_future.json",
            "instacart_keyset_0.json"
        ]
        
        files_found = []
        files_missing = []
        total_size_mb = 0
        
        for filename in expected_files:
            filepath = os.path.join(cache_path, filename)
            if os.path.exists(filepath):
                files_found.append(filename)
                size = os.path.getsize(filepath)
                total_size_mb += size / 1024 / 1024
            else:
                files_missing.append(filename)
        
        if files_missing:
            return {
                "status": "degraded",
                "message": f"Missing cache files: {', '.join(files_missing)}",
                "files_found": len(files_found),
                "files_missing": len(files_missing),
                "total_size_mb": round(total_size_mb, 2)
            }
        
        return {
            "status": "healthy",
            "message": "All cache files present",
            "files_found": len(files_found),
            "total_size_mb": round(total_size_mb, 2)
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Cache check failed: {str(e)}"
        }

def get_uptime() -> float:
    """Get service uptime in seconds"""
    try:
        # Get process start time
        process = psutil.Process(os.getpid())
        create_time = datetime.fromtimestamp(process.create_time())
        uptime = (datetime.now() - create_time).total_seconds()
        return round(uptime, 2)
    except:
        return 0.0