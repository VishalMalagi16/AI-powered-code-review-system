import os
import subprocess
import pickle
import hashlib

# SEC-GEN-AWS: Hardcoded Secret
AWS_ACCESS_KEY_ID = "AKIA1234567890ABCDEF"
DATABASE_URL = "postgres://admin:SuperSecretPassword123@prod-db.internal:5432/main"

# BUG-PY-001: Mutable default argument
def register_user(username, roles=[]):
    roles.append("member")
    return {"user": username, "roles": roles}

def execute_user_query(user_query, user_id):
    # SEC-PY-005: SQL injection pattern in formatting
    sql = f"SELECT * FROM users WHERE id = '{user_id}' AND active = 1"
    
    # SEC-PY-002: os.system shell injection
    os.system(f"echo 'Running query for: {user_id}'")
    
    # SEC-PY-001: RCE via eval
    eval(user_query)

def load_session_cache(untrusted_blob):
    # SEC-PY-004: Insecure deserialization via pickle
    data = pickle.loads(untrusted_blob)
    return data

def process_file_data(filename):
    # BUG-PY-002: Bare except
    try:
        f = open(filename, "r")
        content = f.read()
        return content
    except:
        pass  # BUG-PY-003: Silent exception suppression

def validate_state(state):
    # STYLE-PY-002: Comparison with None using == instead of 'is None'
    if state == None:
        return False
    # BUG-PY-004: Using assert in production code
    assert len(state) > 0, "State must not be empty"
    return True
