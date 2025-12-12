"""Utility helper functions."""
from typing import Any, Optional
from datetime import datetime, date
import csv
import io


def format_currency(amount: float) -> str:
    """Format currency with appropriate suffix (K, M, B)."""
    if amount >= 1_000_000_000:
        return f"${amount / 1_000_000_000:.2f}B"
    elif amount >= 1_000_000:
        return f"${amount / 1_000_000:.2f}M"
    elif amount >= 1_000:
        return f"${amount / 1_000:.2f}K"
    else:
        return f"${amount:.2f}"


def parse_date(date_str: str) -> Optional[date]:
    """Parse date string to date object."""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except:
        return None


def generate_csv(data: list[dict[str, Any]]) -> str:
    """Generate CSV string from list of dictionaries."""
    if not data:
        return ""
    
    output = io.StringIO()
    
    # Get fieldnames from first row
    fieldnames = list(data[0].keys())
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(data)
    
    return output.getvalue()


def validate_service_key(key: str, expected_key: str) -> bool:
    """Validate service key for protected endpoints."""
    return key == expected_key


def serialize_dates(obj: Any) -> Any:
    """Serialize date and datetime objects for JSON."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return obj

