"""Data processor service for cleaning and validating attack data."""
import pandas as pd
from typing import List, Dict, Any
from datetime import datetime


class DataProcessorService:
    """Service for processing and cleaning attack data."""
    
    def clean_data(self, attacks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Clean and validate attack data."""
        if not attacks:
            return []
        
        # Convert to DataFrame for easier processing
        df = pd.DataFrame(attacks)
        
        # Remove duplicates based on protocol name and date
        df = df.drop_duplicates(subset=["protocol_name", "attack_date"], keep="first")
        
        # Validate required fields
        df = df.dropna(subset=["protocol_name", "attack_date", "loss_amount_usd"])
        
        # Ensure loss amounts are positive
        df = df[df["loss_amount_usd"] > 0]
        
        # Standardize protocol names
        df["protocol_name"] = df["protocol_name"].str.strip()
        
        # Standardize attack types
        df["attack_type"] = df["attack_type"].str.lower().str.strip()
        df["attack_type"] = df["attack_type"].fillna("exploit")
        
        # Fill missing descriptions
        df["description"] = df["description"].fillna("")
        
        # Validate dates
        df = self._validate_dates(df)
        
        # Convert back to list of dictionaries
        cleaned_data = df.to_dict("records")
        
        return cleaned_data
    
    def _validate_dates(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate and standardize dates."""
        try:
            # Ensure attack_date is in proper format
            df["attack_date"] = pd.to_datetime(df["attack_date"]).dt.date
            
            # Filter out future dates
            today = datetime.now().date()
            df = df[df["attack_date"] <= today]
            
        except Exception as e:
            print(f"Error validating dates: {e}")
        
        return df
    
    def detect_duplicates(
        self,
        new_data: List[Dict[str, Any]],
        existing_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Detect and remove duplicates using fuzzy matching."""
        if not existing_data:
            return new_data
        
        # Convert to DataFrames
        new_df = pd.DataFrame(new_data)
        existing_df = pd.DataFrame(existing_data)
        
        # Create composite keys for matching
        new_df["key"] = (
            new_df["protocol_name"].str.lower().str.strip() +
            "_" +
            new_df["attack_date"].astype(str)
        )
        
        existing_df["key"] = (
            existing_df["protocol_name"].str.lower().str.strip() +
            "_" +
            existing_df["attack_date"].astype(str)
        )
        
        # Filter out duplicates
        unique_df = new_df[~new_df["key"].isin(existing_df["key"])]
        unique_df = unique_df.drop(columns=["key"])
        
        return unique_df.to_dict("records")
    
    def calculate_statistics(self, attacks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate aggregate statistics."""
        if not attacks:
            return {
                "total_attacks": 0,
                "total_losses": 0,
                "average_loss": 0,
                "median_loss": 0
            }
        
        df = pd.DataFrame(attacks)
        
        stats = {
            "total_attacks": len(df),
            "total_losses": float(df["loss_amount_usd"].sum()),
            "average_loss": float(df["loss_amount_usd"].mean()),
            "median_loss": float(df["loss_amount_usd"].median()),
            "min_loss": float(df["loss_amount_usd"].min()),
            "max_loss": float(df["loss_amount_usd"].max())
        }
        
        return stats
    
    def prepare_for_insert(self, attacks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prepare cleaned data for database insertion."""
        prepared_data = []
        
        for attack in attacks:
            # Ensure all required fields are present
            prepared_attack = {
                "protocol_name": attack.get("protocol_name", "Unknown"),
                "attack_date": attack.get("attack_date"),
                "attack_type": attack.get("attack_type", "exploit"),
                "loss_amount_usd": float(attack.get("loss_amount_usd", 0)),
                "description": attack.get("description", ""),
                "source_url": attack.get("source_url"),
                "blockchain": attack.get("blockchain"),
                "data_source": attack.get("data_source", "unknown"),
                "updated_at": datetime.now().isoformat()
            }
            
            prepared_data.append(prepared_attack)
        
        return prepared_data

