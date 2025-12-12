"""Load CSV data into Supabase database."""
import sys
import csv
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.supabase_client import SupabaseService


def load_csv_data(csv_path: str):
    """Load attack data from CSV file."""
    print(f"Loading data from {csv_path}...")
    
    supabase = SupabaseService()
    attacks = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            try:
                # Parse the date
                date_str = row['date']
                attack_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                
                # Parse loss amount
                loss_amount = float(row['loss_amount_usd'])
                
                # Extract blockchain from chain column
                blockchain = row['chain']
                
                # Create attack record
                attack = {
                    'protocol_name': row['protocol'],
                    'attack_date': attack_date.isoformat(),
                    'attack_type': row['attack_type'],
                    'loss_amount_usd': loss_amount,
                    'description': f"{row['attack_type']} on {row['protocol']}",
                    'source_url': row['source_links'].split(',')[0].strip() if row['source_links'] else None,
                    'blockchain': blockchain,
                    'data_source': 'csv_import',
                    'updated_at': datetime.now().isoformat()
                }
                
                attacks.append(attack)
                
            except Exception as e:
                print(f"Error parsing row: {e}")
                continue
    
    print(f"Parsed {len(attacks)} attacks from CSV")
    
    # Insert into database
    if attacks:
        print("Inserting into database...")
        import asyncio
        result = asyncio.run(supabase.insert_attacks(attacks))
        
        if result['success']:
            print(f"✓ Successfully inserted {result['records_inserted']} records")
            
            # Log the refresh
            asyncio.run(supabase.log_refresh(
                status='completed',
                records_fetched=len(attacks),
                records_inserted=result['records_inserted']
            ))
        else:
            print(f"✗ Insert failed: {result.get('error')}")
    else:
        print("No attacks to insert")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python load_csv_data.py <path_to_csv_file>")
        print("Example: python load_csv_data.py ~/Downloads/data_rows.csv")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    load_csv_data(csv_file)

