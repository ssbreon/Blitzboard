# Blitzboard Studio Guidelines

## UI Color Semantics

- Reserve primary orange (`--primary-button`) for primary action buttons, such as New Event or Save. Never use it to indicate selected or active states.
- Use existing blue tokens, preferably `--navy-light` with white text, for selected view switches, tabs, options, and highlighted calendar month headers.
- Preserve this distinction when generating or modifying UI code, including work delegated to agents or subagents. Keep existing non-orange selection styling unless a change is requested.

## Filter Pill Semantics

- Reuse the DataGrid category-filter pill pattern for category/unit filter groups: `.data-grid-category-filter` layout, `.category-badge.category-filter-badge` buttons, `getCategoryBadgeStyle` color tokens, and `aria-pressed` for selection.
- Do not replace these pills with generic rectangular buttons or blue active-state styling. Keep selection expressed through the badge's category color and active pill treatment.