#!/usr/bin/env node
/**
 * validate-ai-pr-body.mjs
 * Validates that a pull request body satisfies the required template contract.
 *
 * Required env vars:
 *   GH_TOKEN          — GitHub token with pull-requests:read permission
 *   PR_NUMBER         — Pull request number
 *   GITHUB_REPOSITORY — owner/repo
 *
 * Exit code 0 = body satisfies contract, 1 = contract violations found
 */

const { GH_TOKEN, PR_NUMBER, GITHUB_REPOSITORY } = process.env;

if (!GH_TOKEN || !PR_NUMBER || !GITHUB_REPOSITORY) {
  console.error("Missing required env vars: GH_TOKEN, PR_NUMBER, GITHUB_REPOSITORY");
  process.exit(1);
}

const apiBase = process.env.GITHUB_API_URL || "https://api.github.com";
const url = `${apiBase}/repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}`;

const res = await fetch(url, {
  headers: {
    Authorization: `Bearer ${GH_TOKEN}`,
    Accept: "application/vnd.github+json",
  },
});

if (!res.ok) {
  console.error(`Failed to fetch PR #${PR_NUMBER}: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const pr = await res.json();
const body = pr.body || "";

// Required sections from .github/pull_request_template.md
const requiredSections = [
  "## Summary",
  "## Test plan",
];

const violations = requiredSections.filter((section) => !body.includes(section));

if (violations.length === 0) {
  console.log(`PR #${PR_NUMBER} body satisfies the required template contract.`);
  process.exit(0);
}

console.error(`PR #${PR_NUMBER} body is missing required section(s):`);
for (const v of violations) {
  console.error(`  - ${v}`);
}
console.error("Update the PR description to include all required sections.");
process.exit(1);
