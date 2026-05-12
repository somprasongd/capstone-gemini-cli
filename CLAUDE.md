# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static single-page training web app for "Agentic SDLC Gemini CLI Lab" — a hands-on course teaching Human-led Agentic AI in SDLC using Gemini CLI, GitLab, and glab. The entire app is client-side with no build step. Content is in Thai language.

## Architecture

- **`index.html`** — SPA shell. Uses Tailwind CSS (CDN), Lucide icons (CDN), Inter + Noto Sans Thai fonts. Dark mode via `class="dark"` on `<html>` toggled by JS. Theme preference persisted in localStorage before first paint to avoid flash.
- **`assets/content.js`** — Single `window.COURSE_MARKDOWN` string containing the full course as markdown (~2000 lines).
- **`assets/app.js`** — All application logic: parses the markdown into a course structure, renders it, tracks completion state, generates certificates. State persisted to localStorage under key `agentic-sdlc-gemini-cli-lab:v1`.
- **`assets/styles.css`** — Custom CSS extending Tailwind. Contains markdown body styles, button states, part toggle, certificate card, print styles.

### Course Parsing Flow

`parseCourse()` in app.js reads the markdown and splits it by `# Part X:` headings (level-1). Each part becomes a group with sub-items parsed from level-2 headings (or level-1 `Phase N:` headings inside Part E). The intro content before any Part heading becomes a special `part-intro` group. A trailing `# สรุป` becomes `part-summary`.

### State Schema

```js
{
  uuid: string,            // per-session training identifier
  completed: string[],     // array of item IDs ("part-X-item-N")
  theme: "dark" | "light",
  certificateName: string,
  issuedAt: string         // ISO date
}
```

## Development

No build tools, no package manager. Open `index.html` directly in a browser or use any static file server. For live development:

```bash
npx serve .
# or
python3 -m http.server 8000
```

## Deployment

GitHub Pages via `.github/workflows/pages.yml`. Push to `main` triggers a build that copies `index.html`, `assets/`, and `.nojekyll` to `_site/` and deploys. No build/transpile step.

## Color Theme

Pastel green + pastel purple palette. CSS custom properties in `styles.css` (`--pastel-green`, `--pastel-purple`, etc.) drive the color scheme. Dark mode uses `.dark` class selector throughout. Progress bar uses a green-to-purple gradient. Tailwind classes use `violet-*` and `emerald-*` for accents.

## Key Behaviors

- **Item toggle**: Each item has a "Mark complete" / "Completed" button toggling its ID in `state.completed`
- **Part toggle**: Each part header has a "Complete all" button that toggles all items in that part at once
- **Certificate**: Appears when 100% complete; user enters name, generates a printable certificate with UUID and date
- **Reset**: Clears all progress and generates a new UUID
- **Markdown rendering**: Custom renderer in `renderMarkdown()` — handles code blocks (with heredoc detection), tables, blockquotes, lists, headings, inline formatting
