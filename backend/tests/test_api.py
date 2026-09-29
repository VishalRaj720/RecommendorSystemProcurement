def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ("ok", "degraded", "error")
    assert "db" in data
    assert "embedding_model" in data

def test_recommend_success(client):
    payload = {
        "description": "fireproof barrier for hospital doors",
        "language": "en",
        "source": "dashboard"
    }
    response = client.post("/api/v1/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "matches" in data
    assert len(data["matches"]) > 0

def test_recommend_validation_error(client):
    # Missing 'description'
    payload = {
        "language": "en",
        "source": "dashboard"
    }
    response = client.post("/api/v1/recommend", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
