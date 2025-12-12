"""Manual script to trigger data refresh."""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.supabase_client import SupabaseService
from app.services.data_fetcher import DataFetcherService
from app.services.data_processor import DataProcessorService


async def main():
    """Run manual data refresh."""
    print("Starting manual data refresh...")
    
    # Initialize services
    supabase = SupabaseService()
    fetcher = DataFetcherService()
    processor = DataProcessorService()
    
    try:
        # Log start
        print("Logging refresh start...")
        await supabase.log_refresh(status="running")
        
        # Fetch data
        print("Fetching data from sources...")
        raw_data = await fetcher.fetch_all_sources()
        print(f"Fetched {len(raw_data)} raw records")
        
        if not raw_data:
            print("No data fetched. Exiting...")
            await supabase.log_refresh(
                status="failed",
                error_message="No data fetched"
            )
            return
        
        # Clean data
        print("Cleaning data...")
        cleaned_data = processor.clean_data(raw_data)
        print(f"Cleaned to {len(cleaned_data)} records")
        
        # Prepare for insertion
        print("Preparing data for insertion...")
        prepared_data = processor.prepare_for_insert(cleaned_data)
        
        # Insert
        print("Inserting into database...")
        result = await supabase.insert_attacks(prepared_data)
        
        if result["success"]:
            print(f"✓ Successfully inserted {result['records_inserted']} records")
            await supabase.log_refresh(
                status="completed",
                records_fetched=len(raw_data),
                records_inserted=result["records_inserted"]
            )
        else:
            print(f"✗ Insert failed: {result.get('error')}")
            await supabase.log_refresh(
                status="failed",
                records_fetched=len(raw_data),
                error_message=result.get("error")
            )
    
    except Exception as e:
        print(f"✗ Error: {e}")
        await supabase.log_refresh(
            status="failed",
            error_message=str(e)
        )


if __name__ == "__main__":
    asyncio.run(main())

