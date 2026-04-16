# Changelog

## 1.1.3 (2026-04-16)

### Fixes

- Fix last-word cutoff on every sentence (not just at skip transitions). Append a small `[[slnc 50]]` silence to each sentence so `say` holds the audio unit long enough for CoreAudio to finish draining the real speech before exiting.

## 1.1.2 (2026-04-16)

### Fixes

- Fix audio truncation: last word of every sentence was being cut off. Switched from piping sentences to `say` via stdin to passing them as positional arguments, which avoids a stdin-buffering quirk in `say` that clipped the tail of short inputs.

## 1.1.1 (2026-04-16)

### Fixes

- Satisfy Obsidian review bot: move inline panel drag positioning to CSS custom properties
- Replace `any` cast in editor-view access with typed unknown narrowing
- Add `@codemirror/view` + `@codemirror/state` dev dependencies so types resolve properly

## 1.1.0 (2026-04-16)

### Features

- Active-sentence highlighting in the editor as text is read aloud
- Floating, draggable playback control panel with:
  - Play / Pause toggle (halts and resumes mid-sentence)
  - Stop
  - Jump to next / previous sentence
  - Live "current / total" sentence counter
- Pause/resume preserves exact playback position via process signals (SIGSTOP / SIGCONT)
- New commands (all hotkey-able): pause-resume, next-sentence, previous-sentence

## 1.0.0 (2026-04-14)

Initial release.

### Features

- Read entire note aloud using macOS native text-to-speech
- Read selected text
- Read from cursor position to end of note
- Stop speaking instantly
- Voice selection from all installed macOS voices (180+)
- Language filter to narrow voice list by locale
- Adjustable speech rate (0.5x to 3.0x)
- Content filters to control what gets read:
  - Code blocks (fenced and inline)
  - LaTeX math equations
  - Tables
  - Link text
  - Images (alt text)
  - Obsidian embeds
  - Callouts
  - HTML tags
  - Tags
- Ribbon icon with play/stop toggle
- Status bar indicator while speaking
- Smart markdown stripping for clean speech output
