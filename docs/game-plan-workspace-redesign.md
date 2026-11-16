# Blitzboard Studio - Game Plan Workspace Redesign

## Purpose

Replace the folder-based Game Plan experience with a coach-centric Game Week
Workspace. Coaches should quickly see the opponent, preparation records and
counts, and the next activity linked to the Game Plan.

This specification incorporates the product decisions from the redesign review.
It does not authorize implementation of the deferred features below.

## Initial Release Scope

- Keep Team Schedule calendar navigation: select a Game event, then open its Game Plan.
- Replace the Game Plan folder tree with Overview, Installs, Practice, and Scout tabs.
- Default newly opened Game Plans to Overview.
- Show real records, counts, and linked schedule activities.
- Preserve existing editing, slideshow, duplication, deletion, and permissions.
- Do not display sample statistics, fabricated insights, or readiness percentages.
- Defer AI summaries, AI recommendations, and structured scouting intelligence.

## Game Week Definition

Game Week is the collection of activities associated with a specific Game Plan.
It is not calculated from season dates or calendar week boundaries.

- GamePlan remains the workspace root and is anchored to a Game TeamEvent.
- Other TeamEvents may optionally be linked to the Game Plan as activities.
- Examples include Practice, Walkthrough, Film Session, and Scout Meeting.
- These examples describe activities, not a requirement to rename existing event types.
- An event is not part of a Game Plan merely because it occurs near game day.
- Do not generate a numbered season-week label from dates.

## Workspace Header

Display the opponent prominently, game date and start time, Home/Away/Neutral
designation, and location when available. Derive a countdown from the game date,
with appropriate game-day and past-game states. Do not invent missing metadata.

Keep quick actions available across tabs:

- Add Install
- Add Practice Script
- Add Scout Report

Creation actions must collect the required unit and, for scripts, the parent
Practice event. Respect existing create/edit capabilities and read-only states.

## Overview Tab

### Preparation Summary

Show active install, practice-script, and scouting-report totals. Distinguish
install package counts from the number of selected play entries.

Show active record totals only. Do not add Draft/Ready workflow statuses, status
counts, overall readiness, unit readiness percentages, or percentage progress bars.

### Unit Summary

Summarize Offense, Defense, and Special Teams using actual content counts. Do not
label scouting-report counts as tendency counts.

### Next Activity

Display the next upcoming preparation TeamEvent explicitly linked to the current
Game Plan, ordered by its scheduled start. Show its name, date, time, and event
type, with access to the activity.

Do not substitute the next event on the team's general calendar. The anchor game
is shown in the header, not used as a fallback Game Plan activity. If no linked
upcoming activity exists, show an empty state and an authorized linking action.

Show linked script/play totals only when supported by real data. Do not describe
play-entry counts as repetitions unless explicit repetition data exists.

### Opponent Information

Use the game opponent and existing scouting records. Do not derive run/pass
percentages, favorite formations, coverages, alerts, or tendency percentages from
the presence or count of scout plays. Defer panels that lack meaningful data.

## Installs Tab

Replace unit folders with All, Offense, Defense, and Special Teams filters.
Display installs as cards with one-click access to the existing install editor.

Each card shows its name, unit, play-entry count, date added, and owner when
available. Include contained play names/previews when available without
misrepresenting missing or unavailable data.

Preserve play selection, ordering, groupings, slideshow, duplication, deletion,
and all existing permission restrictions.

## Practice Tab

Practice Scripts are first-class children of a Practice TeamEvent, rather than
independent game-level containers with a date inferred from their name.

- A Practice event may own multiple scripts.
- Show practices linked to this Game Plan in a chronological activity timeline.
- Show each practice's scripts beneath that event, with one-click editor access.
- Show script unit and actual play-entry counts.
- Link an existing Practice event or create one through the existing schedule flow.
- Creating a script requires selecting or creating its parent Practice event.
- A script is surfaced in this Game Plan through its linked parent Practice event.
- Preserve existing scripts and their contents during the ownership transition.
- Keep legacy unassigned scripts accessible in an Unassigned section until assigned.
- Never silently assign legacy scripts to a practice based on dates or names.

Existing groupings may supply practice-period breakdowns where available. Do not
fabricate Team, Inside Run, 7-on-7, or other period categories.

Summarize actual scripted play entries by unit. Repetition-based KPIs remain
deferred until repetitions have an explicit data definition and stored values.

