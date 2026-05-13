---
description: "Check README.md for outdated information and missing features. Use when you want to audit and update project documentation."
model: "claude-haiku-4-5 (copilot)"
agent: "agent"
tools: [edit/editFiles, search/codebase]
---

Review [README.md](../../README.md) and verify it is accurate and complete.

## Steps

1. **Read the current README** in full.
2. **Scan the codebase** for any features, endpoints, components, config options, or scripts not yet documented:
   - `backend/src/` — check all Express routes and exported functions
   - `frontend/src/` — check all components and any user-visible behaviour
   - `package.json` files — check scripts and key dependencies
3. **Check each README section** against what you found:
   - *How it works* — does the flow still match the code?
   - *Tech stack* — any new or removed libraries?
   - *Setup* — are the commands and ports still correct?
   - *Project structure* — does the file tree match the workspace?
   - *API / endpoints* — any undocumented or changed endpoints?
4. **Update README.md** with any corrections or additions. Keep the existing tone and style.
5. Report a short summary of what changed (or confirm nothing needed updating).
