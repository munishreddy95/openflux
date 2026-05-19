export const DESIGN_STORAGE_KEY = 'openflux.design-settings';

export const DEFAULT_DESIGN_SETTINGS = {
  themeId: 'midnight',
  fontId: 'navigator',
  fontScale: 100
};

export const THEME_PRESETS = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Blue-green glow over the original dark console canvas.',
    swatches: ['9 11 16', '16 21 30', '86 215 255', '157 255 143'],
    vars: {
      'color-app': '9 11 16',
      'color-panel': '16 21 30',
      'color-panel-muted': '21 28 40',
      'color-highlight': '86 215 255',
      'color-accent': '157 255 143',
      'color-warning': '247 185 85',
      'color-danger': '255 109 123',
      'color-ink': '219 231 255',
      'color-subtle': '140 160 190',
      'page-radial-a': '86 215 255',
      'page-radial-b': '157 255 143',
      'page-bg-start': '9 11 16',
      'page-bg-end': '7 9 13',
      'glow-ring': '86 215 255',
      'glow-shadow': '5 10 25',
      'scrollbar-thumb': '140 160 190',
      'selection-color': '86 215 255'
    }
  },
  {
    id: 'harbor',
    name: 'Harbor',
    description: 'Colder teal panels with a sea-glass accent mix.',
    swatches: ['7 20 26', '12 27 35', '111 255 242', '162 255 197'],
    vars: {
      'color-app': '7 20 26',
      'color-panel': '12 27 35',
      'color-panel-muted': '18 37 47',
      'color-highlight': '111 255 242',
      'color-accent': '162 255 197',
      'color-warning': '255 209 110',
      'color-danger': '255 127 122',
      'color-ink': '227 248 255',
      'color-subtle': '142 177 194',
      'page-radial-a': '111 255 242',
      'page-radial-b': '72 190 255',
      'page-bg-start': '7 20 26',
      'page-bg-end': '5 10 16',
      'glow-ring': '111 255 242',
      'glow-shadow': '4 15 20',
      'scrollbar-thumb': '142 177 194',
      'selection-color': '111 255 242'
    }
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Warm charcoal panels with copper and amber highlights.',
    swatches: ['23 14 12', '31 19 19', '255 176 103', '255 220 120'],
    vars: {
      'color-app': '23 14 12',
      'color-panel': '31 19 19',
      'color-panel-muted': '42 26 26',
      'color-highlight': '255 176 103',
      'color-accent': '255 220 120',
      'color-warning': '255 193 92',
      'color-danger': '255 122 112',
      'color-ink': '255 239 226',
      'color-subtle': '201 163 145',
      'page-radial-a': '255 176 103',
      'page-radial-b': '255 220 120',
      'page-bg-start': '23 14 12',
      'page-bg-end': '12 8 9',
      'glow-ring': '255 176 103',
      'glow-shadow': '22 10 8',
      'scrollbar-thumb': '201 163 145',
      'selection-color': '255 176 103'
    }
  },
  {
    id: 'evergreen',
    name: 'Evergreen',
    description: 'Forest-toned glass with brighter moss and mint signals.',
    swatches: ['9 18 14', '15 29 24', '121 255 190', '193 255 143'],
    vars: {
      'color-app': '9 18 14',
      'color-panel': '15 29 24',
      'color-panel-muted': '21 39 31',
      'color-highlight': '121 255 190',
      'color-accent': '193 255 143',
      'color-warning': '255 205 102',
      'color-danger': '255 120 133',
      'color-ink': '232 250 236',
      'color-subtle': '152 185 163',
      'page-radial-a': '121 255 190',
      'page-radial-b': '193 255 143',
      'page-bg-start': '9 18 14',
      'page-bg-end': '6 10 8',
      'glow-ring': '121 255 190',
      'glow-shadow': '5 14 10',
      'scrollbar-thumb': '152 185 163',
      'selection-color': '121 255 190'
    }
  },
  {
    id: 'atlas',
    name: 'Atlas',
    description: 'Steel-blue panels with glacier accents and quieter contrast.',
    swatches: ['10 16 24', '18 27 38', '118 191 255', '180 217 255'],
    vars: {
      'color-app': '10 16 24',
      'color-panel': '18 27 38',
      'color-panel-muted': '25 37 50',
      'color-highlight': '118 191 255',
      'color-accent': '180 217 255',
      'color-warning': '255 200 118',
      'color-danger': '255 126 136',
      'color-ink': '231 240 255',
      'color-subtle': '150 169 193',
      'page-radial-a': '118 191 255',
      'page-radial-b': '180 217 255',
      'page-bg-start': '10 16 24',
      'page-bg-end': '7 11 17',
      'glow-ring': '118 191 255',
      'glow-shadow': '7 12 19',
      'scrollbar-thumb': '150 169 193',
      'selection-color': '118 191 255'
    }
  },
  {
    id: 'dune',
    name: 'Dune',
    description: 'Sandy bronze glass with pale citrus accents and warm depth.',
    swatches: ['22 17 11', '34 26 18', '255 197 126', '233 255 162'],
    vars: {
      'color-app': '22 17 11',
      'color-panel': '34 26 18',
      'color-panel-muted': '47 36 24',
      'color-highlight': '255 197 126',
      'color-accent': '233 255 162',
      'color-warning': '255 214 122',
      'color-danger': '255 128 114',
      'color-ink': '255 242 224',
      'color-subtle': '194 169 142',
      'page-radial-a': '255 197 126',
      'page-radial-b': '233 255 162',
      'page-bg-start': '22 17 11',
      'page-bg-end': '11 9 7',
      'glow-ring': '255 197 126',
      'glow-shadow': '19 13 8',
      'scrollbar-thumb': '194 169 142',
      'selection-color': '255 197 126'
    }
  },
  {
    id: 'orchard',
    name: 'Orchard',
    description: 'Olive-dark framing with lime and apricot signal colors.',
    swatches: ['14 18 11', '23 30 19', '199 255 123', '255 189 103'],
    vars: {
      'color-app': '14 18 11',
      'color-panel': '23 30 19',
      'color-panel-muted': '31 41 26',
      'color-highlight': '199 255 123',
      'color-accent': '255 189 103',
      'color-warning': '255 214 116',
      'color-danger': '255 123 118',
      'color-ink': '240 248 229',
      'color-subtle': '167 181 143',
      'page-radial-a': '199 255 123',
      'page-radial-b': '255 189 103',
      'page-bg-start': '14 18 11',
      'page-bg-end': '8 10 7',
      'glow-ring': '199 255 123',
      'glow-shadow': '9 12 7',
      'scrollbar-thumb': '167 181 143',
      'selection-color': '199 255 123'
    }
  },
  {
    id: 'rosebay',
    name: 'Rosebay',
    description: 'Mulled berry panels with rose light and soft peach balance.',
    swatches: ['21 11 15', '33 18 24', '255 150 177', '255 218 168'],
    vars: {
      'color-app': '21 11 15',
      'color-panel': '33 18 24',
      'color-panel-muted': '44 25 32',
      'color-highlight': '255 150 177',
      'color-accent': '255 218 168',
      'color-warning': '255 199 119',
      'color-danger': '255 108 124',
      'color-ink': '255 233 238',
      'color-subtle': '193 151 165',
      'page-radial-a': '255 150 177',
      'page-radial-b': '255 218 168',
      'page-bg-start': '21 11 15',
      'page-bg-end': '10 7 9',
      'glow-ring': '255 150 177',
      'glow-shadow': '18 9 12',
      'scrollbar-thumb': '193 151 165',
      'selection-color': '255 150 177'
    }
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Deep indigo glass with northern green and electric sky flare.',
    swatches: ['11 13 24', '18 22 38', '130 146 255', '143 255 196'],
    vars: {
      'color-app': '11 13 24',
      'color-panel': '18 22 38',
      'color-panel-muted': '26 31 49',
      'color-highlight': '130 146 255',
      'color-accent': '143 255 196',
      'color-warning': '255 205 118',
      'color-danger': '255 126 145',
      'color-ink': '233 238 255',
      'color-subtle': '149 158 198',
      'page-radial-a': '130 146 255',
      'page-radial-b': '143 255 196',
      'page-bg-start': '11 13 24',
      'page-bg-end': '7 8 15',
      'glow-ring': '130 146 255',
      'glow-shadow': '8 9 18',
      'scrollbar-thumb': '149 158 198',
      'selection-color': '130 146 255'
    }
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Neutral charcoal shell with crisp blue-white utility accents.',
    swatches: ['12 13 16', '23 25 31', '154 194 255', '214 224 236'],
    vars: {
      'color-app': '12 13 16',
      'color-panel': '23 25 31',
      'color-panel-muted': '31 35 43',
      'color-highlight': '154 194 255',
      'color-accent': '214 224 236',
      'color-warning': '255 206 120',
      'color-danger': '255 119 128',
      'color-ink': '240 244 250',
      'color-subtle': '139 149 166',
      'page-radial-a': '154 194 255',
      'page-radial-b': '214 224 236',
      'page-bg-start': '12 13 16',
      'page-bg-end': '8 9 12',
      'glow-ring': '154 194 255',
      'glow-shadow': '8 9 12',
      'scrollbar-thumb': '139 149 166',
      'selection-color': '154 194 255'
    }
  },
  {
    id: 'daybreak',
    name: 'Daybreak',
    description: 'Brighter sky background with slate-glass panels and clear blue signals.',
    swatches: ['205 216 230', '64 78 96', '99 169 255', '175 226 255'],
    vars: {
      'color-app': '205 216 230',
      'color-panel': '64 78 96',
      'color-panel-muted': '78 93 112',
      'color-highlight': '99 169 255',
      'color-accent': '175 226 255',
      'color-warning': '255 196 116',
      'color-danger': '255 120 132',
      'color-ink': '244 249 255',
      'color-subtle': '198 210 224',
      'page-radial-a': '162 205 255',
      'page-radial-b': '255 232 179',
      'page-bg-start': '205 216 230',
      'page-bg-end': '164 180 199',
      'glow-ring': '99 169 255',
      'glow-shadow': '41 54 70',
      'scrollbar-thumb': '123 138 156',
      'selection-color': '99 169 255'
    }
  },
  {
    id: 'seaglass-light',
    name: 'Seaglass Light',
    description: 'Pale coastal background with teal-steel panels and sea-bright accents.',
    swatches: ['204 225 225', '54 79 86', '96 238 225', '179 246 218'],
    vars: {
      'color-app': '204 225 225',
      'color-panel': '54 79 86',
      'color-panel-muted': '68 95 102',
      'color-highlight': '96 238 225',
      'color-accent': '179 246 218',
      'color-warning': '255 206 119',
      'color-danger': '255 123 123',
      'color-ink': '241 252 252',
      'color-subtle': '191 217 217',
      'page-radial-a': '132 245 229',
      'page-radial-b': '205 255 220',
      'page-bg-start': '204 225 225',
      'page-bg-end': '160 194 195',
      'glow-ring': '96 238 225',
      'glow-shadow': '33 55 60',
      'scrollbar-thumb': '120 153 153',
      'selection-color': '96 238 225'
    }
  },
  {
    id: 'sandbar',
    name: 'Sandbar',
    description: 'Soft dune canvas with bronze-gray panels and warm utility accents.',
    swatches: ['228 216 198', '82 69 61', '255 182 116', '255 225 168'],
    vars: {
      'color-app': '228 216 198',
      'color-panel': '82 69 61',
      'color-panel-muted': '98 83 74',
      'color-highlight': '255 182 116',
      'color-accent': '255 225 168',
      'color-warning': '255 200 113',
      'color-danger': '255 119 116',
      'color-ink': '255 247 238',
      'color-subtle': '222 208 191',
      'page-radial-a': '255 207 155',
      'page-radial-b': '255 236 192',
      'page-bg-start': '228 216 198',
      'page-bg-end': '196 179 157',
      'glow-ring': '255 182 116',
      'glow-shadow': '55 42 35',
      'scrollbar-thumb': '146 129 114',
      'selection-color': '255 182 116'
    }
  },
  {
    id: 'petal-mist',
    name: 'Petal Mist',
    description: 'Rose-tinted light background with mauve slate panels and soft coral highlights.',
    swatches: ['230 214 224', '79 64 78', '255 161 180', '255 220 197'],
    vars: {
      'color-app': '230 214 224',
      'color-panel': '79 64 78',
      'color-panel-muted': '96 79 94',
      'color-highlight': '255 161 180',
      'color-accent': '255 220 197',
      'color-warning': '255 197 118',
      'color-danger': '255 110 128',
      'color-ink': '255 242 249',
      'color-subtle': '225 201 217',
      'page-radial-a': '255 184 200',
      'page-radial-b': '255 229 198',
      'page-bg-start': '230 214 224',
      'page-bg-end': '191 171 186',
      'glow-ring': '255 161 180',
      'glow-shadow': '50 38 50',
      'scrollbar-thumb': '144 124 142',
      'selection-color': '255 161 180'
    }
  }
];

