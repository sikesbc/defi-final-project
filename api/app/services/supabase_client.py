"""Supabase client service."""
from supabase import create_client, Client
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from decimal import Decimal
from ..config import settings


class SupabaseService:
    """Service for interacting with Supabase."""
    
    def __init__(self):
        """Initialize Supabase client."""
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_SERVICE_KEY
        self.client: Optional[Client] = None
        
        # Only create client if credentials are provided
        if self.url and self.key:
            try:
                self.client = create_client(self.url, self.key)
            except Exception as e:
                print(f"Warning: Failed to initialize Supabase client: {e}")
                print("Backend will run with mock/empty data. Set SUPABASE_URL and SUPABASE_SERVICE_KEY to connect to database.")
        else:
            print("Warning: Supabase credentials not configured.")
            print("Backend will run with mock/empty data. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file.")
    
    async def get_attacks(
        self,
        limit: int = 1000,
        offset: int = 0,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        protocol: Optional[str] = None,
        attack_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get attacks with filters."""
        if not self.client:
            return {"data": [], "count": 0}
        
        try:
            query = self.client.table("attacks").select("*", count="exact")
            
            if start_date:
                query = query.gte("attack_date", start_date)
            if end_date:
                query = query.lte("attack_date", end_date)
            if protocol:
                query = query.ilike("protocol_name", f"%{protocol}%")
            if attack_type:
                query = query.eq("attack_type", attack_type)
            
            query = query.order("attack_date", desc=True).range(offset, offset + limit - 1)
            
            response = query.execute()
            
            return {
                "data": response.data,
                "count": response.count if response.count else len(response.data)
            }
        except Exception as e:
            print(f"Error fetching attacks: {e}")
            return {"data": [], "count": 0}
    
    async def insert_attacks(self, attacks_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Bulk insert attacks with upsert logic."""
        if not self.client:
            return {
                "success": False,
                "error": "Supabase client not initialized. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.",
                "records_inserted": 0
            }
        
        try:
            response = self.client.table("attacks").upsert(
                attacks_data,
                on_conflict="protocol_name,attack_date"
            ).execute()
            
            return {
                "success": True,
                "records_inserted": len(response.data),
                "data": response.data
            }
        except Exception as e:
            print(f"Error inserting attacks: {e}")
            return {
                "success": False,
                "error": str(e),
                "records_inserted": 0
            }
    
    async def get_summary_stats(self) -> Dict[str, Any]:
        """Get summary statistics."""
        if not self.client:
            return {
                "total_attacks": 0,
                "total_losses_usd": 0,
                "attacks_last_30_days": 0,
                "losses_last_30_days": 0,
                "average_loss_per_attack": 0,
                "most_targeted_protocol": None,
                "most_common_attack_type": None
            }
        
        try:
            # Get all attacks
            all_attacks = self.client.table("attacks").select("*").execute()
            
            if not all_attacks.data:
                return {
                    "total_attacks": 0,
                    "total_losses_usd": 0,
                    "attacks_last_30_days": 0,
                    "losses_last_30_days": 0,
                    "average_loss_per_attack": 0,
                    "most_targeted_protocol": None,
                    "most_common_attack_type": None
                }
            
            # Calculate stats
            total_attacks = len(all_attacks.data)
            total_losses = sum(float(a["loss_amount_usd"]) for a in all_attacks.data)
            
            # Last 30 days
            thirty_days_ago = (datetime.now() - timedelta(days=30)).date().isoformat()
            recent_attacks = [a for a in all_attacks.data if a["attack_date"] >= thirty_days_ago]
            attacks_last_30 = len(recent_attacks)
            losses_last_30 = sum(float(a["loss_amount_usd"]) for a in recent_attacks)
            
            # Average
            avg_loss = total_losses / total_attacks if total_attacks > 0 else 0
            
            # Most targeted protocol
            protocol_counts = {}
            for attack in all_attacks.data:
                protocol = attack["protocol_name"]
                protocol_counts[protocol] = protocol_counts.get(protocol, 0) + 1
            most_targeted = max(protocol_counts.items(), key=lambda x: x[1])[0] if protocol_counts else None
            
            # Most common attack type
            type_counts = {}
            for attack in all_attacks.data:
                attack_type = attack["attack_type"]
                type_counts[attack_type] = type_counts.get(attack_type, 0) + 1
            most_common_type = max(type_counts.items(), key=lambda x: x[1])[0] if type_counts else None
            
            return {
                "total_attacks": total_attacks,
                "total_losses_usd": total_losses,
                "attacks_last_30_days": attacks_last_30,
                "losses_last_30_days": losses_last_30,
                "average_loss_per_attack": avg_loss,
                "most_targeted_protocol": most_targeted,
                "most_common_attack_type": most_common_type
            }
        except Exception as e:
            print(f"Error getting summary stats: {e}")
            return {}
    
    async def get_timeline_data(
        self,
        granularity: str = "month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get timeline data grouped by period."""
        if not self.client:
            return []
        
        try:
            query = self.client.table("attacks").select("attack_date,loss_amount_usd")
            
            if start_date:
                query = query.gte("attack_date", start_date)
            if end_date:
                query = query.lte("attack_date", end_date)
            
            response = query.order("attack_date").execute()
            
            # Group by period
            timeline = {}
            for attack in response.data:
                date_str = attack["attack_date"]
                
                if granularity == "month":
                    period = date_str[:7]  # YYYY-MM
                elif granularity == "week":
                    # Group by week (simplified)
                    period = date_str[:7]
                else:  # day
                    period = date_str
                
                if period not in timeline:
                    timeline[period] = {"attack_count": 0, "total_loss_usd": 0}
                
                timeline[period]["attack_count"] += 1
                timeline[period]["total_loss_usd"] += float(attack["loss_amount_usd"])
            
            # Format response
            result = [
                {
                    "period": period,
                    "attack_count": data["attack_count"],
                    "total_loss_usd": data["total_loss_usd"]
                }
                for period, data in sorted(timeline.items())
            ]
            
            return result
        except Exception as e:
            print(f"Error getting timeline data: {e}")
            return []
    
    async def get_protocol_breakdown(self) -> List[Dict[str, Any]]:
        """Get protocol breakdown statistics."""
        if not self.client:
            return []
        
        try:
            response = self.client.table("attacks").select("protocol_name,loss_amount_usd").execute()
            
            # Group by protocol
            protocols = {}
            total_loss = 0
            
            for attack in response.data:
                protocol = attack["protocol_name"]
                loss = float(attack["loss_amount_usd"])
                
                if protocol not in protocols:
                    protocols[protocol] = {"attack_count": 0, "total_loss_usd": 0}
                
                protocols[protocol]["attack_count"] += 1
                protocols[protocol]["total_loss_usd"] += loss
                total_loss += loss
            
            # Calculate percentages and format
            result = []
            for protocol, data in protocols.items():
                percentage = (data["total_loss_usd"] / total_loss * 100) if total_loss > 0 else 0
                result.append({
                    "protocol_name": protocol,
                    "attack_count": data["attack_count"],
                    "total_loss_usd": data["total_loss_usd"],
                    "percentage": round(percentage, 2)
                })
            
            # Sort by total loss
            result.sort(key=lambda x: x["total_loss_usd"], reverse=True)
            
            return result
        except Exception as e:
            print(f"Error getting protocol breakdown: {e}")
            return []
    
    async def get_attack_type_breakdown(self) -> List[Dict[str, Any]]:
        """Get attack type breakdown statistics."""
        if not self.client:
            return []
        
        try:
            response = self.client.table("attacks").select("attack_type,loss_amount_usd").execute()
            
            # Group by attack type
            attack_types = {}
            total_loss = 0
            
            for attack in response.data:
                attack_type = attack["attack_type"]
                loss = float(attack["loss_amount_usd"])
                
                if attack_type not in attack_types:
                    attack_types[attack_type] = {"attack_count": 0, "total_loss_usd": 0}
                
                attack_types[attack_type]["attack_count"] += 1
                attack_types[attack_type]["total_loss_usd"] += loss
                total_loss += loss
            
            # Calculate percentages and format
            result = []
            for attack_type, data in attack_types.items():
                percentage = (data["total_loss_usd"] / total_loss * 100) if total_loss > 0 else 0
                result.append({
                    "attack_type": attack_type,
                    "attack_count": data["attack_count"],
                    "total_loss_usd": data["total_loss_usd"],
                    "percentage": round(percentage, 2)
                })
            
            # Sort by total loss
            result.sort(key=lambda x: x["total_loss_usd"], reverse=True)
            
            return result
        except Exception as e:
            print(f"Error getting attack type breakdown: {e}")
            return []
    
    async def get_top_attacks(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top attacks by loss amount."""
        if not self.client:
            return []
        
        try:
            response = self.client.table("attacks").select(
                "protocol_name,attack_date,loss_amount_usd,attack_type,description,source_url"
            ).order("loss_amount_usd", desc=True).limit(limit).execute()
            
            return response.data
        except Exception as e:
            print(f"Error getting top attacks: {e}")
            return []
    
    async def log_refresh(
        self,
        status: str,
        records_fetched: Optional[int] = None,
        records_inserted: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Log a data refresh operation."""
        if not self.client:
            return {}
        
        try:
            log_data = {
                "refresh_started_at": datetime.now().isoformat(),
                "refresh_completed_at": datetime.now().isoformat() if status == "completed" else None,
                "status": status,
                "records_fetched": records_fetched,
                "records_inserted": records_inserted,
                "error_message": error_message
            }
            
            response = self.client.table("refresh_logs").insert(log_data).execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            print(f"Error logging refresh: {e}")
            return {}
    
    async def get_last_refresh_status(self) -> Dict[str, Any]:
        """Get the status of the last refresh operation."""
        if not self.client:
            return {
                "last_refresh": None,
                "status": "never_run",
                "records_fetched": None
            }
        
        try:
            response = self.client.table("refresh_logs").select("*").order(
                "created_at", desc=True
            ).limit(1).execute()
            
            if not response.data:
                return {
                    "last_refresh": None,
                    "status": "never_run",
                    "records_fetched": None
                }
            
            last_log = response.data[0]
            return {
                "last_refresh": last_log.get("refresh_completed_at"),
                "status": last_log.get("status"),
                "records_fetched": last_log.get("records_fetched")
            }
        except Exception as e:
            print(f"Error getting refresh status: {e}")
            return {}

