# WhisperTranscribe Web Prototype Brief

> Copy and paste everything below into Cursor chat to get started. This gives the AI all the context it needs to plan and build the prototype.

---

## Prompt

I'm working with a company called WhisperTranscribe (https://www.whispertranscribe.com/). They have a Mac desktop app (Electron) for audio/video transcription powered by OpenAI Whisper. I want to rebuild their app as a web prototype so we can propose UX improvements.

### Goal

Rebuild the WhisperTranscribe desktop app as a web app, pixel-matched to the current product. This is a **clickable prototype** -- no backend, all mock data. We want a realistic baseline we can later iterate on with improvements.

### Screens to Build

Build all of these (reference screenshots are in `@refs`):

1. **Onboarding flow** (5 steps):
   - Welcome splash ("Get started with 60 free minutes")
   - Step 1/3: Transcription language (dropdown)
   - Step 2/3: Create your first project (text input)
   - Step 3/3: "What best describes you?" (14-option role picker grid)
   - Completion ("Welcome to WhisperTranscribe!" with CTA)

2. **Empty state / New Transcription**:
   - Upload File tab (drag & drop zone, file picker)
   - From the Web tab (URL input)
   - Record Audio and Podcast Library tabs (stub/placeholder is fine)

3. **Example state** ("User Interview 1: Nicky"):
   - Transcript tab (speaker-labeled segments with timestamps, audio player, toolbar)
   - Content Hub tab (sub-tabs: Summary, Quotes, Chapters, Summary By Speaker, Summary By Topic, Follow Up Questions, UX Report + Magic Chat)
   - Visual Hub tab (aspect ratio picker, Audiogram/Video Clip selector, audiogram editor preview)

Everything should be clickable and navigable. Onboarding -> app -> example transcript, switching between tabs, etc.

### Tech Stack -- Use Vue + Quasar (same as the actual app)

The actual WhisperTranscribe desktop app is built with **Vue 3 + Quasar + Vite** in Electron. We should use the **same stack** to maximize 1:1 fidelity:

- **Vue 3** (Composition API, `<script setup>`)
- **Quasar Framework** -- provides all UI components: QBtn, QInput, QSelect, QTabs, QDrawer, QLayout, QPage, QCard, QExpansionItem, etc. **No custom UI primitives needed.**
- **Vite** (build tool)
- **Material Symbols Outlined/Rounded** (icon font, loaded via Google Fonts CDN) -- NOT Lucide. The app uses Material Symbols with the `sym_o_` and `sym_r_` prefix naming convention.
- **Roboto** (font, loaded via Google Fonts CDN)
- Deploy to **Vercel** as a static SPA via a **private GitHub repo**

Scaffold with: `npm create quasar` (select Vite + Vue 3)

### Why this stack matters

Using the same framework means:
- **No custom Button/Input/Select needed** -- Quasar components match 1:1
- **Same CSS utility classes** -- `bg-primary`, `text-white`, `q-pa-xl`, `q-mb-md`, `text-h4`, `text-body2`, `text-grey-7` all work identically
- **Same icon names** -- `sym_o_search`, `sym_o_translate`, `sym_r_undo` etc.
- **Same layout system** -- QLayout + QDrawer = exact sidebar behavior
- **CSS from the app can be copy-pasted** into our custom stylesheet

### Design Tokens

Extracted from the actual app's Quasar config (set these in `quasar.config.js` brand colors):

```
Primary:   #743ee4
Secondary: #743ee4
Accent:    #ffa400
Positive:  #21ba45
Negative:  #c10015
Warning:   #ff8d28
Info:      #31ccec
Dark:      #1d1d1d
```

**Purple scale** (for custom CSS classes):
`#f9f5ff`, `#f1ecfc`, `#e3d8fa`, `#d5c5f7`, `#c7b2f4`, `#b99ef1`, `#ac8bef`, `#9e78ec`, `#9065e9`, `#8251e7`, `#743ee4`

**Other colors:**
- Borders: `#e0e0e0`
- Grey text: `#9e9e9e` (placeholder), `#616161` (secondary), `#424242` (body)
- Selection: `#f1ecfc` (list items), `#e3d8fa` (text)
- Logo wordmark: `#2C048B`
- Cards: white, `border-radius: 16px`

