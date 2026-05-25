# Essay Quest for Obsidian

Gamified writing dashboard for Obsidian:

- Live document stats (words, quality, paragraphs, sentences)
- Daily progress (words, XP, paragraphs, sentences, best quality)
- Pomodoro timer (default 25/5, editable)
- Level progression with progress bar to next level
- Achievements unlock only during active Pomodoro work mode
- Right-click context actions:
  - Global progress
  - Achievement list
  - Reset achievements

## Build

1. Open terminal in this folder:
   - `D:\ProjectsExternal\gameNotepad\obsidian-essay-quest`
2. Install deps:
   - `npm install`
3. Build:
   - `npm run build`

This generates:
- `main.js`

## Install in your vault

1. Create plugin folder in your Obsidian vault:
   - `<YourVault>\.obsidian\plugins\essay-quest\`
2. Copy these files into that folder:
   - `manifest.json`
   - `main.js`
   - `styles.css`
3. In Obsidian:
   - Settings -> Community plugins -> Turn off Safe mode (if needed)
   - Reload plugins
   - Enable `Essay Quest`

## Open dashboard

- Click sword ribbon icon, or
- Command palette: `Toggle Essay Quest Dashboard`
