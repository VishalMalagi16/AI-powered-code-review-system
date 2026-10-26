import pytest
from app.models.user import User
from app.core.security import hash_password, create_access_token

@pytest.fixture
def auth_user(db_session):
    user = User(
        email="test_auditor_reviews@example.com",
        name="Security Auditor",
        password_hash=hash_password("AuditPassword123!"),
        role="developer",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers

def test_system_health(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "ai_status" in data

def test_create_and_fetch_review(client, auth_user):
    user, headers = auth_user
    payload = {
        "title": "Vulnerable Script Review",
        "language": "python",
        "source_code": "import os\n\ndef run(cmd):\n    eval(cmd)\n    os.system(cmd)\n",
        "enable_ai": True,
        "enable_security": True
    }
    res = client.post("/api/v1/reviews", json=payload, headers=headers)
    assert res.status_code == 201
    review = res.json()
    assert review["title"] == "Vulnerable Script Review"
    assert review["status"] == "completed"
    assert len(review["findings"]) >= 2
    assert review["quality_score"] < 80.0
    
    # Check that findings list matches
    review_id = review["id"]
    get_res = client.get(f"/api/v1/reviews/{review_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == review_id

def test_unauthorized_review_access(client):
    res = client.get("/api/v1/reviews")
    assert res.status_code == 401
