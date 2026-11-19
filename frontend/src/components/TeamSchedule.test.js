import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { ScheduleView, defaultRelatedGameId, duplicateScheduleEventPayload, practiceGamePlans, practiceGamePlanRange, scheduleMonths, schedulePeriod, scheduleLoadPeriod, shiftScheduleDate, buildCalendarDays } from '../utils/scheduleCalendar.js'
import { gamePreparation, generatedPracticeScriptPayload, linkableGamePlanActivities, nextPreparationActivity, scoutPlayName } from '../utils/gamePlanWorkspace.js'

test('game preparation uses explicit activity links and preserves unassigned legacy scripts', () => {
  const events = [
    { id: 'unlinked', eventType: 'Practice', eventDate: '2026-11-10', startTime: '15:00' },
    { id: 'practice', eventType: 'Practice', eventDate: '2026-11-11', startTime: '15:00', gamePlanIds: ['game'] },
    { id: 'practice-two', eventType: 'Practice', eventDate: '2026-11-12', startTime: '15:00', gamePlanIds: ['game'] },
    { id: 'film', eventType: 'Film Review', eventDate: '2026-11-12', gamePlanIds: ['game'] },
  ]
  const books = [
    { id: 'install', gamePlanId: 'game', gameCardId: 'offense-installs' },
    { id: 'legacy', gamePlanId: 'game', gameCardId: 'offense-scout' },
    { id: 'shared', gamePlanId: 'other', practiceEventId: 'practice', gameCardId: 'defense-scout' },
    { id: 'unrelated', gamePlanId: 'game', practiceEventId: 'unlinked', gameCardId: 'offense-scout' },
    { id: 'multi-practice', gameCardId: 'offense-scout', practiceEventIds: ['practice', 'practice-two'] },
  ]
  const prep = gamePreparation('game', books, events, [])
  assert.deepEqual(prep.scripts.map((item) => item.id), ['legacy', 'shared', 'multi-practice'])
  assert.deepEqual(prep.installs.map((item) => item.id), ['install'])
  assert.equal(nextPreparationActivity(prep.activities, new Date('2026-11-11T12:00')).id, 'practice')
  assert.equal(nextPreparationActivity(prep.activities, new Date('2026-11-13T12:00')), null)
  const practice = { id: 'practice-id', name: 'Wednesday Practice', eventDate: '2026-11-11' }
  assert.deepEqual(generatedPracticeScriptPayload(practice, 'Offense'), {
    name: 'Wednesday Practice - Offense Script', category: 'Offense', year: 2026,
    gameCardId: 'offense-scout', practiceEventIds: ['practice-id'],
  })
  assert.equal(generatedPracticeScriptPayload(practice, 'Defense').gameCardId, 'defense-scout')
  assert.equal(generatedPracticeScriptPayload(practice, 'Special Teams').gameCardId, 'special-teams-scout')
  assert.equal(generatedPracticeScriptPayload(practice, 'No'), null)
})

test('events can relate to active Game Plans on the same day and in the following seven days', () => {
  assert.deepEqual(practiceGamePlanRange('2026-11-11'), { start: '2026-11-11', end: '2026-11-18' })
  const games = practiceGamePlans('2026-11-11', [
    { id: 'same-day', gameDate: '2026-11-11' },
    { id: 'next-day', gameDate: '2026-11-12' },
    { id: 'day-seven', gameDate: '2026-11-18' },
    { id: 'day-eight', gameDate: '2026-11-19' },
    { id: 'archived', gameDate: '2026-11-14', recordStatus: 'Archived' },
  ])
  assert.deepEqual(games.map((game) => game.id), ['same-day', 'next-day', 'day-seven'])
  assert.equal(defaultRelatedGameId(games), '')
  assert.equal(defaultRelatedGameId([games[0]]), 'same-day')
  assert.equal(defaultRelatedGameId([]), '')
})

