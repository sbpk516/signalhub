"""
Simple tests for Phase 0 setup.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_read_root():
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "SignalHub" in data["message"]


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_api_status():
    """Test API status endpoint."""
    response = client.get("/api/v1/status")
    assert response.status_code == 200
    data = response.json()
    assert data["api_version"] == "v1"
    assert data["status"] == "active"


def test_get_calls():
    """Test get calls endpoint."""
    response = client.get("/api/v1/calls")
    assert response.status_code == 200
    data = response.json()
    assert "calls" in data
    assert "total" in data


if __name__ == "__main__":
    pytest.main([__file__])
