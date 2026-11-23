import { PLAY_THEMES } from '../../utils/themes'
import { DEFAULT_GAME_TYPE, gameTypeLabel, PLAY_TEMPLATES } from '../../utils/formations'

export function DefaultsFields({ values, onChange }) {
  return <>
    <label className="dialog-field"><span>Default Game Type</span>
      <select value={values.gameType || DEFAULT_GAME_TYPE} onChange={(event) => onChange('gameType', event.target.value)}>
        {Object.keys(PLAY_TEMPLATES).map((gameType) => <option key={gameType} value={gameType}>{gameTypeLabel(gameType)}</option>)}
      </select>
    </label>
    <label className="dialog-field"><span>Default field standard</span>
      <select value={values.fieldOrientation || 'High School'} onChange={(event) => onChange('fieldOrientation', event.target.value)}>
        <option value="High School">High School</option><option value="NCAA">NCAA</option><option value="NFL">NFL</option>
      </select>
    </label>
    <label className="dialog-field"><span>Default diagram theme</span>
      <select value={values.theme || 'color'} onChange={(event) => onChange('theme', event.target.value)}>
        {PLAY_THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.label}</option>)}
      </select>
    </label>
  </>
}