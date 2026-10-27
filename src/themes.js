// Stable colour IDs map to these decorative palettes; no engine imports this registry.
export const LEGACY_THEMES = [
  { id: 'prism-neon', name: 'Prism Neon', burst: 'sparks', page: '#080d27', panel: '#141e40', board: '#202e50', empty: '#101a35', text: '#f3f6ff', muted: '#bac8eb', accent: '#b99aff', palette: ['#2dd4e7','#b47af5','#ffac62','#ff7897','#75a5ff','#91df70','#ffdb74'] },
  { id: 'candy-pop', name: 'Candy Pop', burst: 'confetti', page: '#f4eafa', panel: '#fff9ff', board: '#c9b6d5', empty: '#e9deee', text: '#382542', muted: '#66506f', accent: '#704193', palette: ['#357c8b','#8960ae','#ad6d3c','#ae557e','#5272a6','#5e804e','#91782c'] },
  { id: 'ocean-glass', name: 'Ocean Glass', burst: 'bubbles', page: '#041e29', panel: '#0c3040', board: '#235367', empty: '#0a2432', text: '#e9fcff', muted: '#a8cfdb', accent: '#62e0da', palette: ['#50cfdb','#8ba6f2','#f1ba73','#ef8da6','#63aff4','#83d7b0','#e4d787'] },
  { id: 'sunset-arcade', name: 'Sunset Arcade', burst: 'rays', page: '#251126', panel: '#3c203a', board: '#68445c', empty: '#2c182e', text: '#fff3e9', muted: '#e2bac8', accent: '#ffb481', palette: ['#73ccd1','#be91eb','#ffac68','#fc829a','#91abef','#b3d88a','#f5d077'] },
  { id: 'forest-calm', name: 'Forest Calm', burst: 'leaves', page: '#091e19', panel: '#16362b', board: '#365d4d', empty: '#0d251e', text: '#eefaf0', muted: '#b3d1be', accent: '#a0dfb1', palette: ['#76cbb8','#b4a0da','#dfb27b','#d78e9a','#85aec7','#a0ce82','#d8cd82'] },
  { id: 'midnight-gold', name: 'Midnight Gold', burst: 'dust', page: '#111114', panel: '#232126', board: '#514a42', empty: '#19191e', text: '#faf3e3', muted: '#cec3b1', accent: '#e9c77e', palette: ['#88c7ca','#b5a3ca','#dab080','#d69da8','#98afcd','#b3c69a','#e7cd86'] }
];
export const CORE_THEMES = [
  { id: 'candy-carnival', name: 'Candy Carnival', burst: 'confetti', page: '#fff0f6', panel: '#fffafd', board: '#ddb1ce', empty: '#f5dfec', text: '#46233d', muted: '#725069', accent: '#963d71', palette: ['#ac477a','#b26136','#387a68','#90751e','#7860a6','#386c9a','#9d4660'] },
  { id: 'ocean-pop', name: 'Ocean Pop', burst: 'bubbles', page: '#e0f7fb', panel: '#f7ffff', board: '#97c3ce', empty: '#d8edf2', text: '#193c4c', muted: '#3b6171', accent: '#176b83', palette: ['#237a8c','#3a729e','#b35c4f','#6872a6','#3c7a68','#88692d','#9d527e'] },
  { id: 'neon-arcade', name: 'Neon Arcade', burst: 'sparks', page: '#1b1040', panel: '#2b1c55', board: '#564477', empty: '#20163d', text: '#faf5ff', muted: '#d1c1ed', accent: '#7de9f2', palette: ['#67e0ed','#cf8ff5','#ffb77b','#ff8bb9','#98b6ff','#a7e695','#ffe281'] },
  { id: 'sunset-fiesta', name: 'Sunset Fiesta', burst: 'rays', page: '#fff0df', panel: '#fff9ef', board: '#d5a8b0', empty: '#f3decf', text: '#4a233e', muted: '#78475d', accent: '#9b3d65', palette: ['#a54564','#b15c31','#8e701b','#77509b','#337781','#99602e','#5b7650'] },
  { id: 'forest-friends', name: 'Forest Friends', burst: 'leaves', page: '#e7f2da', panel: '#fbfff1', board: '#a1b99a', empty: '#dce7cf', text: '#233f31', muted: '#48674d', accent: '#2d6b4d', palette: ['#397451','#52792e','#9a652a','#3e7184','#85558e','#a34d5e','#866c21'] },
  { id: 'cosmic-prism', name: 'Cosmic Prism', burst: 'dust', page: '#20163c', panel: '#30234e', board: '#62547c', empty: '#221939', text: '#f8f3ff', muted: '#d0c1e7', accent: '#c5acff', palette: ['#bda2f4','#90b7ed','#eab7d8','#9cdbd0','#edd395','#bddaa1','#d3cbe8'] }
];
export const THEMES = [...CORE_THEMES, ...LEGACY_THEMES];
export function themeStyle(id) {
  const t = THEMES.find(t => t.id === id) || THEMES[0];
  return {
    colorScheme: ['candy-pop', 'candy-carnival', 'ocean-pop', 'sunset-fiesta', 'forest-friends'].includes(t.id) ? 'light' : 'dark',
    '--page-bg': t.page, '--panel-bg': t.panel, '--board-bg': t.board, '--cell-empty': t.empty,
    '--text-primary': t.text, '--text-muted': t.muted, '--accent': t.accent,
    '--preview-valid': t.accent, '--preview-invalid': ['candy-pop', 'candy-carnival', 'ocean-pop', 'sunset-fiesta', 'forest-friends'].includes(t.id) ? '#9b2446' : '#ff93ad',
    '--focus-ring': t.accent, '--panel': t.panel, '--empty': t.empty, '--secondary': t.muted,
    '--shadow': '0 12px 32px #0003',
    ...Object.fromEntries(t.palette.map((c, i) => [`--colour-${i}`, c]))
  };
}
export function chooseNewTheme(previous) {
  const options = CORE_THEMES.filter(t => t.id !== previous);
  // Cosmetic entropy is independent of seeded gameplay continuation.
  return options[Math.floor(Math.random() * options.length)].id;
}
