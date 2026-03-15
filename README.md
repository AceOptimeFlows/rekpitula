# Re⏪ K🧠 π🌀 Tú🫵 L@🗣️
### Privacy-first offline meeting minutes PWA by OptimeFlow(s)

Re⏪ K🧠 π🌀 Tú🫵 L@🗣️ is an installable, offline-first Progressive Web App for turning meetings into clear, structured records.

It combines local dictation, threaded contributions, key-point extraction, action tracking, final observations, and formal A4 PDF export in a single browser-based workflow.

This project is designed for people who want a **fast, private, no-backend** way to capture and export meeting minutes from desktop or mobile.

---

## Why this app exists

Most note-taking tools are either too generic, too heavy, or too dependent on cloud services for something as simple as documenting a meeting.

This app focuses on a practical workflow:

- define the meeting context,
- capture participant contributions,
- extract the essentials,
- assign actions,
- preserve observations,
- export a polished document.

Everything happens inside the browser.

---

## Core capabilities

### Structured meeting capture
- Meeting title, date, type, and participant setup
- Threaded contributions with nested replies
- Final observations section for context, blockers, risk notes, or environment remarks

### Dictation and transcription
- **Whisper offline mode** for privacy-first, on-device transcription after the model is downloaded
- **Browser dictation mode** for faster startup when supported by the browser

### Meeting synthesis
- Automatic key-point extraction from recorded contributions
- Task management with assignee, due date, and status
- Per-person timeline view generated from tasks

### Export and sharing
- Formal **A4 PDF export**
- **Copy for Gmail**: copies a rich HTML version plus plain text to the clipboard
- Branded export options:
  - entity / company name
  - header logo
  - footer text
  - margin color
  - contour color
  - table/header color
  - document text color

### App experience
- Installable PWA
- Offline-first behavior
- Local autosave
- Multiple visual themes
- Multilingual UI

---

## Feature overview

- **Offline-first**: designed to keep working after assets and models are cached
- **Local state**: meeting data is saved in browser storage
- **Threaded notes**: capture discussions in a reply-based structure instead of a flat text dump
- **Formal export**: generate print-ready minutes from structured data
- **Mobile-friendly**: optimized for phones, foldables, tablets, and desktop browsers
- **No framework dependency**: built with plain HTML, CSS, and JavaScript

---

## Privacy model

This repository contains **no backend** and no server-side meeting processing.

What happens locally:
- meeting data is stored in `localStorage`
- export rendering happens in the browser
- Whisper runtime and model files are cached in browser storage for offline reuse

Important distinctions:
- **Whisper offline mode**: audio and transcription stay on-device *after the runtime and model are downloaded*
- **Browser dictation mode**: may depend on browser or platform speech services, depending on the environment
- the first Whisper download requires an internet connection because the runtime and model are fetched remotely once

If you need the strongest privacy profile, use **Whisper offline mode**.

---

## Supported UI languages

The app currently includes UI support for:

- Spanish
- English
- Portuguese (Brazil)
- German
- Italian
- French
- Russian
- Korean
- Japanese
- Chinese

The localization structure is simple to extend if you want to add more languages.

---

## Tech stack

- **HTML5**
- **CSS3**
- **Vanilla JavaScript**
- **Progressive Web App** features
  - Web App Manifest
  - Service Worker
  - install prompt support
- **Web Speech API / SpeechRecognition** for browser dictation mode
- **Transformers.js** with **Xenova/whisper-small** for offline transcription mode
- **Browser Cache Storage** for runtime/model caching
- **localStorage** for app state persistence

---

## Project structure

```text
.
├── index.html
├── styles.css
├── app.js
├── transcription.js
├── export.js
├── i18n.js
├── manifest.webmanifest
├── sw.js
├── lang/
├── assets/
└── icons/
```

### Main files

- `index.html` — app shell and layout
- `styles.css` — themes, layout, responsive behavior, print helpers
- `app.js` — state management, UI wiring, participants, threads, key points, tasks, observations
- `transcription.js` — transcription engine selection, Whisper loading, browser speech recognition, caching
- `export.js` — branded PDF export, print pipeline, Gmail clipboard export, export settings
- `i18n.js` + `lang/` — localization layer and translation files
- `sw.js` — service worker for PWA/offline behavior

---

## How it works

1. Create the meeting context
   - title
   - date
   - type
   - participants

2. Generate the structure
   - this enables the working sections of the app

3. Capture contributions
   - type manually or dictate
   - add threaded replies when needed

4. Extract key points
   - generate concise takeaways from captured contributions

5. Add tasks
   - assignee
   - due date
   - status

6. Add final observations
   - issues, blockers, risks, tone, dependencies, implicit agreements

7. Export
   - print-ready PDF
   - Gmail-ready copied version

---

## Running locally

Because this is a PWA and uses microphone access, you should run it from **localhost** or over **HTTPS**.

### Option 1: Python

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

### Option 2: Node static server

```bash
npx serve .
```

### Production hosting

This project is static and can be deployed easily to:

- GitHub Pages
- Netlify
- Vercel (static)
- any HTTPS static host

---

## Browser notes

### Whisper offline mode
Works best in modern Chromium-based browsers and environments that support:
- secure context
- microphone access
- dynamic imports
- Cache Storage
- enough local storage space for model/runtime caching

### Browser dictation mode
Depends on `SpeechRecognition` / `webkitSpeechRecognition` support and may vary by browser and platform.

### PDF export
Desktop browsers usually provide the cleanest print-to-PDF experience.

On mobile, the app uses isolated print targets to improve compatibility, but the final save/share/print dialog still depends on the browser and operating system.

---

## Export customization

From the settings panel, you can configure export branding and styling:

- header entity / company name
- header logo
- footer text
- page margin color
- contour color
- table and section header color
- main text color

These choices affect both:
- the exported PDF
- the Gmail copy version

---

## Themes

The UI includes multiple visual themes, including:

- System
- Dark
- Midnight
- Nebula
- Ocean
- Forest
- Amber
- Violet
- Mono

---

## Accessibility and UX details

The app includes several usability-focused touches, such as:

- skip link support
- keyboard-friendly controls
- ARIA live regions for status feedback
- responsive layout for desktop and mobile
- local autosave feedback
- installable PWA flow

---

## Who this is for

This app is a good fit for:

- project leads
- committees
- workshops
- retrospectives
- 1:1 sessions
- operational follow-ups
- teams that need meeting minutes without adopting a heavy SaaS tool

---

## Development philosophy

This project intentionally stays lightweight:

- no frontend framework
- no backend requirement
- no mandatory account system
- no cloud lock-in for core functionality

The goal is simple: **capture, organize, and export meetings well**.

---

## License

Released under the **MIT License**.

See the license text included in the project.

---

## Credits

Created by **Andrés Calvo Espinosa**  
Powered under the **OptimeFlow(s)** umbrella.

---

## Suggested GitHub short description

> Offline-first PWA for meeting minutes with local dictation, threaded notes, tasks, observations, and formal PDF export.

## Zenodo DOI

10.5281/zenodo.19039827

## ORCID ID

https://orcid.org/0009-0005-4079-7418
