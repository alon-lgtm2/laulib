# Bavua Content Library — Engineer Handover

## Live URLs

| What | URL |
|------|-----|
| Wix site (library page) | https://liron03.wixstudio.com/bavua/blank-1-1 |
| React app (Netlify) | https://famous-malabi-a80fce.netlify.app |
| GitHub repo | https://github.com/alon-lgtm2/laulib |

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  Wix Studio Page                        │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  Embed Code element (#library)   │   │
│  │                                  │   │
│  │  ┌──────────────────────────┐    │   │
│  │  │  <iframe>                │    │   │
│  │  │  famous-malabi-a80fce    │    │   │
│  │  │  .netlify.app            │    │   │
│  │  │                          │    │   │
│  │  │  React App               │    │   │
│  │  │  (bavua-library)         │    │   │
│  │  └──────────────────────────┘    │   │
│  └──────────────────────────────────┘   │
│                                         │
│  Velo Page Code                         │
│  → queries Wix CMS (Topics/Series/      │
│    Lessons)                             │
│  → sends data via postMessage to        │
│    the Embed Code element               │
└─────────────────────────────────────────┘
```

### Data flow

1. Wix page loads → Velo code (`velo-page-code.js`) queries the CMS
2. CMS data is sent to the Embed Code element via `$w('#library').postMessage(...)`
3. The Embed Code element relays it to the inner `<iframe>` via `window.postMessage`
4. The React app receives the message, updates state, and renders the library
5. Until the message arrives, the app renders with local dev data (so the page never looks blank)

---

## Repository Structure

```
laulib/
├── src/
│   ├── App.jsx          # All UI — layout, styles, components
│   └── main.jsx         # Entry point, postMessage bridge, dev data
├── index.html           # HTML shell (single <div id="root">)
├── vite.config.js       # Vite + vite-plugin-singlefile config
├── velo-page-code.js    # Paste this into Wix Dev Mode page code editor
├── velo-library-page.js # Legacy native Velo version (not in use)
└── public/
    └── index.html       # Not used in production (leftover from earlier approach)
```

The build outputs a **single self-contained `dist/index.html`** (all JS/CSS inlined, ~165 kB gzipped ~53 kB). No other files needed on Netlify.

---

## Local Development

```bash
git clone https://github.com/alon-lgtm2/laulib.git
cd laulib
npm install
npm run dev       # → http://localhost:5173
```

The app runs with local mock data (`DEV_DATA` in `src/main.jsx`) — no Wix connection needed for development.

---

## Build & Deploy to Netlify

### One-time setup

```bash
npm install -g netlify-cli
netlify login      # opens browser auth
```

### Deploy

```bash
npm run build
netlify deploy --dir=dist --site=5bb3050a-a333-4fc1-8b57-4c4a3374323c --prod
```

The site ID is `5bb3050a-a333-4fc1-8b57-4c4a3374323c` (Netlify site: `famous-malabi-a80fce`).

### Granting Netlify access

Ask the site owner (Alon) to invite you at:
**https://app.netlify.com/projects/famous-malabi-a80fce/settings/members**

---

## CMS Collections

Three Wix CMS collections drive the library. All are queried by the Velo page code on every page load.

### Topics
Top-level categories shown in the sidebar.

| Field | Type | Notes |
|-------|------|-------|
| `title` | Text | Displayed in sidebar |
| `sortOrder` | Number | Controls display order (1, 2, 3…) |

### Series
Cards shown when a topic is selected.

| Field | Type | Notes |
|-------|------|-------|
| `title` | Text | Main card heading |
| `subtitle` | Text | Optional subheading |
| `topic` | Reference → Topics | Which topic this belongs to |
| `mediaType` | Text | `video` / `audio` / `book` / `article` |
| `sortOrder` | Number | Order within the topic |

### Lessons
Rows shown when a series is opened.

| Field | Type | Notes |
|-------|------|-------|
| `title` | Text | Lesson name |
| `series` | Reference → Series | Which series this belongs to |
| `topic` | Reference → Topics | Which topic (for search/filter) |
| `mediaType` | Text | `video` / `audio` / `book` / `article` |
| `duration` | Number | In minutes |
| `tags` | Tags | Up to 2 shown in UI |
| `videoUrl` | Text | Any media URL (see Media Types below) |
| `sortOrder` | Number | Order within the series |
| `isPublished` | Boolean | **Must be `true` to appear in the library** |

### Media URL auto-detection

The `videoUrl` field accepts any of these — the player is chosen automatically:

| URL format | Player |
|-----------|--------|
| `youtube.com/watch?v=...` or `youtu.be/...` | Embedded YouTube |
| `.mp3` / `.m4a` / `.wav` etc. | HTML5 audio player |
| `.mp4` / `.webm` / `.mov` etc. | HTML5 video player |
| `.pdf` or Google Drive PDF | Inline PDF viewer |
| Any other `https://` URL | External link card (article) |

---

## Adding Content via Wix REST API

Use the [Wix Data Items API](https://dev.wix.com/docs/rest/business-solutions/cms/data-items/introduction) to insert content programmatically.

### Authentication

1. Go to **Wix Developer Dashboard** → your site → **API Keys**
2. Create a key with **Wix Data** read/write permissions
3. Get your **Site ID** from Dashboard → Settings → Site ID

### Base URL & headers

```
POST https://www.wixapis.com/wix-data/v2/items
Authorization: <your-api-key>
wix-site-id: <your-site-id>
Content-Type: application/json
```

### Insert a Topic

```bash
curl -X POST https://www.wixapis.com/wix-data/v2/items \
  -H "Authorization: YOUR_API_KEY" \
  -H "wix-site-id: YOUR_SITE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "dataCollectionId": "Topics",
    "dataItem": {
      "data": {
        "title": "רמב\"ן",
        "sortOrder": 1
      }
    }
  }'
```

### Insert a Series

```bash
curl -X POST https://www.wixapis.com/wix-data/v2/items \
  -H "Authorization: YOUR_API_KEY" \
  -H "wix-site-id: YOUR_SITE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "dataCollectionId": "Series",
    "dataItem": {
      "data": {
        "title": "שיעורי רמב\"ן על התורה",
        "subtitle": "מחזור א",
        "topic": "<topic-item-id>",
        "mediaType": "video",
        "sortOrder": 1
      }
    }
  }'
```

The `topic` value is the `_id` of the Topic item returned from a previous insert or a query.

### Insert a Lesson

```bash
curl -X POST https://www.wixapis.com/wix-data/v2/items \
  -H "Authorization: YOUR_API_KEY" \
  -H "wix-site-id: YOUR_SITE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "dataCollectionId": "Lessons",
    "dataItem": {
      "data": {
        "title": "בראשית — בחינת הבריאה",
        "series": "<series-item-id>",
        "topic": "<topic-item-id>",
        "mediaType": "video",
        "duration": 68,
        "videoUrl": "https://youtube.com/watch?v=XXXX",
        "tags": ["בריאה", "רמב\"ן"],
        "sortOrder": 1,
        "isPublished": true
      }
    }
  }'
```

### Query items (e.g. get all Topics to find their IDs)

```bash
curl -X POST https://www.wixapis.com/wix-data/v2/items/query \
  -H "Authorization: YOUR_API_KEY" \
  -H "wix-site-id: YOUR_SITE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "dataCollectionId": "Topics",
    "query": { "sort": [{ "fieldName": "sortOrder", "order": "ASC" }] }
  }'
```

---

## Updating the Library Layout

All UI lives in **`src/App.jsx`**. It is a single-file React component with inline styles.

### Key sections

| Section | Where to find it |
|---------|-----------------|
| Color tokens | `const C = { ... }` at the top |
| Site background color | `const SITE_BLUE = '#4A71FF'` — **must match the Wix page background** |
| Media type colors/labels | `const MEDIA = { ... }` |
| All component styles | `const s = { ... }` near the bottom |
| Global hover/animation CSS | `const css = \` ... \`` at the very bottom |
| Dev mock data | `DEV_DATA` in `src/main.jsx` |

### Common changes

**Change colors**
Edit the `C` object. `SITE_BLUE` is critical — it must match the Wix page background so the iFrame boundary is invisible.

**Change sidebar width**
```js
sidebar: { width: 230, minWidth: 230, ... }
```

**Change series card grid columns**
```js
seriesGrid: { gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', ... }
```

**Add a new field to the lesson modal**
Find the modal JSX block (search for `selectedLesson &&`) and add your field alongside the existing title/tags.

**Add a new media type**
Add an entry to the `MEDIA` constant:
```js
const MEDIA = {
  ...
  podcast: { label: 'פודקאסט', icon: '🎙', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
};
```

### After any code change

```bash
npm run build
netlify deploy --dir=dist --site=5bb3050a-a333-4fc1-8b57-4c4a3374323c --prod
```

Changes are live within ~30 seconds.

---

## Wix Page Setup (reference)

In case the Wix page needs to be rebuilt from scratch:

### Embed Code element HTML
The page contains one **Embed Code** element (ID: `#library`) with this HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, iframe { width: 100%; height: 100%; border: none; display: block; }
  </style>
</head>
<body>
  <iframe id="frame"
    src="https://famous-malabi-a80fce.netlify.app"
    style="width:100%;height:100%;border:none;">
  </iframe>
  <script>
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'LIBRARY_DATA') {
        document.getElementById('frame').contentWindow.postMessage(e.data, '*');
      }
    });
  </script>
</body>
</html>
```

### Velo page code
Found in `velo-page-code.js` in the repo. Paste into the Wix Dev Mode page code editor:

```js
import wixData from 'wix-data';

$w.onReady(async function () {
  try {
    const [topicsRes, seriesRes, lessonsRes] = await Promise.all([
      wixData.query('Topics').ascending('sortOrder').find(),
      wixData.query('Series').ascending('sortOrder').find(),
      wixData.query('Lessons').eq('isPublished', true).ascending('sortOrder').find(),
    ]);

    $w('#library').postMessage({
      type: 'LIBRARY_DATA',
      payload: {
        topics:  topicsRes.items,
        series:  seriesRes.items,
        lessons: lessonsRes.items,
      },
    });

  } catch (err) {
    console.error('שגיאה בטעינת הספרייה:', err);
  }
});
```

---

## Notes

- The library page currently has no pagination — all published lessons are loaded at once. If the collection grows beyond ~500 lessons, add server-side pagination to the Velo query.
- The `isPublished` flag on Lessons is the content gate — anything unpublished is silently excluded from the query.
- The React app never talks directly to Wix. All data flows through the postMessage bridge. This means the app can be developed and tested entirely offline using `DEV_DATA`.
