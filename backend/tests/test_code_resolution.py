import uuid
import pytest
from app.models.user import User
from app.core.security import hash_password, create_access_token

@pytest.fixture
def resolution_user(db_session):
    email = f"res_dev_{uuid.uuid4().hex[:6]}@codeguard.ai"
    user = User(
        email=email,
        name="Resolution Dev",
        password_hash=hash_password("DevPass123!"),
        role="developer"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers

def test_resolve_finding_actually_modifies_code(client, resolution_user):
    user, headers = resolution_user
    code = """def calc(items=[]):
    return eval(items)
"""
    res = client.post("/api/v1/reviews", json={
        "title": "Code Mod Test",
        "language": "python",
        "source_code": code,
        "enable_ai": False,
        "enable_security": True,
        "enable_bugs": True
    }, headers=headers)
    assert res.status_code == 201
    review = res.json()
    review_id = review["id"]
    findings = review["findings"]
    assert len(findings) >= 2

    # Find the eval finding
    eval_finding = next(f for f in findings if f["rule_id"] == "SEC-PY-001")
    
    # Resolve and apply fix
    patch_res = client.patch(f"/api/v1/findings/{eval_finding['id']}", json={
        "status": "resolved",
        "apply_to_code": True
    }, headers=headers)
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data["status"] == "resolved"
    assert "updated_source_code" in patch_data
    assert "ast.literal_eval" in patch_data["updated_source_code"]

def test_apply_all_fixes_batch(client, resolution_user):
    user, headers = resolution_user
    code = """def fetch_data(roles=[]):
    return eval(roles)
"""
    res = client.post("/api/v1/reviews", json={
        "title": "Batch Fix Test",
        "language": "python",
        "source_code": code,
        "enable_ai": False,
        "enable_security": True
    }, headers=headers)
    assert res.status_code == 201
    review_id = res.json()["id"]

    batch_res = client.post(f"/api/v1/reviews/{review_id}/apply-all-fixes", headers=headers)
    assert batch_res.status_code == 200
    updated_review = batch_res.json()
    assert updated_review["quality_score"] == 100.0
    assert "ast.literal_eval" in updated_review["source_code"]

def test_resolve_syntax_error_actually_fixes_code(client, resolution_user):
    user, headers = resolution_user
    code = """category_summary():
    summary = {}
    return summary
"""
    res = client.post("/api/v1/reviews", json={
        "title": "Syntax Fix Test",
        "language": "python",
        "source_code": code,
        "enable_ai": False,
        "enable_bugs": True
    }, headers=headers)
    assert res.status_code == 201
    review = res.json()
    findings = review["findings"]
    assert len(findings) == 1
    syntax_finding = findings[0]
    assert syntax_finding["rule_id"] == "SYN-PY-001"
    assert "def category_summary():" in syntax_finding["suggested_code"]

    # Resolve and apply fix
    patch_res = client.patch(f"/api/v1/findings/{syntax_finding['id']}", json={
        "status": "resolved",
        "apply_to_code": True
    }, headers=headers)
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data["status"] == "resolved"
    assert "def category_summary():" in patch_data["updated_source_code"]
    assert "category_summary():" not in patch_data["updated_source_code"].replace("def category_summary():", "")

def test_resolve_go_code_resolution(client, resolution_user):
    user, headers = resolution_user
    code = """package main
import "os/exec"

func RunCmd(arg string) {
    exec.Command("sh", "-c", arg).Run()
}
"""
    res = client.post("/api/v1/reviews", json={
        "language": "go",
        "source_code": code,
        "enable_security": True
    }, headers=headers)
    assert res.status_code == 201
    finding = res.json()["findings"][0]
    assert "SEC-GO-001" in finding["rule_id"]

    patch_res = client.patch(f"/api/v1/findings/{finding['id']}", json={
        "status": "resolved",
        "apply_to_code": True
    }, headers=headers)
    assert patch_res.status_code == 200
    updated_code = patch_res.json()["updated_source_code"]
    assert 'exec.Command("sh", "-c"' not in updated_code

def test_resolve_javascript_code_resolution(client, resolution_user):
    user, headers = resolution_user
    code = """function test(input) {
    eval(input);
}
"""
    res = client.post("/api/v1/reviews", json={
        "language": "javascript",
        "source_code": code,
        "enable_security": True
    }, headers=headers)
    assert res.status_code == 201
    finding = res.json()["findings"][0]
    assert "SEC-JS-001" in finding["rule_id"]

    patch_res = client.patch(f"/api/v1/findings/{finding['id']}", json={
        "status": "resolved",
        "apply_to_code": True
    }, headers=headers)
    assert patch_res.status_code == 200
    updated_code = patch_res.json()["updated_source_code"]
    assert "JSON.parse(input)" in updated_code

def test_resolve_rust_code_resolution(client, resolution_user):
    user, headers = resolution_user
    code = """fn read_file() {
    let res = std::fs::read("file.txt").unwrap();
}
"""
    res = client.post("/api/v1/reviews", json={
        "language": "rust",
        "source_code": code,
        "enable_bugs": True
    }, headers=headers)
    assert res.status_code == 201
    finding = res.json()["findings"][0]
    assert "BUG-RS-001" in finding["rule_id"]

    patch_res = client.patch(f"/api/v1/findings/{finding['id']}", json={
        "status": "resolved",
        "apply_to_code": True
    }, headers=headers)
    assert patch_res.status_code == 200
    updated_code = patch_res.json()["updated_source_code"]
    assert ".unwrap_or_default()" in updated_code


