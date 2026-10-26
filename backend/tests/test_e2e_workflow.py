import pytest

def test_full_user_workflow_e2e(client):
    # 1. Register User A
    reg_res = client.post("/api/v1/auth/register", json={
        "name": "Jane Developer",
        "email": "jane_e2e@techcorp.io",
        "password": "SecurePassword999!"
    })
    assert reg_res.status_code == 201
    auth_data_a = reg_res.json()
    token_a = auth_data_a["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Login User A
    login_res = client.post("/api/v1/auth/login", json={
        "email": "jane_e2e@techcorp.io",
        "password": "SecurePassword999!"
    })
    assert login_res.status_code == 200

    # 3. Submit Code Review
    vulnerable_code = """import os

AWS_KEY = "AKIA1234567890ABCDEF"

def run_task(cmd, items=[]):
    eval(cmd)
    os.system(cmd)
    return items
"""
    review_res = client.post("/api/v1/reviews", json={
        "title": "Auth Worker Service",
        "language": "python",
        "source_code": vulnerable_code,
        "enable_ai": True,
        "enable_security": True
    }, headers=headers_a)
    assert review_res.status_code == 201
    review = review_res.json()
    review_id = review["id"]
    initial_score = review["quality_score"]
    assert initial_score < 60.0
    assert len(review["findings"]) >= 3

    # Check findings details
    first_finding = review["findings"][0]
    finding_id = first_finding["id"]
    assert first_finding["start_line"] > 0
    assert first_finding["status"] == "open"

    # 4. Resolve the first finding
    patch_res = client.patch(f"/api/v1/findings/{finding_id}", json={
        "status": "resolved"
    }, headers=headers_a)
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "resolved"

    # 5. Verify parent review quality score increased
    refetched_review = client.get(f"/api/v1/reviews/{review_id}", headers=headers_a).json()
    assert refetched_review["quality_score"] > initial_score

    # 6. Check Analytics Overview
    analytics_res = client.get("/api/v1/analytics/overview", headers=headers_a)
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()
    assert analytics["total_reviews"] == 1
    assert analytics["resolved_count"] == 1

    # 7. Check User Tenancy / Privacy: Register User B and verify they CANNOT access User A's review
    reg_b = client.post("/api/v1/auth/register", json={
        "name": "Intruder User",
        "email": "intruder_e2e@external.io",
        "password": "Password123!"
    })
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B tries to get User A's review
    unauthorized_res = client.get(f"/api/v1/reviews/{review_id}", headers=headers_b)
    assert unauthorized_res.status_code == 404

    # User B's review list is empty
    b_list = client.get("/api/v1/reviews", headers=headers_b).json()
    assert b_list["total"] == 0
