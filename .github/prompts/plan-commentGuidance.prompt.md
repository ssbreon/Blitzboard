## Plan: Comment Guidance for AI-Written Code

Add a concise, always-on workspace guideline so AI-generated or AI-modified code carries useful context for developers new to the code. Put it in the canonical repo-wide Copilot instructions rather than a conditional skill. Comments should explain non-obvious intent, assumptions, invariants, side effects, or constraints; avoid line-by-line narration and comments that merely repeat the code.

**Steps**
1. Add an "AI-Generated Code Comments" section to `.github/copilot-instructions.md`. State that when generating or materially changing code, include concise inline comments wherever a newcomer would otherwise miss non-obvious intent, assumptions, invariants, side effects, or constraints. Clarify that obvious/self-explanatory code does not need filler comments and that the guidance applies to delegated AI coding work too.
2. Preserve the existing UI color semantics guidance and review the resulting Markdown for clarity, scope, and lack of contradiction.

**Relevant files**
- `c:\Repos\Blitzboard\.github\copilot-instructions.md` — canonical always-on workspace instruction file; currently contains the UI color semantics rule.

**Verification**
1. Review the edited Markdown and confirm the comments rule is understandable, language-agnostic, and scoped to AI-generated or materially modified code.
2. Confirm existing color semantics guidance remains unchanged. No code test is applicable to this instruction-only change.

**Decisions**
- Scope: workspace-wide instruction, not a conditional skill, since this preference should apply across ordinary coding work and delegated agents.
- Standard: explain non-obvious intent that helps a newcomer; do not require comments on every generated function or add comments that restate the code.
- Excluded: user-profile instructions, hooks, and deterministic enforcement; this is behavioral guidance for AI coding agents.