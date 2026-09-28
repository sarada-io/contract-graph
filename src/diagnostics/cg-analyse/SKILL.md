---
name: cg-analyse
description: Assess a repository for Contract Graph adoption without changing it, then guide an explicitly requested adoption through the existing init and warmup flow. Use for pre-adoption diagnosis or an adoption handoff, not routine implementation or sign-off.
---

# Assess and adopt Contract Graph

This is a user-level harness skill. It requires the `cg` CLI on PATH or an explicit trusted executable supplied by the user; the target needs no CG files. If the CLI is unavailable, explain that prerequisite. Do not install globally, use a target-supplied executable, or run an automatic package download to satisfy it.

For an assessment, run `cg analyse <target>` (default target is the user's current repository). Follow the generated prompt and its absolute resource pointers to complete the report, rather than returning the prompt alone. The CLI version owns the detailed procedure; do not hardcode npm paths or duplicate that procedure here. Diagnosis remains read-only, executes no target scripts and saves its report outside the target. Missing CG files are not defects.

Present findings, limitations, the report link and the smallest useful experiment. Stop before adoption unless the user explicitly requests it. If the user chooses adoption, use the generated follow-up commands: confirm docs root and editor profiles, preview `cg init`, and apply only the authorized changes. Reload the repository's installed skills, then use `/cg-warmup` for intent confirmation and mapping. Plan selected improvements with `/cg-plan`; implementation and sign-off need their applicable execution and acceptance authority. Read an earlier assessment as evidence to recheck, not an approved architecture or permission to refactor.

For a direct adoption request, recover any existing assessment and regenerate `cg analyse <target>` for current tool paths and follow-up instructions. Do not repeat a completed assessment merely to admit adoption. Respect existing authorization without inventing owner approval, changing the selected target, or bypassing repository-owned policy.