export const FONT_PRESETS = [
  {
    id: 'navigator',
    name: 'Navigator',
    description: 'Clean sans body with a compact dashboard heading style.',
    sans: '"Avenir Next", "Segoe UI", sans-serif',
    display: '"Trebuchet MS", "Avenir Next", sans-serif'
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Serif-driven reading tone without changing the layout scale.',
    sans: 'Georgia, "Times New Roman", serif',
    display: '"Palatino Linotype", "Book Antiqua", Georgia, serif'
  },
  {
    id: 'signal',
    name: 'Signal',
    description: 'Tighter interface text with sharper, condensed headings.',
    sans: 'Tahoma, Verdana, "Segoe UI", sans-serif',
    display: '"Arial Narrow", "Franklin Gothic Medium", "Trebuchet MS", sans-serif'
  }
];

export const FONT_SCALE_PRESETS = [
  {
    value: 100,
    label: '100%',
    description: 'Default scale'
  },
  {
    value: 75,
    label: '75%',
    description: 'Compact scale'
  },
  {
    value: 50,
    label: '50%',
    description: 'Minimal scale'
  }
];

const THEME_IDS = new Set(THEME_PRESETS.map((theme) => theme.id));
const FONT_IDS = new Set(FONT_PRESETS.map((font) => font.id));
const FONT_SCALE_VALUES = new Set(FONT_SCALE_PRESETS.map((preset) => preset.value));

