import fs from "node:fs";

const diffPath = process.argv[2];

if (!diffPath || !fs.existsSync(diffPath)) {
  console.log("- PR diff file not found. Skipping fallback review.");
  process.exit(0);
}

const rawDiff = fs.readFileSync(diffPath, "utf8");
if (!rawDiff.trim()) {
  console.log("- No changes found. Skipping fallback review.");
  process.exit(0);
}

const lines = rawDiff.split("\n");
const files = new Set();
let additions = 0;
let deletions = 0;
const findings = [];

for (const line of lines) {
  if (line.startsWith("+++ b/")) {
    const filePath = line.replace("+++ b/", "").trim();
    files.add(filePath);
    continue;
  }

  if (line.startsWith("+") && !line.startsWith("+++")) {
    additions += 1;
    const code = line.slice(1);

    if (/sk-proj-|AIza|api[_-]?key|secret/i.test(code)) {
      findings.push("Potential secret/key exposure detected in changes.");
    }
    if (/innerHTML\s*=|eval\(/.test(code)) {
      findings.push("XSS/code execution risk pattern (`innerHTML`, `eval`) detected.");
    }
    if (/TODO|FIXME/i.test(code)) {
      findings.push("Incomplete markers (`TODO`/`FIXME`) remain in code.");
    }
  } else if (line.startsWith("-") && !line.startsWith("---")) {
    deletions += 1;
  }
}

const uniqueFindings = [...new Set(findings)];
const fileList = [...files];

console.log("- Highlights");
console.log(
  `  - ${fileList.length} file(s) changed, +${additions}/-${deletions} lines.`
);
if (fileList.length > 0) {
  console.log(`  - Files: ${fileList.slice(0, 6).join(", ")}`);
}

console.log("- Issues");
if (uniqueFindings.length === 0) {
  console.log("  - No immediate risk signals found.");
} else {
  for (const finding of uniqueFindings.slice(0, 4)) {
    console.log(`  - ${finding}`);
  }
}

console.log("- Suggestions");
console.log("  - Include tests for core logic changes.");
console.log("  - Pair with human review for business logic validation.");