## Scout Tab

In the initial release, preserve existing scouting records, their current editing
experience, and their play diagrams. Provide unit filters and one-click access.
Do not introduce a separate report entity solely for this GUI refactor: the
current Scouting Reports UI uses scout-play-backed records.

### Future Scouting Direction

A Scouting Report will evolve into an enriched Scout Play centered on a formation.
The coach builds the scout formation/play and adds substantial free-text fields
for notes and tendencies about it. For a defensive preparation context, this will
typically describe an opponent's offensive formation.

This future refactor must retain the diagram and coaching context. It does not
imply automated tendency extraction, statistical percentages, or AI generation.
Structured tendency entities, intelligence panels, and alerts are deferred.

## Unified Search

Reuse Blitzboard's existing unified search infrastructure. Do not build a separate
Game Plan search engine or independent index.

Inside a Game Plan, default search scope to the current Game Plan, including:

- Installs
- Practice Scripts associated through linked Practice events
- Scout Plays
- Scouting Reports
- Related Playbook references

Related Playbooks are those referenced by Game Plan content, not every Playbook in
the workspace. Avoid duplicate hits when a Scouting Report and Scout Play refer to
the same underlying record.

Allow users to expand scope to Current Season, All Playbooks, or Entire Workspace.
Current Season requires an explicit season definition; do not silently substitute
a calendar year. Resolve season membership before enabling that scope.

Results must indicate source type and parent Game Plan context where applicable,
including shared contexts if a record belongs to more than one Game Plan. Search
and navigation must retain workspace isolation and existing access controls.

If scouting tendencies become structured entities later, index them directly in
the unified infrastructure rather than searching only report text.

## Responsive Layout and Visual Semantics

- Use top-level tabs on desktop and horizontally scrollable tabs on mobile/tablet.
- Render unit filters as the shared DataGrid category-filter pills: use the
	`data-grid-category-filter`, `category-badge`, and `category-filter-badge`
	classes, category color tokens, and `aria-pressed` selection semantics. Do not
	create a separate button shape or selected-state treatment for these filters.
- Stack content on narrow screens; do not retain a Game Plan navigation tree.
- Keep quick actions accessible without obscuring headings or content.
- Use existing blue tokens, preferably --navy-light with white text, for selection.
- Reserve --primary-button orange for primary actions, never selected states.
- Label statuses with text; do not rely on color alone.
- Support keyboard navigation, visible focus, loading, error, empty, and read-only states.

## Technical Scope and Compatibility

The layout refactor is primarily frontend work, but the approved behavior also
requires targeted persistence/API support for Practice-event script ownership,
Game Plan activity associations, and unified search scopes and result context.
Workflow status is not part of the initial release. Existing Active/Archived
record lifecycle controls remain. Existing storage primitives may be reused; a
broad backend redesign is not a goal, and a frontend-only implementation is not
assumed.

Game Plan activities support multiple Game Plan links. A practice that owns
scripts cannot be deleted or unlinked from its last Game Plan until the scripts
are reassigned or deleted. Game Plan deletion also enforces this safeguard and
removes that Game Plan's links from surviving activities. A shared practice and
its scripts remain available through their other linked Game Plans.

GamePlan remains the root. Existing install and script content may retain its
playbook-backed storage while explicit event ownership is added. Preserve record
identities and existing content; define compatibility behavior for duplication,
deletion, and archived parents before changing those relationships.

Do not change the Team Schedule calendar experience. Reuse its event workflows for
creation/editing, adding only the associations needed by the Game Plan workspace.

## Acceptance Criteria

- Opening a game from the unchanged calendar opens its Game Plan Overview.
- The opponent, game details, active content counts, and next linked activity are visible.
- Counts reflect real active records and refresh after mutations.
- No Draft/Ready workflow status, readiness percentage, or fabricated scouting intelligence appears.
- Active/Archived remains the only record lifecycle state exposed in the workspace.
- Installs, practice scripts, and scouting records open with one click from their lists.
- Practice Scripts belong to Practice events; legacy unassigned scripts remain accessible.
- Unlinked calendar events never appear as the Game Plan's Next Activity.
- Search defaults to this Game Plan and reuses the existing unified infrastructure.
- Search results show source type and applicable Game Plan context.
- Existing editing, slideshow, duplication, deletion, and permissions continue to work.
- Desktop, tablet, and mobile layouts remain usable without the folder tree.