# eno-m-desktop Design Document

> Authoritative reference for AI agents to understand and replicate this project's architecture.
> Generated: 2026-05-26

## Overview

eno-m-desktop is a **desktop music player** for Bilibili audio content, built with Electron + Vue 3.

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 35 |
| Framework | Vue 3.5 (Composition API, `<script setup>`) |
| Language | TypeScript |
| Build | Vite 6 + vite-plugin-electron |
| Styling | UnoCSS (presetUno + presetAttributify + presetIcons) |
| State | Pinia |
| Router | vue-router (hash history) |
| UI Components | `@cloudfly/eno-ui` (self-built) |
| Audio | Howler.js |
| Package manager | pnpm |

---

## Project Structure

```
eno-m-desktop/
├── electron/
│   ├── main/
│   │   └── index.ts          # Electron main process
│   └── preload/
│       └── index.ts          # Preload script (contextBridge)
├── src/
│   ├── App.vue               # Root shell: layout orchestration
│   ├── main.ts               # App entry point
│   ├── router/
│   │   └── index.ts          # Hash-based routes
│   ├── store/                # Global Pinia stores
│   │   ├── uiStore.ts        # UI state (theme, glow color)
│   │   ├── downloadStore.ts  # Download preferences
│   │   └── projectStore.ts   # Project-level state
│   ├── blbl/                 # Bilibili API integration
│   │   └── store.ts          # Audio playback store
│   ├── playcore/             # Business logic layer
│   │   ├── store.ts          # Singer tags, collections
│   │   └── stores/           # Feature stores
│   ├── playlist/             # Playlist feature module
│   │   ├── store.ts          # Favorites/collections
│   │   └── *.vue             # Playlist pages
│   ├── pages/                # Route-level pages
│   │   ├── Setting.vue       # Settings
│   │   ├── Singer/           # Singer feature
│   │   └── components/       # Page-scoped components
│   ├── views/                # Additional pages
│   │   ├── Search.vue
│   │   └── UIShowcase.vue    # Component demo gallery
│   ├── components/           # Shared business components
│   │   ├── Play/
│   │   │   └── Play.vue      # Core audio player (Howler.js)
│   │   ├── FullscreenPlayer/
│   │   ├── Sider.vue         # Left sidebar navigation
│   │   ├── Header.vue        # Top navigation
│   │   ├── SongItem.vue      # Song row display
│   │   ├── SingerItem.vue    # Singer card
│   │   ├── DynamicHeader.vue # Scroll-aware page header
│   │   ├── LoginDialog.vue   # Bilibili QR login
│   │   ├── UpdateCheck.vue   # Auto-update dialog
│   │   └── ...               # Other business components
│   ├── composables/          # Shared composables
│   ├── styles/               # CSS entry points
│   └── utils/                # Utilities
├── uno.config.ts             # UnoCSS configuration
└── vite.config.ts            # Vite configuration
```

---

## Architecture Decisions

### 1. Hash-based Routing
Uses `createWebHashHistory()` because Electron loads from `file://` protocol in production. All routes are `#/path`.

```ts
routes: [
  { path: "/",       name: "index",      component: () => import("../pages/Setting.vue") },
  { path: "/search", name: "search",     component: () => import("../views/Search.vue") },
  { path: "/setting",name: "setting",    component: () => import("../pages/Setting.vue") },
  // ...
]
```

### 2. Component Architecture
- **`@cloudfly/eno-ui`** — Pure UI components (Button, Dialog, Slider, etc.), no business logic
- **`src/components/`** — Business components that combine UI primitives with app logic
- **Page components** — Route-level orchestrators with store access
- **Feature modules** — Self-contained directories with page + store + types (e.g., `playlist/`, `Singer/`)

### 3. State Management Pattern
- **Pinia stores** organized by domain
- Stores are imported directly via `useXxxStore()` (no global registration)
- Auto-import configured for `vue`, `vue-router`, `pinia`

