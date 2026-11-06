import {
  Finding,
  Review,
  ReviewMetrics,
  SupportedLanguage,
  User,
  AnalyticsOverview,
  AnalyticsTrends,
  FindingStatus,
} from '@/types';

export const CLIENT_SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  {
    id: 'python',
    name: 'Python',
    extension: '.py',
    monaco_lang: 'python',
    ast_analysis: true,
    security_scanning: true,
    style_linting: true,
    ai_remediation: true,
    sample_snippet: `print(f'Total: {total}')

category_summary():
    summary = {}

    for expense in expenses:
        category = expense["category"]
        amount = expense["amount"]

        if category in summary:
            summary[category] += amount
        else:
            summary[category] = amount

    print("====== CATEGORY SUMMARY ======")

    for category, amount in summary.items():
        print(f"{category}: ₹{amount:.2f}")

    print()
`,
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: '.js',
    monaco_lang: 'javascript',
    ast_analysis: true,
    security_scanning: true,
    style_linting: true,
    ai_remediation: true,
    sample_snippet: `function processUser(input) {
    var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";
    localStorage.setItem("token", token);
    document.getElementById("output").innerHTML = input;
    if (input == 0) {
        eval(input);
    }
}
`,
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    extension: '.ts',
    monaco_lang: 'typescript',
    ast_analysis: true,
    security_scanning: true,
    style_linting: true,
    ai_remediation: true,
    sample_snippet: `interface UserData {
    apiKey: string;
    payload: any;
}

export function executeAction(data: UserData) {
    const key = "AKIA1234567890EXAMPLE";
    const fn = new Function(data.payload);
    return fn();
}
`,
  },
  {
    id: 'java',
    name: 'Java',
    extension: '.java',
    monaco_lang: 'java',
    ast_analysis: true,
    security_scanning: true,
    style_linting: true,
    ai_remediation: true,
    sample_snippet: `public class DatabaseHelper {
    public void getUser(String userId, java.sql.Statement stmt) throws Exception {
        String query = "SELECT * FROM users WHERE id = '" + userId + "'";
        stmt.executeQuery(query);
    }
}
`,
  },
  {
    id: 'cpp',
    name: 'C / C++',
    extension: '.cpp',
    monaco_lang: 'cpp',
    ast_analysis: true,
    security_scanning: true,
    style_linting: true,
    ai_remediation: true,
    sample_snippet: `#include <iostream>
#include <cstring>

void copyBuffer(char* input) {
    char buffer[16];
    strcpy(buffer, input); // Buffer overflow vulnerability
}
`,
  },
  {
    id: 'go',
    name: 'Go',
    extension: '.go',
    monaco_lang: 'go',
    ast_analysis: true,
    security_scanning: true,
    style_linting: true,
    ai_remediation: true,
    sample_snippet: `package main

import "os/exec"

func RunCmd(arg string) {
    exec.Command("sh", "-c", arg).Run()
}
`,
  },
  {
    id: 'rust',
    name: 'Rust',
    extension: '.rs',
    monaco_lang: 'rust',
    ast_analysis: true,
    security_scanning: true,
    style_linting: true,
    ai_remediation: true,
    sample_snippet: `pub fn execute_untrusted(ptr: *const u8) {
    unsafe {
        // Raw pointer dereference
        let val = *ptr;
    }
}
`,
  },
];

// Helper to compute indentation
function getIndent(line: string): string {
  const match = line.match(/^(\s*)/);
  return match ? match[1] : '';
}

// In-place replacement preserving indentation
export function applyReplacement(
  sourceCode: string,
  startLine: number,
  endLine: number,
  replacementCode: string
): string {
  const lines = sourceCode.split('\n');
  if (lines.length === 0 || startLine < 1 || startLine > lines.length) {
    return sourceCode;
  }

  const targetLine = lines[startLine - 1];
  const baseIndent = getIndent(targetLine);

  const repLines = replacementCode.split('\n');
  const formattedRep = repLines.map((rline, i) => {
    if (i > 0 && rline.startsWith(baseIndent)) {
      return rline;
    }
    if (!rline.trim()) {
      return '';
    }
    if (!rline.startsWith(' ') && !rline.startsWith('\t')) {
      return baseIndent + rline;
    }
    return rline;
  });

  const startIdx = startLine - 1;
  const deleteCount = Math.max(1, endLine - startLine + 1);
  lines.splice(startIdx, deleteCount, ...formattedRep);
  return lines.join('\n');
}