### Assets -- Extract from the Electron App

The Electron app at `/Applications/WhisperTranscribe.app/Contents/Resources/` contains everything we need.

**Extract the asar bundle:**
```bash
npx @electron/asar extract "/Applications/WhisperTranscribe.app/Contents/Resources/app.asar" /tmp/wt-extract
```

**SVG Logos** (from `/tmp/wt-extract/assets/`):
- `logo_onboarding-Pb_2pLyt.svg` -- icon + dark purple "WhisperTranscribe" text (for onboarding)
- `icon_text-Cd_WESV2.svg` -- icon + white "Whisper Transcribe" text (for sidebar)
- `icon-DafS1d_m.svg` -- standalone icon with drop shadow

**Icons** (from `/tmp/wt-extract/icons/`):
- 16 `profile-*.svg` files -- one per role in the onboarding picker
- 29 custom SVGs: `magic_staff.svg`, `content.svg`, `transcript.svg`, `style.svg`, `star.svg`, `zoom.svg`, etc.
- All other icons are **Material Symbols** loaded via font (not SVGs)

**Material Symbols** icons used across pages (~60 total). Key ones:
- Start page: `sym_o_adaptive_audio_mic`, `sym_o_attach_file`
- Transcript: `sym_o_play_circle`, `sym_o_search`, `sym_o_translate`, `sym_o_download`, `sym_r_undo`, `sym_r_redo`, `sym_o_file_copy`
- Content Hub: `sym_o_add`, `sym_o_bookmark`, `sym_o_edit_square`, `sym_o_refresh`
- Visual Hub: `sym_o_crop_square`, `sym_o_image`, `sym_o_movie`
- Onboarding: `sym_o_trending_flat` (arrow between step numbers)

**Example Data** (from `/Applications/WhisperTranscribe.app/Contents/Resources/examples/`):
- `user-interview-research.json` -- the exact "User Interview 1: Nicky" transcript:
  - `record.title`: "User Interview 1: Nicky"
  - `record.speakers`: [{speaker: 0, speakerLabel: "Sophia Valdez"}, {speaker: 1, speakerLabel: "Nicky"}]
  - `words`: 1387 word-level entries with `punctuated_word`, `start`, `end`, `confidence`, `speaker`
  - `content`: array of 6 items -- Summary (with Key Takeaways markdown), Quotes, Chapters (5 chapters with timestamps), Sentiment Analysis, Summary By Speaker, Summary By Topic
  - Content uses `{{speaker:0}}`/`{{speaker:1}}` placeholders that resolve to speaker names

Copy this JSON into your `src/data/` and parse it into usable paragraph segments by grouping words on speaker changes.

### Route Structure (Vue Router)

Match the actual app's routing:
```
/           -> redirect to /auth or /start
/auth       -> onboarding flow (5 steps in one page)
/start      -> New Transcription (empty state)
/transcript/:id -> Example transcript detail (3 tabs)
```

### Component Structure

Since Quasar provides all UI primitives, we only build page and domain components:

**Pages** (`src/pages/`):
- `AuthPage.vue` -- 5-step onboarding (mirrors actual AuthPage)
- `StartPage.vue` -- new transcription empty state
- `TranscriptPage.vue` -- transcript detail with 3 tabs

**Layouts** (`src/layouts/`):
- `OnboardingLayout.vue` -- QPage with `class="bg-primary"` centered card
- `MainLayout.vue` -- QLayout + QDrawer (sidebar) + promo QBanner + QPageContainer

**Components** (`src/components/`):
- `ProfileSelector.vue` -- role picker grid (14 options)
- `LanguageSelector.vue` -- wraps QSelect for language dropdown
- `SourceTabs.vue` -- upload/record/web/podcast tab cards
- `FileUploadArea.vue` -- drag & drop zone
- `SpeakerSegment.vue` -- transcript paragraph with speaker label + timestamp
- `AudioPlayer.vue` -- bottom play controls
- `TranscriptToolbar.vue` -- find, undo/redo, copy, translate, export
- `ContentSubTabs.vue` -- horizontal pill tabs
- `MagicChat.vue` -- chat input + send button
- `ClipTypeSelector.vue` -- Audiogram / Video Clip cards

