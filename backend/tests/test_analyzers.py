import pytest
from app.analyzers.python_analyzer import PythonAnalyzer
from app.analyzers.javascript_analyzer import JavaScriptAnalyzer
from app.analyzers.generic_analyzer import GenericAnalyzer
from app.services.static_analysis_service import static_analysis_service

def test_python_dangerous_eval():
    analyzer = PythonAnalyzer()
    code = """
def execute_user_command(user_cmd):
    return eval(user_cmd)
"""
    findings = analyzer.analyze(code, {"enable_security": True})
    assert any(f.rule_id == "SEC-PY-001" and f.severity == "critical" for f in findings)

def test_python_mutable_default():
    analyzer = PythonAnalyzer()
    code = """
def append_item(item, target_list=[]):
    target_list.append(item)
    return target_list
"""
    findings = analyzer.analyze(code, {"enable_bugs": True})
    assert any(f.rule_id == "BUG-PY-001" and f.severity == "high" for f in findings)

def test_python_bare_except():
    analyzer = PythonAnalyzer()
    code = """
try:
    x = 1 / 0
except:
    pass
"""
    findings = analyzer.analyze(code, {"enable_bugs": True})
    assert any(f.rule_id in ["BUG-PY-002", "BUG-PY-003"] for f in findings)

def test_python_syntax_error():
    analyzer = PythonAnalyzer()
    code = "def broken_func(:\n    pass"
    findings = analyzer.analyze(code)
    assert any(f.rule_id == "SYN-PY-001" and f.severity == "critical" for f in findings)

def test_javascript_innerhtml_xss():
    analyzer = JavaScriptAnalyzer("javascript")
    code = """
function renderContent(userInput) {
    document.getElementById("container").innerHTML = userInput;
}
"""
    findings = analyzer.analyze(code, {"enable_security": True})
    assert any(f.rule_id == "SEC-JS-003" for f in findings)

def test_javascript_loose_equality():
    analyzer = JavaScriptAnalyzer("javascript")
    code = """
if (x == null) {
    doSomething();
}
"""
    findings = analyzer.analyze(code, {"enable_bugs": True})
    assert any(f.rule_id == "BUG-JS-001" for f in findings)

def test_generic_hardcoded_aws_key():
    analyzer = GenericAnalyzer("generic")
    code = 'AWS_KEY = "AKIA1234567890ABCDEF"'
    findings = analyzer.analyze(code, {"enable_security": True})
    assert any(f.rule_id == "SEC-GEN-AWS" and f.severity == "critical" for f in findings)

def test_metrics_calculation():
    analyzer = PythonAnalyzer()
    code = """
# Test comment
def simple_func(x):
    if x > 0:
        return x
    return 0
"""
    metrics = analyzer.compute_metrics(code)
    assert metrics["loc"] > 0
    assert metrics["comment_lines"] == 1
    assert metrics["cyclomatic_complexity"] >= 2
    assert 0 <= metrics["maintainability_index"] <= 100

def test_python_performance_optimization_checks():
    analyzer = PythonAnalyzer()
    code = """
def process_data(items, data_dict):
    result = ""
    for i in range(len(items)):
        result += str(items[i])
    for k in data_dict.keys():
        if k in [1, 2, 3, 4, 5]:
            pass
"""
    findings = analyzer.analyze(code, {"enable_performance": True})
    rule_ids = [f.rule_id for f in findings]
    assert "PERF-PY-005" in rule_ids  # range(len(...))
    assert "PERF-PY-002" in rule_ids  # string += in loop
    assert "PERF-PY-006" in rule_ids  # list membership in [...]
    assert "PERF-PY-007" in rule_ids  # dict.keys()

def test_go_analyzer_command_injection_and_resolution():
    from app.analyzers.go_analyzer import GoAnalyzer
    analyzer = GoAnalyzer()
    code = """package main
import "os/exec"

func RunCmd(arg string) {
    exec.Command("sh", "-c", arg).Run()
}
"""
    findings = analyzer.analyze(code, {"enable_security": True})
    assert any(f.rule_id == "SEC-GO-001" and f.severity == "critical" for f in findings)
    sec_finding = next(f for f in findings if f.rule_id == "SEC-GO-001")
    assert sec_finding.suggested_code is not None

def test_rust_analyzer_unsafe_and_unwrap():
    from app.analyzers.rust_analyzer import RustAnalyzer
    analyzer = RustAnalyzer()
    code = """pub fn process(ptr: *const u8) {
    let val = unsafe { *ptr };
    let res = std::fs::read("test.txt").unwrap();
}
"""
    findings = analyzer.analyze(code, {"enable_security": True, "enable_bugs": True})
    rule_ids = [f.rule_id for f in findings]
    assert "SEC-RS-001" in rule_ids  # Raw pointer dereference
    assert "BUG-RS-001" in rule_ids  # Unsafe unwrap

def test_java_analyzer_sql_injection():
    from app.analyzers.java_analyzer import JavaAnalyzer
    analyzer = JavaAnalyzer()
    code = """public class DB {
    public void query(String name, java.sql.Statement stmt) throws Exception {
        stmt.executeQuery("SELECT * FROM users WHERE name = '" + name + "'");
    }
}
"""
    findings = analyzer.analyze(code, {"enable_security": True})
    assert any(f.rule_id == "SEC-JAVA-002" for f in findings)

def test_cpp_analyzer_buffer_overflow():
    from app.analyzers.cpp_analyzer import CppAnalyzer
    analyzer = CppAnalyzer()
    code = """void copyData(char* input) {
    char buf[16];
    strcpy(buf, input);
}
"""
    findings = analyzer.analyze(code, {"enable_security": True})
    assert any(f.rule_id == "SEC-CPP-001" for f in findings)