function normalizeFontScale(fontScale) {
  const parsedValue = Number.parseInt(String(fontScale ?? ''), 10);
  return FONT_SCALE_VALUES.has(parsedValue) ? parsedValue : DEFAULT_DESIGN_SETTINGS.fontScale;
}

export function sanitizeDesignSettings(settings = {}) {
  return {
    themeId: THEME_IDS.has(settings.themeId) ? settings.themeId : DEFAULT_DESIGN_SETTINGS.themeId,
    fontId: FONT_IDS.has(settings.fontId) ? settings.fontId : DEFAULT_DESIGN_SETTINGS.fontId,
    fontScale: normalizeFontScale(settings.fontScale)
  };
}

export function getThemePreset(themeId = DEFAULT_DESIGN_SETTINGS.themeId) {
  return THEME_PRESETS.find((theme) => theme.id === themeId) || THEME_PRESETS[0];
}

export function getFontPreset(fontId = DEFAULT_DESIGN_SETTINGS.fontId) {
  return FONT_PRESETS.find((font) => font.id === fontId) || FONT_PRESETS[0];
}

export function loadDesignSettings() {
  if (typeof window === 'undefined') {
    return DEFAULT_DESIGN_SETTINGS;
  }

  try {
    const savedSettings = window.localStorage.getItem(DESIGN_STORAGE_KEY);
    if (!savedSettings) {
      return DEFAULT_DESIGN_SETTINGS;
    }

    return sanitizeDesignSettings(JSON.parse(savedSettings));
  } catch {
    return DEFAULT_DESIGN_SETTINGS;
  }
}

export function persistDesignSettings(settings) {
  if (typeof window === 'undefined') {
    return;
  }

  const safeSettings = sanitizeDesignSettings(settings);
  try {
    window.localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(safeSettings));
  } catch {
    // Ignore storage write failures and keep the active in-memory theme.
  }
}

export function applyDesignSettings(settings) {
  if (typeof document === 'undefined') {
    return;
  }

  const safeSettings = sanitizeDesignSettings(settings);
  const theme = getThemePreset(safeSettings.themeId);
  const font = getFontPreset(safeSettings.fontId);
  const root = document.documentElement;

  Object.entries(theme.vars).forEach(([name, value]) => {
    root.style.setProperty(`--${name}`, value);
  });

  root.style.setProperty('--font-sans', font.sans);
  root.style.setProperty('--font-display', font.display);
  root.style.fontSize = `${safeSettings.fontScale}%`;
  root.dataset.theme = theme.id;
  root.dataset.font = font.id;
  root.dataset.fontScale = String(safeSettings.fontScale);
}