### 4. CSS Architecture
- **UnoCSS** for utility classes (layout, spacing, typography)
- **CSS Variables** for dynamic theming (defined in `src/styles/variables.css`)
- **Dynamic theme** — album art color extraction sets `--eno-accent`, `--eno-glow` in real-time
- **Scoped styles** for component-specific CSS

```css
/* Theme variables pattern */
:root {
  --eno-accent: #1db954;
  --eno-glow: rgba(29, 185, 84, 0.15);
  --eno-fill-2: rgba(255, 255, 255, 0.06);
  --eno-fill-4: rgba(255, 255, 255, 0.1);
}
```

### 5. Electron IPC Communication
Business logic that needs native OS access runs in the main process:

```ts
// Renderer invokes
const result = await window.ipcRenderer.invoke('select-directory')
const info = await window.ipcRenderer.invoke('get-ffmpeg-info')
window.ipcRenderer.invoke('open-win', '/ui-showcase')  // Opens new BrowserWindow
```

Key IPC handlers: `select-directory`, `open-folder`, `get-ffmpeg-info`, `download-ffmpeg`, `bili-user-info`, `open-win`, `open-external-window`, `check-for-updates`

### 6. Audio Playback (Play.vue)
The core player in `src/components/Play/Play.vue`:
- Uses **Howler.js** for audio
- Manages play/pause/seek/volume/loop via a Pinia store (`blbl/store.ts`)
- Supports Bilibili audio URL resolution (bvid, cid, sid)
- Media Session API integration for OS-level controls
- Keyboard shortcuts (space for play/pause, arrows for seek)

### 7. Bilibili Integration
- QR code login flow via Electron IPC
- API calls through `invokeBiliApi()` wrapper
- Audio fetching, favorites, collections, singer data

---

## Component Patterns

### Dialog Pattern
```vue
<script setup>
import { ref } from 'vue'
import { Dialog } from '@cloudfly/eno-ui'

const dialogOpen = ref(false)
</script>

<template>
  <button @click="dialogOpen = true">Open</button>
  <Dialog :open="dialogOpen" title="My Dialog" @visibleChange="dialogOpen = $event">
    <p>Content here</p>
  </Dialog>
</template>
```

### Message Toast Pattern
```vue
<script setup>
import { MessageAPI } from '@cloudfly/eno-ui'
// Usage: MessageAPI.success('Done!'), MessageAPI.error('Failed!')
</script>
```

### Scroll-aware Page Header
The `DynamicHeader.vue` component shrinks from 320px to 72px on scroll. Used by singer/favorite detail pages.

---

## Route Map

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Setting.vue | Settings page (also at `/setting`) |
| `/search` | Search.vue | Bilibili search |
| `/playlist` | playlist/index.vue | User playlists/collections |
| `/favDetail/:favId` | FavDetail.vue | Favorite folder detail |
| `/collectionDetail/:id` | CollectionDetail.vue | Collection detail |
| `/singerList` | SingerList.vue | Followed singers |
| `/singerDetail/:mid` | SingerDetail.vue | Singer songs |
| `/setting` | Setting.vue | Settings page |
| `/miniplayer` | MiniPlayer.vue | Compact mini player window |
| `/ui-showcase` | UIShowcase.vue | UI component gallery |

---

## Key External Dependencies

| Package | Purpose |
|---------|---------|
| `@cloudfly/eno-ui` | UI component library |
| `@vueuse/core` | Utilities (storage, scroll, etc.) |
| `pinia` | State management |
| `howler` | Audio playback |
| `color.js` | Album art color extraction |
| `html-to-image` | Share card generation |
| `qrcode` | QR code login |

---

## UI Library Integration

Components from `@cloudfly/eno-ui` are imported directly:
```vue
import { Button, Dialog, Slider, Loading, MessageAPI } from '@cloudfly/eno-ui'
import '@cloudfly/eno-ui/styles'  // Global CSS import at entry
```

Available components: `Button`, `Input`, `Slider`, `ProgressBar`, `PlayControlBar`, `LoopSwitch`, `Dialog`, `Drawer`, `DrawerSlideUp`, `Loading`, `Message`, `MessageAPI`, `TabItem`, `Icon`
