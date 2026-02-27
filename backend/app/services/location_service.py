import httpx

class LocationService:
    @staticmethod
    async def get_ip_location_data(ip: str) -> dict:
        if ip in ["127.0.0.1", "::1", "localhost", "0.0.0.0"]:
            return {"location": "Localhost (Testing)", "lat": 23.2156, "lon": 72.6369}
        
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(f"http://ip-api.com/json/{ip}?fields=city,country,lat,lon,status")
                data = res.json()
                if data.get("status") == "success":
                    return {
                        "location": f"{data.get('city')}, {data.get('country')}",
                        "lat": data.get("lat"),
                        "lon": data.get("lon")
                    }
        except Exception as e:
            print(f"Location lookup failed: {e}")
        return {"location": "Unknown Location", "lat": None, "lon": None}

    @staticmethod
    async def get_coord_location(lat: float, lon: float) -> str:
        try:
            async with httpx.AsyncClient() as client:
                headers = {"User-Agent": "SecurityApp/1.0"}
                res = await client.get(
                    f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}",
                    headers=headers
                )
                if res.status_code == 200:
                    data = res.json()
                    address = data.get("address", {})
                    city = address.get("city") or address.get("town") or address.get("village") or address.get("county")
                    country = address.get("country")
                    
                    if city and country:
                        return f"{city}, {country}"
        except Exception as e:
            print(f"Coordinate lookup failed: {e}")
            
        return None