test('schedule periods, navigation and shared calendar rendering', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../../', import.meta.url)), define: { 'import.meta.env.DEV': true, 'import.meta.env.VITE_AUTH_MODE': JSON.stringify('development'), 'import.meta.env.VITE_DEV_AUTH_SECRET': JSON.stringify('test-secret') }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' })
  try {
    const { MonthCalendar, YearCalendar, ScheduleEventDialog } = await server.ssrLoadModule('/src/components/TeamSchedule.jsx')
    const { CategoryBadge, getCategoryBadgeStyle } = await server.ssrLoadModule('/src/components/CategoryBadge.jsx')
    const { GamePlanHeader, GamePlanUnitFilter, GamePlanWorkspace } = await server.ssrLoadModule('/src/components/GamePlanWorkspace.jsx')
    const { PracticeSheet, ACTIVITY_GROUPS, PRACTICE_PLAN_GRID_COLUMNS, practicePeriodEndTime, practicePeriodGroupBreakdown, cascadePracticePeriodStarts, reorderPracticePeriods, reorderPracticeSheetAttachments, groupPracticeActivities, summarizePracticeActivities, practicePlanGridRows, practiceSheetTimeLabel, practiceSheetDateLabel, defaultPracticePeriodStart } = await server.ssrLoadModule('/src/components/PracticeSheet.jsx')
    const { PracticeScriptPlayGrid } = await server.ssrLoadModule('/src/components/PracticeScriptPlayGrid.jsx')
    const { DataGrid } = await server.ssrLoadModule('/src/components/DataGrid.jsx')
    assert.deepEqual(getCategoryBadgeStyle('Game - Away'), getCategoryBadgeStyle('Game'))
    assert.deepEqual(getCategoryBadgeStyle('Team Meal'), getCategoryBadgeStyle('Team Meeting'))
    assert.ok(renderToStaticMarkup(createElement(CategoryBadge, { value: 'Game - Away' })).includes('>Game - Away</span>'))
    assert.equal(scoutPlayName({ offFormation: 'ACE HAIL', offPlay: 'GAMECOCKS LEFT', defFront: '4-2-5', defCoverage: 'C2' }), 'ACE HAIL GAMECOCKS LEFT vs 4-2-5 C2')
    assert.equal(scoutPlayName({ offFormation: 'ACE HAIL' }), 'ACE HAIL')
    assert.deepEqual(ACTIVITY_GROUPS, ['Team', 'QB', 'RB', 'WR', 'OL', 'DB', 'LB', 'DLINE'])
    assert.equal(practiceSheetDateLabel('2026-11-18'), new Date('2026-11-18T00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }))
    assert.equal(practiceSheetTimeLabel('15:40'), new Date(2000, 0, 1, 15, 40).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }))
    assert.equal(defaultPracticePeriodStart('15:40'), '15:40')
    assert.equal(defaultPracticePeriodStart('15:40:00'), '15:40')
    assert.equal(defaultPracticePeriodStart(''), '15:30')
    const scoutPlayGrid = renderToStaticMarkup(createElement(PracticeScriptPlayGrid, {
      api: {}, playbookId: 'script', title: 'Scout Plays', fetchRows: () => Promise.resolve([]), reloadToken: null,
      canEdit: true, suggestionLists: {
        offFormation: ['Trips Right'], offPlay: ['24 Zone'], defFront: ['Even Front'], defCoverage: ['Cover 3'],
      },
    }))
    for (const [field, value] of Object.entries({ offFormation: 'Trips Right', offPlay: '24 Zone', defFront: 'Even Front', defCoverage: 'Cover 3' })) {
      assert.ok(scoutPlayGrid.includes(`id="scout-${field}-suggestions"`))
      assert.ok(scoutPlayGrid.includes(`<option value="${value}"></option>`))
    }
    assert.equal(summarizePracticeActivities([{ group: 'QB', name: 'Team Period', coach: 'Smith' }, { group: 'Team', name: 'Dynamic' }, { group: 'QB', name: 'Dropback' }]), 'Team: Dynamic\nQB: Team Period (Smith), Dropback')
    assert.equal(summarizePracticeActivities([]), '—')
    assert.deepEqual(groupPracticeActivities([{ group: 'QB', name: 'Dropback', coach: 'Smith' }, { group: 'Team', name: 'Dynamic' }]), [
      { group: 'Team', activities: [{ name: 'Dynamic', coach: '' }] },
      { group: 'QB', activities: [{ name: 'Dropback', coach: 'Smith' }] },
    ])
    assert.equal(practicePeriodGroupBreakdown(), 'No')
    assert.equal(practicePeriodGroupBreakdown({}), 'No')
    assert.equal(practicePeriodGroupBreakdown({ groupBreakdown: 'Yes' }), 'Yes')
    assert.deepEqual(reorderPracticeSheetAttachments(['install-a', 'script-b', 'install-c'], 'install-c', 'install-a'), ['install-c', 'install-a', 'script-b'])
    assert.deepEqual(reorderPracticeSheetAttachments(['install-a', 'script-b'], 'missing', 'install-a'), ['install-a', 'script-b'])
    assert.deepEqual(PRACTICE_PLAN_GRID_COLUMNS.map((column) => column.header), ['Start', 'Minutes', 'Period', 'Activities'])
    const practiceGridRows = practicePlanGridRows([
      { id: 'offense', name: 'Offense', startTime: '15:30', duration: '20', activities: [{ group: 'QB', name: 'Dropback', coach: 'Smith' }], scripts: [{ id: 'play-1', offPlay: 'H-JET' }, { id: 'play-2', offPlay: 'PLUTO' }] },
      { id: 'defense', name: 'Defense', startTime: '15:50', duration: '10', activities: [{ group: 'LB', name: 'Pursuit' }], scripts: [] },
    ])
    assert.deepEqual(practiceGridRows.map(({ start, minutes, period, activities }) => ({ start, minutes, period, activities })), [
      { start: '15:30', minutes: '20', period: 'Offense', activities: [{ group: 'QB', activities: [{ name: 'Dropback', coach: 'Smith' }] }] },
      { start: '15:50', minutes: '10', period: 'Defense', activities: [{ group: 'LB', activities: [{ name: 'Pursuit', coach: '' }] }] },
    ])
    assert.equal(practicePeriodEndTime('15:30', '20'), '15:50')
    assert.equal(practicePeriodEndTime('23:50', '20'), '00:10')
    assert.equal(practicePeriodEndTime('15:30', ''), '')
    assert.deepEqual(cascadePracticePeriodStarts([
      { startTime: '15:30', duration: '30' },
      { startTime: '15:50', duration: '15' },
      { startTime: '16:05', duration: '10' },
    ]).map((period) => period.startTime), ['15:30', '16:00', '16:15'])
    assert.deepEqual(cascadePracticePeriodStarts([
      { startTime: '16:00', duration: '20' },
      { startTime: '16:20', duration: '15' },
      { startTime: '16:35', duration: '10' },
    ]).map((period) => period.startTime), ['16:00', '16:20', '16:35'])
    assert.deepEqual(reorderPracticePeriods([
      { id: 'one', startTime: '15:30', duration: '20' },
      { id: 'two', startTime: '15:50', duration: '15' },
      { id: 'three', startTime: '16:05', duration: '10' },
    ], 2, 0).map(({ id, startTime }) => ({ id, startTime })), [
      { id: 'three', startTime: '15:30' },
      { id: 'one', startTime: '15:40' },
      { id: 'two', startTime: '16:00' },
    ])
    const loadingPractice = renderToStaticMarkup(createElement(PracticeSheet, { api: {}, eventId: 'practice', canEdit: true }))
    assert.ok(loadingPractice.includes('Loading practice'))
    assert.ok(!loadingPractice.includes('>Back</button>'))
    const workspaceMarkup = renderToStaticMarkup(createElement(GamePlanWorkspace, {
      api: {}, game: { id: 'game', opponent: 'Falcons <test>', gameDate: '2026-11-13' },
      readOnly: true, cards: [],
    }))
    assert.ok(workspaceMarkup.includes('Falcons &lt;test&gt;'))
    assert.ok(!workspaceMarkup.includes('gp-tabs'))
    assert.ok(!workspaceMarkup.includes('gp-filters'))
    assert.ok(!workspaceMarkup.includes('game-plan-folder-tree'))
    assert.ok(!workspaceMarkup.includes('>Install</button>'))
    assert.ok(!workspaceMarkup.includes('82%'))
    const gamePlanHeader = renderToStaticMarkup(createElement(GamePlanHeader, {
      game: { opponent: 'Falcons', gameDate: '2020-11-13', gameSite: 'Away', location: 'Stadium', result: 'W 37-12' },
      onBack: () => {},
    }))
    assert.ok(gamePlanHeader.includes('gp-header'))
    assert.ok(gamePlanHeader.includes('@ Falcons'))
    assert.ok(gamePlanHeader.includes('W 37-12'))
    assert.ok(gamePlanHeader.includes('Back to Game Plan'))
    const createPracticeDialog = renderToStaticMarkup(createElement(ScheduleEventDialog, {
      api: {}, initialDate: '2026-11-10', canEdit: true, canCreateGame: false, canDelete: false,
      locationSuggestions: ['Marcal Paper Field', 'Kish Bank Field'],
      onCancel: () => {}, onSave: () => {},
    }))
    assert.ok(createPracticeDialog.includes('Related Game'))
    assert.ok(createPracticeDialog.includes('Generate Practice Script?'))
    assert.ok(createPracticeDialog.includes('Offense (Scout Defense)'))
    assert.ok(createPracticeDialog.includes('Defense (Scout Offense)'))
    assert.ok(createPracticeDialog.includes('Special Teams'))
    assert.ok(createPracticeDialog.includes('list="schedule-location-suggestions"'))
    assert.ok(createPracticeDialog.includes('<option value="Marcal Paper Field"></option>'))
    assert.ok(createPracticeDialog.includes('<option value="Kish Bank Field"></option>'))
    assert.ok(createPracticeDialog.includes('Dress'))
    assert.ok(createPracticeDialog.includes('Full Pads'))
    assert.ok(createPracticeDialog.includes('Half Pads'))
    assert.ok(createPracticeDialog.includes('Uppers'))
    assert.ok(createPracticeDialog.includes('Helmets'))
    assert.ok(createPracticeDialog.includes('<option value="Team Meal">Team Meal</option>'))
    const teamMealDialog = renderToStaticMarkup(createElement(ScheduleEventDialog, {
      initialEvent: { id: 'meal-id', kind: 'event', eventType: 'Team Meal', name: 'Team Dinner', eventDate: '2026-11-10', location: 'Cafeteria', notes: 'Bring the team', gamePlanIds: ['game-id'] },
      canEdit: true, canCreateGame: false, canDelete: false, onCancel: () => {}, onSave: () => {},
    }))
    assert.ok(teamMealDialog.includes('<option value="Team Meal" selected="">Team Meal</option>'))
    assert.ok(teamMealDialog.includes('>End</span>'))
    assert.ok(teamMealDialog.includes('>Location</span>'))
    assert.ok(teamMealDialog.includes('>Notes</span>'))
    assert.ok(teamMealDialog.includes('>Related Game</span>'))
    const editPracticeDialog = renderToStaticMarkup(createElement(ScheduleEventDialog, {
      initialEvent: { id: 'practice-id', kind: 'event', eventType: 'Practice', name: 'Practice', eventDate: '2026-11-10', dress: 'Half Pads', gamePlanIds: ['game-id'] },
      canEdit: true, canCreateGame: false, canDelete: false, onCancel: () => {}, onSave: () => {},
    }))
    assert.ok(!editPracticeDialog.includes('Generate Practice Script?'))
    assert.ok(editPracticeDialog.includes('Related Game'))
    assert.ok(editPracticeDialog.includes('<option value="game-id" selected="">Current linked game</option>'))
    assert.ok(editPracticeDialog.includes('<option value="Half Pads" selected="">Half Pads</option>'))
    const editOtherDialog = renderToStaticMarkup(createElement(ScheduleEventDialog, {
      initialEvent: { id: 'other-id', kind: 'event', eventType: 'Other', name: 'Team Activity', eventDate: '2026-11-10', gamePlanIds: ['game-id'] },
      canEdit: true, canCreateGame: false, canDelete: false, onCancel: () => {}, onSave: () => {},
    }))
    assert.ok(editOtherDialog.includes('Related Game'))
    assert.ok(editOtherDialog.includes('<option value="game-id" selected="">Current linked game</option>'))
    assert.ok(!editOtherDialog.includes('Generate Practice Script?'))
    assert.deepEqual(duplicateScheduleEventPayload({
      id: 'event-1', name: 'Film Review', eventType: 'Film Review', eventDate: '2026-11-12',
      startTime: '15:30', endTime: '16:00', location: 'Film Room', notes: 'Third down', gamePlanIds: ['game-1'],
    }), {
      name: 'Film Review (Copy)', eventType: 'Film Review', eventDate: '2026-11-12',
      startTime: '15:30', endTime: '16:00', location: 'Film Room', notes: 'Third down', gamePlanIds: ['game-1'],
    })
    assert.equal(duplicateScheduleEventPayload({ name: 'Practice', eventType: 'Practice', eventDate: '2026-11-12', dress: 'Uppers' }).dress, 'Uppers')
    const unitFilter = renderToStaticMarkup(createElement(GamePlanUnitFilter, { selectedUnits: ['Offense'], onToggle: () => {} }))
    assert.ok(unitFilter.includes('data-grid-category-filter gp-unit-filter'))
    assert.ok(unitFilter.includes('Offense'))
    assert.ok(unitFilter.includes('aria-pressed="true"'))
    assert.ok(unitFilter.includes('aria-pressed="false"'))
    assert.ok(unitFilter.includes('--badge-hue:142'))
    const summaryGrid = renderToStaticMarkup(createElement(DataGrid, {
      className: 'editable-data-grid',
      title: 'Game Plan Status', columns: [{ key: 'name', header: 'Content' }],
      items: [
        { id: 'group-installs', name: 'Installs', rowType: 'grouping', description: '1 item' },
        { id: 'install-1', name: 'Install A' },
        { id: 'group-scripts', name: 'Practice Scripts', rowType: 'grouping', description: '1 item' },
        { id: 'script-1', name: 'Script A' },
      ],
      hidePager: true,
      toolbarContent: createElement('div', { className: 'data-grid-toolbar-actions' }, createElement('button', { type: 'button' }, 'Install')),
      menuItems: [{ label: 'Link Activity', onClick: () => {} }],
      rowActions: (row) => row.rowType === 'grouping' ? [] : [{ key: 'open', label: 'Open', onClick: () => {} }],
    }))
    assert.ok(summaryGrid.includes('class="data-grid editable-data-grid"'))
    assert.ok(summaryGrid.includes('<th>Content</th>'))
    assert.ok(summaryGrid.includes('class="data-grid-toolbar"'))
    assert.ok(summaryGrid.includes('Install'))
    assert.ok(summaryGrid.includes('aria-label="More actions"'))
    assert.ok(!summaryGrid.includes('Search by name'))
    assert.ok(!summaryGrid.includes('data-grid-pager'))
    assert.ok(summaryGrid.includes('aria-expanded="true"'))
    assert.ok(summaryGrid.includes('Install A'))
    assert.ok(summaryGrid.includes('Script A'))
    assert.equal((summaryGrid.match(/class="row-actions-button"/g) || []).length, 2)
    assert.ok(!summaryGrid.includes('data-grid-grouping-content-row'))
    const { GlobalSearch } = await server.ssrLoadModule('/src/components/GlobalSearch.jsx')
    const globalSearch = renderToStaticMarkup(createElement(GlobalSearch, { api: {} }))
    assert.ok(globalSearch.includes('aria-label="Global search"'))
    assert.ok(!globalSearch.includes('global-search-scope'))
    assert.deepEqual(Object.values(ScheduleView), ['week', 'month', 'quarter', 'year'])
    const january = new Date(2026, 0, 31)
    assert.deepEqual(scheduleMonths(january, 'quarter').map((date) => [date.getFullYear(), date.getMonth()]), [[2025, 11], [2026, 0], [2026, 1]])
    assert.deepEqual(schedulePeriod(january, 'quarter'), { start: '2025-12-01', end: '2026-02-28' })
    assert.deepEqual(schedulePeriod(new Date(2028, 1, 15), 'month'), { start: '2028-02-01', end: '2028-02-29' })
    assert.deepEqual(schedulePeriod(january, 'year'), { start: '2026-01-01', end: '2026-12-31' })
    assert.deepEqual(schedulePeriod(new Date(2026, 0, 1), 'week'), { start: '2025-12-28', end: '2026-01-03' })
    assert.deepEqual(scheduleLoadPeriod(january, 'month', 'calendar'), { start: '2025-12-28', end: '2026-01-31' })
    assert.deepEqual(scheduleLoadPeriod(january, 'quarter', 'calendar'), { start: '2025-11-30', end: '2026-02-28' })
    assert.deepEqual(scheduleLoadPeriod(january, 'quarter', 'grid'), { start: '2025-12-01', end: '2026-02-28' })
    assert.deepEqual(scheduleLoadPeriod(january, 'year', 'calendar'), { start: '2026-01-01', end: '2026-12-31' })
    assert.equal(shiftScheduleDate(january, 'quarter', 1).getMonth(), 1)
    assert.equal(shiftScheduleDate(january, 'quarter', -1).getFullYear(), 2025)
    assert.equal(shiftScheduleDate(january, 'year', 1).getFullYear(), 2027)
    assert.equal(shiftScheduleDate(january, 'week', 1).getDate(), 7)
    assert.equal(buildCalendarDays(new Date(2026, 1, 1), 'month').length, 28)
    const eventsByDate = new Map([['2026-01-15', [
      { id: 'practice', kind: 'event', eventType: 'Practice', name: 'Practice <test>', startTime: '16:30', notes: 'Bring indoor shoes' },
      { id: 'film-review', kind: 'event', eventType: 'Film Review', name: 'Film Review', notes: 'Review red-zone coverage' },
      { id: 'other', kind: 'event', eventType: 'Other', name: 'Team Activity', notes: 'Bring equipment' },
      { id: 'game', kind: 'game', eventType: 'Game', opponent: 'Northern York', name: 'Game vs. Northern York', startTime: '19:00', location: 'North Gym', result: 'W 37-12' },
    ]]])
    const month = renderToStaticMarkup(createElement(MonthCalendar, { month: january, eventsByDate, showHeading: true, highlightCurrent: true, canEdit: true }))
    assert.ok(month.includes('schedule-centered-month'))
    assert.ok(month.includes('Practice &lt;test&gt;'))
    assert.match(month, /class="schedule-event-label"><svg[^>]*aria-hidden="true"[^>]*>[\s\S]*?<span class="schedule-event-name">Practice &lt;test&gt;<\/span>/)
    assert.ok(month.includes('class="schedule-event-notes" title="Bring indoor shoes">Bring indoor shoes</span>'))
    assert.ok(month.includes('class="schedule-event-notes" title="Review red-zone coverage">Review red-zone coverage</span>'))
    assert.ok(month.includes('class="schedule-event-notes" title="Bring equipment">Bring equipment</span>'))
    assert.ok(month.includes('vs. Northern York'))
    assert.ok(month.includes('class="schedule-event-location" title="North Gym">North Gym</span>'))
    assert.ok(month.includes('class="schedule-game-result is-win">W 37-12</span>'))
    assert.ok(month.includes('Drag Northern York'))
    assert.ok(month.includes('Add event 2026-01-15'))
    const year = renderToStaticMarkup(createElement(YearCalendar, { date: january, eventsByDate }))
    assert.equal((year.match(/class="schedule-mini-month"/g) || []).length, 12)
    assert.ok(year.includes('Open January 2026'))
    assert.ok(year.includes('aria-label="1 Practice"'))
    assert.ok(year.includes('aria-label="1 Game"'))
    assert.ok(!year.includes('schedule-event-content'))
    const { createApi, signIn, signOut } = await server.ssrLoadModule('/src/api/client.js')
    const originalFetch = globalThis.fetch
    const paths = []
    globalThis.fetch = async (path) => {
      paths.push(path)
      return { ok: true, status: 200, json: async () => ({ items: [] }) }
    }
    try {
      signIn('free')
      const api = createApi()
      await api.listScheduleEvents({ start: '2026-01-01', end: '2026-12-31', summary: true })
      await api.listGamePlans('Offense', 'Falcons', true, { start: '2026-01-01', end: '2026-12-31', summary: true })
      await api.listGamePlans()
      await api.search('jet motion')
      await api.getScheduleEvent('practice-id')
      const eventQuery = new URL(paths[0], 'http://localhost').searchParams
      assert.equal(eventQuery.get('start'), '2026-01-01')
      assert.equal(eventQuery.get('end'), '2026-12-31')
      assert.equal(eventQuery.get('scheduleSummary'), 'true')
      const gameQuery = new URL(paths[1], 'http://localhost').searchParams
      assert.equal(gameQuery.get('category'), 'Offense')
      assert.equal(gameQuery.get('namePrefix'), 'Falcons')
      assert.equal(gameQuery.get('summary'), 'true')
      assert.equal(gameQuery.get('scheduleSummary'), 'true')
      assert.equal(new URL(paths[2], 'http://localhost').search, '')
      const searchQuery = new URL(paths[3], 'http://localhost').searchParams
      assert.equal(searchQuery.get('q'), 'jet motion')
      assert.equal(searchQuery.has('scope'), false)
      assert.equal(searchQuery.has('gamePlanId'), false)
      assert.equal(paths[4].endsWith('/schedule-events/practice-id'), true)
    } finally {
      signOut()
      globalThis.fetch = originalFetch
    }
  } finally {
    await server.close()
  }
})