### Onboarding Flow (from actual source code)

Steps from `AuthPage-DAjy8Z3o.js`:
1. `free-credits` -- logo + "Get started with 60 free minutes" + Continue button
2. `selectLanguage` -- step indicator (1->2->3) + language QSelect + Next
3. `createProject` -- step indicator + text QInput (default "My project") + Next
4. `selectProfile` -- step indicator + ProfileSelector grid + Next
5. `done` -- "Welcome to WhisperTranscribe!" + confetti + "Add your first transcript" / "View example"

### Role Picker Options (step 3)

14 options in a 2-column grid. Each has a custom profile SVG icon and description:
1. I just need a transcript -- "Transcript, summary, magic chat"
2. Podcaster -- "Show notes, titles, social media posts, and more"
3. YouTuber -- "Titles, tags, YT description, social media posts, and more"
4. Student -- "Study guide, summary by topic, study questions, and more"
5. Meetings -- "Meeting minutes and more"
6. Researcher -- "Sentiment analysis, summary by topic, and more"
7. Educator -- "Study guide, lecture notes, study questions, and more"
8. Courses & Webinars -- "Course description, FAQ, actionable tips, and more"
9. Journalist -- "Important moments, follow up questions, and more"
10. Coach -- "Session worksheet, language analysis, and more"
11. UX Researcher / Product Manager -- "UX report, follow up questions, transcript insights"
12. Church -- "Five day devotional, discussion guide, and more"
13. Sales Calls -- "Pain points, customer needs, next steps, and more"
14. Custom

### Key CSS Patterns from the App

Copy these into `src/css/app.css`:

**Source tabs (StartPage):**
```css
.option-box { background: #fff; cursor: pointer; max-height: 150px; color: #9e9e9e; }
.option-box:hover { box-shadow: 0 3px 4px rgba(0,0,0,0.12); color: #616161; }
.option-box-active { border-color: #743ee4; box-shadow: 0 2px 3px rgba(0,0,0,0.12); color: #743ee4 !important; }
```

**Content Hub tabs:**
```css
.tab-transcript-navigation { font-size: .875rem; cursor: pointer; background-color: #f1ecfc; white-space: nowrap; height: 40px; }
.tab-transcript-navigation:hover:not(.tab-transcript-navigation-active) { background-color: #e3d8fa; }
.tab-transcript-navigation-active { background-color: #743ee4; color: #fff; }
```

**Animated gradient "Transcribe Now" button:**
```css
.bg-gradient-animate {
  background: linear-gradient(60deg, #f79533, #f37055, #ef4e7b, #743ee4, #ef4e7b, #f37055, #f37055, #f79533);
  animation: 6s ease infinite alternate animatedgradient;
  background-size: 300% 300%;
}
.bg-gradient-animate.disabled {
  background: linear-gradient(90deg, #bcb4d3, #ebc8d5);
  animation: none;
}
@keyframes animatedgradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

**Transcript viewer:**
```css
.paragraph-text { max-width: 750px; min-height: 1.5rem; text-align: start; }
.speaker-dropdown { min-width: 250px; max-width: 250px; }
```

**Visual Hub:**
```css
.clip-type { border: 1px solid #b99ef1; width: 160px; height: 196px; }
.clip-type:hover:not(.clip-type-has-overlay) { background: #f1ecfc; }
.clip-type-selected { border: 2px solid #743ee4; background: #f1ecfc; }
```

### Infrastructure

1. Scaffold in this workspace (`/Users/patcapulong/Development/Projects/personal/whispertranscribe-dry-run-01/`)
2. Extract assets from Electron app into the project
3. Initialize git, create **private** GitHub repo
4. Deploy to Vercel for a shareable link
5. Commit at logical milestones

### Important Notes

- This is a **prototype** -- no backend, no auth, no real transcription. All data is mocked.
- Match the UI **1:1** with the screenshots in `@refs`.
- Use **Quasar components** (QBtn, QInput, QSelect, etc.) -- do NOT build custom UI primitives.
- Use **Material Symbols** icons (sym_o_/sym_r_ prefix) -- do NOT use Lucide.
- Use the **extracted CSS patterns** from the Electron app where possible.
- The `@refs` folder has all the reference screenshots. Use them as your visual guide.
