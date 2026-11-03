# Blitzboard Studio Guidelines

## UI Color Semantics

- Reserve primary orange (`--primary-button`) for primary action buttons, such as New Event or Save. Never use it to indicate selected or active states.
- Use existing blue tokens, preferably `--navy-light` with white text, for selected view switches, tabs, options, and highlighted calendar month headers.
- Preserve this distinction when generating or modifying UI code, including work delegated to agents or subagents. Keep existing non-orange selection styling unless a change is requested.