test('duplicating a practice preserves an independent copy of its sheet', () => {
  const practiceSheet = { periods: [{ name: 'Team', activities: [{ name: 'Install' }] }] }
  const copy = duplicateScheduleEventPayload({ name: 'Practice', eventType: 'Practice', eventDate: '2026-11-10', practiceSheet })
  assert.deepEqual(copy.practiceSheet, practiceSheet)
  copy.practiceSheet.periods[0].activities[0].name = 'Changed'
  assert.equal(practiceSheet.periods[0].activities[0].name, 'Install')
})

test('Game Plan activity links show the fourteen days before the game date and sort newest first', () => {
  const events = [
    { id: 'outside', eventDate: '2026-11-04', startTime: '18:00', name: 'Outside window' },
    { id: 'cutoff', eventDate: '2026-11-05', startTime: '08:00', name: 'Cutoff day' },
    { id: 'game-day-late', eventDate: '2026-11-19', startTime: '18:00', name: 'Game day late' },
    { id: 'game-day-early', eventDate: '2026-11-19', startTime: '08:00', name: 'Game day early' },
    { id: 'future', eventDate: '2026-11-20', startTime: '12:00', name: 'Future' },
    { id: 'already-linked', eventDate: '2026-11-19', startTime: '20:00', name: 'Already linked', gamePlanIds: ['game'] },
    { id: 'linked-elsewhere', eventDate: '2026-11-19', startTime: '19:00', name: 'Linked elsewhere', gamePlanIds: ['other-game'] },
  ]
  assert.deepEqual(linkableGamePlanActivities('2026-11-19', events).map((event) => event.id), ['game-day-late', 'game-day-early', 'cutoff'])
  assert.deepEqual(linkableGamePlanActivities('2026-11-20', events).map((event) => event.id), ['future', 'game-day-late', 'game-day-early'])
})