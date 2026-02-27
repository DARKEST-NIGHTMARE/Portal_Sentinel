import pytest
import asyncio
from unittest.mock import AsyncMock
from app.services.location_service import LocationService

@pytest.mark.asyncio
async def test_get_ip_location_data_localhost():
    """Test that localhost IP resolves to Gandhinagar bypass logic"""
    data = await LocationService.get_ip_location_data("127.0.0.1")
    
    assert data["location"] == "Localhost (Testing)"
    assert data["lat"] == 23.2156
    assert data["lon"] == 72.6369

@pytest.mark.asyncio
async def test_get_ip_location_data_external(mocker):
    """Test standard public IP extraction handling using ip-api.com Mock"""
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": "success",
        "city": "London",
        "country": "United Kingdom",
        "lat": 51.5074,
        "lon": -0.1278
    }
    
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.get.return_value = mock_response
    
    mocker.patch('app.services.location_service.httpx.AsyncClient', return_value=mock_client)
    
    data = await LocationService.get_ip_location_data("8.8.8.8")
    
    assert data["location"] == "London, United Kingdom"
    assert data["lat"] == 51.5074
    assert data["lon"] == -0.1278

@pytest.mark.asyncio
async def test_get_ip_location_data_external_failure(mocker):
    """Test fallback when external API fails"""
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": "fail"
    }
    
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.get.return_value = mock_response
    
    mocker.patch('app.services.location_service.httpx.AsyncClient', return_value=mock_client)
    
    data = await LocationService.get_ip_location_data("8.8.8.8")
    
    assert data["location"] == "Unknown Location"
    assert data["lat"] is None
    assert data["lon"] is None
