# PF1e tracker (Vue)

Vue 3 + Vite + Pinia. Plain JavaScript, no router (five tabs), no UI library: it reuses the original CSS.

```bash
npm install
npm run dev       # http://localhost:5173 (open it from your phone with `npm run dev -- --host`)
npm test          # 16 tests: inventory rules, table mapping, the Items screen, cloud sync
npm run build     # static site in dist/ (works from any folder)
```

## Where things live

```
src/
  main.js                 starts Vue, Pinia, local persistence and cloud sync
  App.vue                 nav + current screen + toast + confirm dialog
  views/                  one file per screen   (ItemsView, MoreView, PlaceholderView)
  components/             reusable pieces       (ItemCard, ItemDetail, ItemForm, Sheet, ...)
  stores/
    app.js                state S + party, localStorage, undo, toast, confirm dialog, history log
    inventory.js          every action on an item (use charge, equip, duplicate, add, edit, delete)
    cloud.js              sync with Supabase (diff, revision, conflicts)
  lib/                    plain JS with no Vue: easy to test
    mapping.js            app state <-> database tables (the contract with schema.sql)
    items.js              inventory rules (equip limits per slot, groups, loadout)
    supabase.js           REST client
    constants.js          glyphs, categories, slots (extracted from the old file)
  styles/app.css          the original stylesheet, untouched
  styles/vue.css          the few styles that only exist here
schema.sql                the database; run it once in Supabase
```

**Change how an item row looks** → `components/ItemCard.vue`. **Change what the detail sheet offers** → `ItemDetail.vue`.
**Change an inventory rule** → `lib/items.js` (and its test). **Add a field to items** → `mapping.js` (`M_ITEM`), a column in `schema.sql`, then the form.

## Add a screen

1. Create `src/views/XView.vue` (a `<script setup>` + template; read state with `useAppStore()`).
2. Register it in `App.vue` → `views = { items: ItemsView, x: XView }`.
Tabs without a view show a placeholder.

## Migration map (single-file version → here)

The cloud tables are the bridge: **both versions read and write the same data**, so you keep casting with the old
`index.html` while the rest is ported, one screen at a time. If both are served from the same origin they also share
the local copy and the login.

| Old (`index.html`) | New | Status |
|---|---|---|
| `vItems`, `itemCardHTML`, `loadoutHTML`, item add/edit sheets | `ItemsView`, `ItemCard`, `ItemDetail`, `ItemForm` | **done** |
| state, `save`/`load`, undo, `toast`, `ask` | `stores/app.js`, `ToastHost`, `ConfirmDialog` | **done** |
| cloud sync (`clRows`, `cloudPush`, conflicts) | `lib/mapping.js`, `stores/cloud.js` | **done** |
| `vMore` + sign-in | `MoreView` | done (Party / Catalog / Setup links pending) |
| `moneyHTML` (party money) | `components/MoneyPanel.vue` | **started** (shared purse panel; verify original interactions) |
| `partyForm`, `partyViewHTML` | `views/PartyView.vue` | todo |
| `vMagicCatalog` + catalog sync (`catSync`, `catUpload`) | `views/CatalogView.vue`, `stores/catalog.js` | todo |
| `vFx` (active effects, rounds) | `views/FxView.vue`, `stores/effects.js` | todo |
| `vCast`, `listHTML`, `eyesHTML`, spell rows | `views/CastView.vue`, `SlotPips.vue`, `SpellRow.vue` | todo, the big one |
| `vDB` (spell search, imports) | `views/SpellsView.vue` | todo |
| `vSetup`, class tables (`CLS`) | `views/SetupView.vue`, `lib/classes.js` | todo |
| `vHistory`, conditions, skills reference (`SKILLS`) | `views/HistoryView.vue`, `lib/skills.js` | todo, mostly data |
| viewer mode (`?view=1`) | `views/Viewer*.vue` | todo |
| service worker / manifest | `vite-plugin-pwa` | todo |

Suggested order: money → party → effects → catalog → cast → spells → setup → the rest.
Pure logic (spell DCs, durations, class tables) should go to `src/lib/` first, with a test, then get a screen.

## Deploy

Push to GitHub, set Settings → Pages → Source to "GitHub Actions". `.github/workflows/deploy.yml` runs the tests,
builds and publishes on every push to `main`. The Supabase URL and public key are in `lib/supabase.js`
(override with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
