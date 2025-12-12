"""Attack endpoints router."""
from fastapi import APIRouter, Query, HTTPException, Header
from fastapi.responses import StreamingResponse
from typing import Optional
import io
from ..models.schemas import (
    AttackResponse,
    SummaryStats,
    TimelineResponse,
    ProtocolBreakdownResponse,
    AttackTypeBreakdownResponse,
    TopAttacksResponse,
    RefreshResponse,
    RefreshStatusResponse
)
from ..services.supabase_client import SupabaseService
from ..services.data_fetcher import DataFetcherService
from ..services.data_processor import DataProcessorService
from ..utils.helpers import generate_csv
from ..config import settings

router = APIRouter(prefix="/attacks", tags=["attacks"])

# Initialize services
supabase_service = SupabaseService()
data_fetcher = DataFetcherService()
data_processor = DataProcessorService()


@router.get("", response_model=AttackResponse)
async def get_attacks(
    limit: int = Query(1000, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    protocol: Optional[str] = None,
    attack_type: Optional[str] = None
):
    """Get all attacks with optional filters."""
    result = await supabase_service.get_attacks(
        limit=limit,
        offset=offset,
        start_date=start_date,
        end_date=end_date,
        protocol=protocol,
        attack_type=attack_type
    )
    return result


@router.get("/summary", response_model=SummaryStats)
async def get_summary():
    """Get summary statistics."""
    stats = await supabase_service.get_summary_stats()
    return stats


@router.get("/timeline", response_model=TimelineResponse)
async def get_timeline(
    granularity: str = Query("month", regex="^(day|week|month)$"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get timeline data grouped by period."""
    timeline = await supabase_service.get_timeline_data(
        granularity=granularity,
        start_date=start_date,
        end_date=end_date
    )
    return {"timeline": timeline}


@router.get("/by-protocol", response_model=ProtocolBreakdownResponse)
async def get_protocol_breakdown():
    """Get protocol breakdown statistics."""
    protocols = await supabase_service.get_protocol_breakdown()
    return {"protocols": protocols}


@router.get("/by-type", response_model=AttackTypeBreakdownResponse)
async def get_attack_type_breakdown():
    """Get attack type breakdown statistics."""
    attack_types = await supabase_service.get_attack_type_breakdown()
    return {"attack_types": attack_types}


@router.get("/top", response_model=TopAttacksResponse)
async def get_top_attacks(limit: int = Query(10, ge=1, le=100)):
    """Get top attacks by loss amount."""
    top_attacks = await supabase_service.get_top_attacks(limit=limit)
    return {"top_attacks": top_attacks}


@router.get("/export")
async def export_attacks(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    protocol: Optional[str] = None,
    attack_type: Optional[str] = None
):
    """Export attacks to CSV."""
    result = await supabase_service.get_attacks(
        limit=10000,
        start_date=start_date,
        end_date=end_date,
        protocol=protocol,
        attack_type=attack_type
    )
    
    if not result["data"]:
        raise HTTPException(status_code=404, detail="No data found")
    
    # Generate CSV
    csv_content = generate_csv(result["data"])
    
    # Return as streaming response
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=crypto_attacks.csv"}
    )


@router.post("/refresh", response_model=RefreshResponse)
async def trigger_refresh(x_service_key: Optional[str] = Header(None)):
    """Trigger manual data refresh."""
    # Validate service key
    if x_service_key != settings.SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=403, detail="Invalid service key")
    
    try:
        # Log refresh start
        log = await supabase_service.log_refresh(status="running")
        
        # Fetch data from all sources
        raw_data = await data_fetcher.fetch_all_sources()
        
        if not raw_data:
            await supabase_service.log_refresh(
                status="failed",
                error_message="No data fetched from sources"
            )
            raise HTTPException(status_code=500, detail="Failed to fetch data")
        
        # Clean and process data
        cleaned_data = data_processor.clean_data(raw_data)
        
        # Prepare for insertion
        prepared_data = data_processor.prepare_for_insert(cleaned_data)
        
        # Insert into database
        result = await supabase_service.insert_attacks(prepared_data)
        
        # Log completion
        await supabase_service.log_refresh(
            status="completed",
            records_fetched=len(raw_data),
            records_inserted=result["records_inserted"]
        )
        
        return {
            "status": "completed",
            "message": f"Successfully refreshed {result['records_inserted']} records",
            "job_id": log.get("id")
        }
    
    except Exception as e:
        await supabase_service.log_refresh(
            status="failed",
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Refresh failed: {str(e)}")


@router.get("/refresh/status", response_model=RefreshStatusResponse)
async def get_refresh_status():
    """Get the status of the last refresh operation."""
    status = await supabase_service.get_last_refresh_status()
    
    # Calculate next scheduled refresh (48 hours from last)
    if status.get("last_refresh"):
        from datetime import datetime, timedelta
        last_refresh = datetime.fromisoformat(status["last_refresh"])
        next_refresh = last_refresh + timedelta(hours=48)
        status["next_scheduled_refresh"] = next_refresh.isoformat()
    
    return status

