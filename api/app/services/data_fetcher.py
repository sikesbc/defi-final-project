"""Data fetcher service for scraping attack data from various sources."""
import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio


class DataFetcherService:
    """Service for fetching attack data from multiple sources."""
    
    def __init__(self):
        """Initialize the data fetcher."""
        self.timeout = httpx.Timeout(30.0)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
    
    async def fetch_all_sources(self) -> List[Dict[str, Any]]:
        """Fetch data from all sources."""
        all_attacks = []
        
        try:
            # Fetch from Rekt.news
            rekt_data = await self.fetch_rekt_data()
            all_attacks.extend(rekt_data)
        except Exception as e:
            print(f"Error fetching from Rekt.news: {e}")
        
        try:
            # Fetch from DeFiYield
            defiyield_data = await self.fetch_defiyield_data()
            all_attacks.extend(defiyield_data)
        except Exception as e:
            print(f"Error fetching from DeFiYield: {e}")
        
        try:
            # Fetch from SlowMist
            slowmist_data = await self.fetch_slowmist_data()
            all_attacks.extend(slowmist_data)
        except Exception as e:
            print(f"Error fetching from SlowMist: {e}")
        
        return all_attacks
    
    async def fetch_rekt_data(self) -> List[Dict[str, Any]]:
        """Scrape data from Rekt.news leaderboard."""
        attacks = []
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                response = await client.get("https://rekt.news/leaderboard/")
                
                if response.status_code != 200:
                    print(f"Rekt.news returned status {response.status_code}")
                    return attacks
                
                soup = BeautifulSoup(response.text, "html.parser")
                
                # Find the leaderboard table
                table = soup.find("table")
                if not table:
                    print("Could not find leaderboard table on Rekt.news")
                    return attacks
                
                rows = table.find_all("tr")[1:]  # Skip header
                
                for row in rows:
                    try:
                        cols = row.find_all("td")
                        if len(cols) < 4:
                            continue
                        
                        protocol_name = cols[1].get_text(strip=True)
                        date_str = cols[2].get_text(strip=True)
                        amount_str = cols[3].get_text(strip=True)
                        
                        # Parse amount (e.g., "$1,234,567")
                        amount = float(amount_str.replace("$", "").replace(",", ""))
                        
                        # Parse date
                        try:
                            attack_date = datetime.strptime(date_str, "%d %b %Y").date()
                        except:
                            attack_date = datetime.now().date()
                        
                        # Get link
                        link = cols[1].find("a")
                        source_url = f"https://rekt.news{link['href']}" if link and link.get("href") else None
                        
                        attacks.append({
                            "protocol_name": protocol_name,
                            "attack_date": attack_date.isoformat(),
                            "attack_type": "exploit",  # Default type
                            "loss_amount_usd": amount,
                            "description": f"Attack on {protocol_name}",
                            "source_url": source_url,
                            "blockchain": None,
                            "data_source": "rekt"
                        })
                    except Exception as e:
                        print(f"Error parsing Rekt.news row: {e}")
                        continue
                
        except Exception as e:
            print(f"Error fetching Rekt.news data: {e}")
        
        return attacks
    
    async def fetch_defiyield_data(self) -> List[Dict[str, Any]]:
        """Fetch data from DeFiYield Rekt Database."""
        attacks = []
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                # Try API endpoint first
                response = await client.get("https://api.defiyield.app/api/v1/rekt")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for item in data.get("data", []):
                        try:
                            attacks.append({
                                "protocol_name": item.get("project", "Unknown"),
                                "attack_date": item.get("date", datetime.now().date().isoformat()),
                                "attack_type": item.get("type", "exploit"),
                                "loss_amount_usd": float(item.get("amount", 0)),
                                "description": item.get("description", ""),
                                "source_url": item.get("url"),
                                "blockchain": item.get("blockchain"),
                                "data_source": "defiyield"
                            })
                        except Exception as e:
                            print(f"Error parsing DeFiYield item: {e}")
                            continue
                else:
                    print(f"DeFiYield API returned status {response.status_code}")
        
        except Exception as e:
            print(f"Error fetching DeFiYield data: {e}")
        
        return attacks
    
    async def fetch_slowmist_data(self) -> List[Dict[str, Any]]:
        """Fetch data from SlowMist Hacked database."""
        attacks = []
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                # SlowMist has a public API
                response = await client.get("https://hacked.slowmist.io/api/hacked/list")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for item in data.get("data", []):
                        try:
                            # Parse the date
                            date_str = item.get("date", "")
                            try:
                                attack_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                            except:
                                attack_date = datetime.now().date()
                            
                            # Parse amount
                            amount_str = item.get("loss", "0")
                            try:
                                amount = float(str(amount_str).replace("$", "").replace(",", "").replace("M", "000000").replace("K", "000"))
                            except:
                                amount = 0
                            
                            attacks.append({
                                "protocol_name": item.get("project", "Unknown"),
                                "attack_date": attack_date.isoformat(),
                                "attack_type": item.get("attack_type", "exploit"),
                                "loss_amount_usd": amount,
                                "description": item.get("description", ""),
                                "source_url": item.get("url"),
                                "blockchain": item.get("blockchain"),
                                "data_source": "slowmist"
                            })
                        except Exception as e:
                            print(f"Error parsing SlowMist item: {e}")
                            continue
                else:
                    print(f"SlowMist API returned status {response.status_code}")
        
        except Exception as e:
            print(f"Error fetching SlowMist data: {e}")
        
        return attacks
    
    def parse_attack_data(self, raw_data: Any, source: str) -> Dict[str, Any]:
        """Normalize data format from different sources."""
        # This method can be used for additional parsing logic
        return raw_data