// Client-side static analyzer for all languages
export function analyzeCodeClient(
  sourceCode: string,
  language: string,
  options: Record<string, boolean> = {}
): Finding[] {
  const findings: Finding[] = [];
  const lines = sourceCode.split('\n');
  const lang = language.toLowerCase();

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const stripped = line.trim();
    const indent = getIndent(line);

    // ── PYTHON CHECKS ──
    if (lang === 'python') {
      // Missing def
      if (/^(?:async\s+)?[a-zA-Z_]\w*\s*\([^)]*\)\s*(?:->\s*[^:]+)?\s*:\s*$/.test(stripped)) {
        const isAsync = stripped.startsWith('async ');
        const suggested = isAsync
          ? `${indent}async def ${line.trimStart().slice(6)}`
          : `${indent}def ${line.trimStart()}`;
        findings.push({
          id: `f-${lineNum}-${Math.random().toString(36).substring(2, 7)}`,
          review_id: '',
          rule_id: 'SYN-PY-001',
          category: 'bug',
          severity: 'critical',
          title: 'Syntax Error: invalid syntax',
          description: `Missing 'def' keyword at line ${lineNum}. In Python, function definitions require the 'def' keyword: change '${stripped}' to '${suggested.trim()}'.`,
          why_it_matters:
            "Functions in Python must start with the 'def' keyword. Writing 'name():' without 'def' is treated as an invalid statement with a misplaced colon, halting program execution.",
          file_path: 'main.py',
          start_line: lineNum,
          end_line: lineNum,
          source: 'ast_visitor',
          confidence: 1.0,
          suggested_fix: `Add the missing 'def' keyword: '${suggested.trim()}'`,
          suggested_code: suggested,
          original_code: line,
          status: 'open',
          created_at: new Date().toISOString(),
        });
      }

      // eval / exec
      if (/\beval\s*\(/.test(line)) {
        findings.push({
          id: `f-${lineNum}-${Math.random().toString(36).substring(2, 7)}`,
          review_id: '',
          rule_id: 'SEC-PY-001',
          category: 'security',
          severity: 'critical',
          title: "Critical: Dangerous dynamic execution via 'eval()'",
          description: "Calling 'eval()' executes arbitrary strings directly in the Python runtime, allowing complete Remote Code Execution (RCE).",
          why_it_matters: 'If untrusted input reaches this call, an attacker can execute arbitrary commands or take over the server.',
          file_path: 'main.py',
          start_line: lineNum,
          end_line: lineNum,
          source: 'ast_visitor',
          confidence: 0.99,
          suggested_fix: "Replace 'eval()' with safe data parsing like ast.literal_eval() or json.loads().",
          suggested_code: `${indent}import ast\n${indent}safe_result = ast.literal_eval('1 + 1')`,
          original_code: line,
          status: 'open',
          created_at: new Date().toISOString(),
        });
      }

      // range(len(x))
      if (/range\s*\(\s*len\s*\(/.test(line)) {
        findings.push({
          id: `f-${lineNum}-${Math.random().toString(36).substring(2, 7)}`,
          review_id: '',
          rule_id: 'PERF-PY-005',
          category: 'performance',
          severity: 'low',
          title: "Optimization: Inefficient loop using 'range(len(...))'",
          description: 'Iterating with range(len(...)) and indexing manually is slower than direct sequence iteration or enumerate().',
          why_it_matters: "Adds unnecessary integer indexing overhead on every iteration instead of using Python's fast C-level iterator protocol.",
          file_path: 'main.py',
          start_line: lineNum,
          end_line: lineNum,
          source: 'ast_visitor',
          confidence: 0.92,
          suggested_fix: "Use 'for i, item in enumerate(items):' or iterate directly.",
          suggested_code: `${indent}for i, item in enumerate(items):`,
          original_code: line,
          status: 'open',
          created_at: new Date().toISOString(),
        });
      }
    }

    // ── JAVASCRIPT / TYPESCRIPT CHECKS ──
    if (lang === 'javascript' || lang === 'typescript') {
      if (/\beval\s*\(/.test(line)) {
        findings.push({
          id: `f-${lineNum}-${Math.random().toString(36).substring(2, 7)}`,
          review_id: '',
          rule_id: 'SEC-JS-001',
          category: 'security',
          severity: 'critical',
          title: "Critical: Arbitrary code execution via 'eval()'",
          description: 'Direct execution of strings as JavaScript creates high-risk DOM XSS and arbitrary code injection vectors.',
          why_it_matters: 'If attacker-controlled data reaches eval(), an adversary can hijack user sessions and steal auth tokens.',
          file_path: 'main.js',
          start_line: lineNum,
          end_line: lineNum,
          source: 'static_analyzer',
          confidence: 0.98,
          suggested_fix: 'Parse JSON strings safely using JSON.parse().',
          suggested_code: line.replace('eval(', 'JSON.parse('),
          original_code: line,
          status: 'open',
          created_at: new Date().toISOString(),
        });
      }

      if (/\.innerHTML\s*=/.test(line)) {
        findings.push({
          id: `f-${lineNum}-${Math.random().toString(36).substring(2, 7)}`,
          review_id: '',
          rule_id: 'SEC-JS-003',
          category: 'security',
          severity: 'high',
          title: 'Cross-Site Scripting (XSS) via .innerHTML assignment',
          description: 'Assigning raw HTML strings directly to innerHTML bypasses browser sanitization and enables Cross-Site Scripting (XSS).',
          why_it_matters: "Malicious script tags or payload attributes execute directly in the victim's browser context.",
          file_path: 'main.js',
          start_line: lineNum,
          end_line: lineNum,
          source: 'static_analyzer',
          confidence: 0.95,
          suggested_fix: 'Use .textContent for plaintext or sanitize with DOMPurify.',
          suggested_code: line.replace('.innerHTML =', '.textContent ='),
          original_code: line,
          status: 'open',
          created_at: new Date().toISOString(),
        });
      }
    }

    // ── GO CHECKS ──
    if (lang === 'go') {
      if (/exec\.Command\s*\(\s*["'](?:sh|bash)["']\s*,\s*["']-[cC]["']/.test(line)) {
        findings.push({
          id: `f-${lineNum}-${Math.random().toString(36).substring(2, 7)}`,
          review_id: '',
          rule_id: 'SEC-GO-001',
          category: 'security',
          severity: 'critical',
          title: 'Command Injection via shell wrapper in exec.Command()',
          description: "Passing untrusted arguments to 'sh -c' executes a shell interpreter that interprets metacharacters, enabling Remote Code Execution (RCE).",
          why_it_matters: 'An adversary can inject arbitrary shell commands to compromise the host server.',
          file_path: 'main.go',
          start_line: lineNum,
          end_line: lineNum,
          source: 'security_scanner',
          confidence: 0.96,
          suggested_fix: "Invoke the target executable directly without 'sh -c'.",
          suggested_code: `${indent}cmd := exec.Command("echo", arg)\n${indent}_ = cmd.Run()`,
          original_code: line,
          status: 'open',
          created_at: new Date().toISOString(),
        });
      }
    }

    // ── RUST CHECKS ──
    if (lang === 'rust') {
      if (/\*\s*([a-zA-Z_]\w*)/.test(line) && !/is_null/.test(line)) {
        const ptrMatch = line.match(/\*\s*([a-zA-Z_]\w*)/);
        const ptrName = ptrMatch ? ptrMatch[1] : 'ptr';
        findings.push({
          id: `f-${lineNum}-${Math.random().toString(36).substring(2, 7)}`,
          review_id: '',
          rule_id: 'SEC-RS-001',
          category: 'security',
          severity: 'critical',
          title: `Unchecked raw pointer dereference '*${ptrName}'`,
          description: 'Dereferencing raw pointers without validating against null causes segmentation faults or arbitrary memory access.',
          why_it_matters: 'Can be exploited to corrupt memory or execute code if attacker controls pointer values.',
          file_path: 'main.rs',
          start_line: lineNum,
          end_line: lineNum,
          source: 'security_scanner',
          confidence: 0.95,
          suggested_fix: `Verify '!${ptrName}.is_null()' before dereferencing.`,
          suggested_code: `${indent}if !${ptrName}.is_null() {\n${indent}    let val = unsafe { *${ptrName} };\n${indent}}`,
          original_code: line,
          status: 'open',
          created_at: new Date().toISOString(),
        });
      }
    }

    // ── JAVA CHECKS ──
    if (lang === 'java') {
      if (/(?:executeQuery|executeUpdate)\s*\(.*?\+/.test(line)) {
        findings.push({
          id: `f-${lineNum}-${Math.random().toString(36).substring(2, 7)}`,
          review_id: '',
          rule_id: 'SEC-JAVA-002',
          category: 'security',
          severity: 'critical',
          title: 'SQL Injection via string concatenation in query',
          description: 'Concatenating user-controlled parameters into raw SQL strings allows attackers to alter database queries.',
          why_it_matters: 'Enables data exfiltration, authentication bypass, and database deletion.',
          file_path: 'Main.java',
          start_line: lineNum,
          end_line: lineNum,
          source: 'security_scanner',
          confidence: 0.95,
          suggested_fix: "Use PreparedStatement with parameterized '?' placeholders.",
          suggested_code: `${indent}PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?");\n${indent}stmt.setString(1, userId);`,
          original_code: line,
          status: 'open',
          created_at: new Date().toISOString(),
        });
      }
    }

    // ── C/C++ CHECKS ──
    if (lang === 'c' || lang === 'cpp') {
      if (/\bstrcpy\s*\(/.test(line)) {
        findings.push({
          id: `f-${lineNum}-${Math.random().toString(36).substring(2, 7)}`,
          review_id: '',
          rule_id: 'SEC-CPP-001',
          category: 'security',
          severity: 'critical',
          title: "Buffer Overflow: Unbounded buffer copy via 'strcpy()'",
          description: 'strcpy() does not check destination buffer boundaries, enabling buffer overflow vulnerabilities.',
          why_it_matters: 'Can overwrite stack return addresses, allowing attackers to execute arbitrary shellcode.',
          file_path: 'main.cpp',
          start_line: lineNum,
          end_line: lineNum,
          source: 'security_scanner',
          confidence: 0.98,
          suggested_fix: 'Replace strcpy() with strncpy() or safe string types.',
          suggested_code: `${indent}strncpy(buffer, input, sizeof(buffer) - 1);\n${indent}buffer[sizeof(buffer) - 1] = '\\0';`,
          original_code: line,
          status: 'open',
          created_at: new Date().toISOString(),
        });
      }
    }

    // ── GENERIC SECRET CHECKS ──
    if (/AKIA[0-9A-Z]{16}/.test(line)) {
      findings.push({
        id: `f-${lineNum}-${Math.random().toString(36).substring(2, 7)}`,
        review_id: '',
        rule_id: 'SEC-GEN-AWS',
        category: 'security',
        severity: 'critical',
        title: 'Hardcoded AWS Access Key ID',
        description: 'AWS Access Key ID detected in plaintext source code.',
        why_it_matters: 'Anyone with access to the source code can impersonate your AWS account and provision or delete infrastructure.',
        file_path: 'main',
        start_line: lineNum,
        end_line: lineNum,
        source: 'security_scanner',
        confidence: 0.99,
        suggested_fix: 'Store credentials in environment variables.',
        suggested_code: line.replace(/['"]AKIA[0-9A-Z]{16}['"]/, "process.env.AWS_ACCESS_KEY_ID || ''"),
        original_code: line,
        status: 'open',
        created_at: new Date().toISOString(),
      });
    }
  });

  return findings;
}

// Compute code metrics
export function computeMetricsClient(sourceCode: string): ReviewMetrics {
  const lines = sourceCode.split('\n');
  const loc = lines.length;
  const blank_lines = lines.filter((l) => !l.trim()).length;
  const comment_lines = lines.filter((l) => {
    const s = l.trim();
    return s.startsWith('#') || s.startsWith('//') || s.startsWith('/*') || s.startsWith('*');
  }).length;
  const code_lines = Math.max(1, loc - blank_lines - comment_lines);
  const cyclomatic_complexity = Math.max(1, (sourceCode.match(/\b(if|for|while|case|catch|except)\b/g) || []).length + 1);
  const maintainability_index = Math.max(0, Math.min(100, Math.round(100 - cyclomatic_complexity * 3)));

  return {
    loc,
    code_lines,
    blank_lines,
    comment_lines,
    cyclomatic_complexity,
    maintainability_index,
  };
}

// LocalStorage helpers for mock reviews
const STORAGE_KEY_REVIEWS = 'codeguard_local_reviews';

export function getLocalReviews(): Review[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVIEWS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalReview(review: Review): void {
  const list = getLocalReviews().filter((r) => r.id !== review.id);
  list.unshift(review);
  localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(list));
}

// Mock User
export const DEMO_USER: User = {
  id: 'usr_demo_admin_001',
  name: 'Demo Engineer',
  email: 'demo@codeguard.ai',
  role: 'developer',
  is_active: true,
  preferences: {
    theme: 'dark',
    default_language: 'python',
    enable_security_checks: true,
    enable_performance_checks: true,
    enable_style_checks: true,
    enable_ai_explanation: true,
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
