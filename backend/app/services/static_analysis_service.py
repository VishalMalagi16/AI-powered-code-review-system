from typing import List, Dict, Any, Tuple
from app.analyzers.base import BaseAnalyzer
from app.analyzers.python_analyzer import PythonAnalyzer
from app.analyzers.javascript_analyzer import JavaScriptAnalyzer
from app.analyzers.go_analyzer import GoAnalyzer
from app.analyzers.rust_analyzer import RustAnalyzer
from app.analyzers.java_analyzer import JavaAnalyzer
from app.analyzers.cpp_analyzer import CppAnalyzer
from app.analyzers.generic_analyzer import GenericAnalyzer
from app.schemas.finding import FindingBase

class StaticAnalysisService:
    def __init__(self):
        self.analyzers = {
            "python": PythonAnalyzer(),
            "javascript": JavaScriptAnalyzer("javascript"),
            "typescript": JavaScriptAnalyzer("typescript"),
            "go": GoAnalyzer("go"),
            "rust": RustAnalyzer("rust"),
            "java": JavaAnalyzer("java"),
            "cpp": CppAnalyzer("cpp"),
            "c": CppAnalyzer("c"),
        }
        self.generic_analyzer = GenericAnalyzer()

    def get_analyzer(self, language: str) -> BaseAnalyzer:
        lang_normalized = language.lower().strip()
        if lang_normalized in ["py", "python"]:
            return self.analyzers["python"]
        elif lang_normalized in ["js", "javascript", "jsx"]:
            return self.analyzers["javascript"]
        elif lang_normalized in ["ts", "typescript", "tsx"]:
            return self.analyzers["typescript"]
        elif lang_normalized in ["go", "golang"]:
            return self.analyzers["go"]
        elif lang_normalized in ["rs", "rust"]:
            return self.analyzers["rust"]
        elif lang_normalized in ["java"]:
            return self.analyzers["java"]
        elif lang_normalized in ["cpp", "c++", "c", "cc", "cxx", "h", "hpp"]:
            return self.analyzers["cpp"]
        else:
            return GenericAnalyzer(lang_normalized)

    def analyze_code(
        self,
        source_code: str,
        language: str,
        options: Dict[str, Any]
    ) -> Tuple[List[FindingBase], Dict[str, Any], float]:
        """
        Run static analysis, compute metrics, and calculate quality score.
        Returns (findings, metrics, quality_score).
        """
        analyzer = self.get_analyzer(language)
        
        # Run language-specific analyzer
        findings: List[FindingBase] = []
        try:
            findings.extend(analyzer.analyze(source_code, options))
        except Exception as e:
            # Add an analysis warning finding rather than completely failing
            findings.append(FindingBase(
                rule_id="SYS-ANA-001",
                category="maintainability",
                severity="informational",
                title="Static Analyzer Notice",
                description=f"Language analyzer encountered an unhandled syntax structure: {str(e)}",
                why_it_matters="Complex macro structures or exotic syntax may partially bypass static AST checking.",
                start_line=1,
                end_line=1,
                source="static_analyzer",
                confidence=0.7,
                suggested_fix="Verify syntax compatibility with standard parsers.",
                suggested_code=None
            ))

        # Also run generic secret scanner if not already run
        if language.lower() not in ["generic"]:
            generic_findings = self.generic_analyzer.analyze(source_code, options)
            findings.extend(generic_findings)

        # Deduplicate findings by rule_id and start_line
        unique_findings: List[FindingBase] = []
        seen = set()
        for f in findings:
            key = (f.rule_id, f.start_line)
            if key not in seen:
                seen.add(key)
                unique_findings.append(f)

        # Compute code metrics
        metrics = analyzer.compute_metrics(source_code)

        # Calculate Quality Score
        # Deductions: critical: -25, high: -15, medium: -8, low: -3, informational: -1
        deductions = 0.0
        for f in unique_findings:
            if f.severity == "critical":
                deductions += 25.0
            elif f.severity == "high":
                deductions += 15.0
            elif f.severity == "medium":
                deductions += 8.0
            elif f.severity == "low":
                deductions += 3.0
            elif f.severity == "informational":
                deductions += 1.0

        quality_score = max(0.0, min(100.0, 100.0 - deductions))
        quality_score = round(quality_score, 1)

        return unique_findings, metrics, quality_score

static_analysis_service = StaticAnalysisService()
