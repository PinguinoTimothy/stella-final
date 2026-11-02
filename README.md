# PF1e Companion

A mobile-friendly companion app for **Pathfinder First Edition**. It started as a spell-slot tracker and grew into a collection of player-side tools for managing inventory, party loot, active effects, and rules references.

The goal is to complement the paper character sheet—not replace it. Use the app for things that are easier to track or look up digitally while keeping your character sheet as the source of truth.

> The app is actively being migrated from the original single-file HTML version to Vue. Some workflows and screens may still be in progress.

## Features

### Character and spellcasting
- Configure character details and spellcasting classes.
- Track spell slots and cast spells.
- Support class-specific casting modes, spell levels, domains, and DC bonuses.
- Rest to recover spellcasting resources.
- Browse and search the spell database.

### Inventory and party
- Manage items, quantities, equipment slots, charges, and notes.
- Track consumables such as potions, scrolls, wands, and other charged items.
- Organize items by character or keep them shared.
- Track party members, assign/move items between characters, and view their equipment.
- Manage party funds (PP, GP, SP, CP).
- Undo supported changes and review the activity history.

### Effects and combat utilities
- Track buffs and debuffs, targets, and durations.
- Track effects by rounds and other time units.
- Share relevant active effects with the party/player view.
- Browse monster stat blocks and use combat-oriented monster cards.
- Use initiative and combat tools.
- Consult grapple steps and condition reminders.

### Compendiums and rules references
- Search the magic item catalog and add entries to inventory.
- Browse mundane equipment, weapons, armor, tools, and alchemical items.
- Search monster entries and quick combat stats.
- Quick-reference skills and common DCs.
- Consult Universal Monster Rules (UMR).

### Session and player utilities
- Review a history of casts, item uses, money changes, and rests.
- View adventure map/PDF files on the device.
- Open a read-only player view using the `?view=1` URL parameter.

## Tech stack

- [Vue 3](https://vuejs.org/) + [Vite](https://vite.dev/)
- [Pinia](https://pinia.vuejs.org/) for application state
- JavaScript (ES modules)
- Supabase for optional cloud save and shared player view
- Vitest + Vue Test Utils + jsdom
- vite-plugin-pwa for installable Progressive Web App support

The app reuses CSS from the original single-file version. It has no Vue Router or UI component library.

## Requirements

- Node.js 20 recommended
- npm
- A Supabase project if you want cloud sync or the shared player view

## Run locally

Clone the repository and install dependencies:

```bash
git clone https://github.com/PinguinoTimothy/stella-final.git
cd stella-final
npm install
```

Start the Vite development server:

```bash
npm run dev
```

To access the development server from another device on your local network:

```bash
npm run dev -- --host
```

Vite prints the local and network URLs in the terminal.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm test` | Run the Vitest test suite |
| `npm run build` | Build the production app into `dist/` |
| `npm run preview` | Preview the production build locally |

## Cloud save and Supabase

The app can save data locally and optionally sync it to Supabase.

1. Create a Supabase project.
2. Run [schema.sql](./schema.sql) once in the Supabase SQL Editor.
3. Configure the Supabase project URL and public anon key in `src/lib/supabase.js`, or provide the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables.
4. Review the admin email configured in the SQL function `public.is_admin()` in `schema.sql` and change it to the account you intend to use.
5. Sign in from the app's **More → Cloud save** section.

Cloud synchronization uses a revision number to detect conflicting edits from multiple devices. When a conflict occurs, the app lets you choose whether to keep the cloud version or the local device version.

The app keeps a local copy for offline use. Supabase requests require a network connection.

See [DEPLOY.md](./DEPLOY.md) for deployment notes.

## Player view

The read-only player view can be opened by adding `?view=1` to the app URL. It is intended to let players view published party information without editing the shared data.

The editor/admin view requires a signed-in session. Player-view access is also governed by the Supabase policies defined in `schema.sql`.

## Project structure

```
.
├── index.html                 Vite entry point
├── index-original.html        Original single-file app (legacy/reference)
├── schema.sql                 Supabase schema, policies, and sync functions
├── DEPLOY.md                  Cloudflare Pages deployment notes
├── src/
│   ├── App.vue                App shell, navigation, and screen routing
│   ├── main.js                Vue/Pinia bootstrap, local persistence, cloud sync
│   ├── components/            Reusable UI components
│   ├── views/                 App screens
│   ├── stores/                Pinia state and feature stores
│   ├── lib/                   Rules, mapping, persistence, and utility logic
│   ├── data/                  Local/reference data
│   ├── services/               External/service integrations
│   ├── composables/            Reusable Vue composables
│   └── styles/                 App and Vue-specific styles
└── tests/                      Unit and component tests
```

### Where to make changes

- **Screen/UI:** `src/views/`
- **Reusable UI:** `src/components/`
- **State and actions:** `src/stores/`
- **Rules and pure logic:** `src/lib/` (prefer tests for rule logic)
- **Supabase schema:** `schema.sql`

## Deployment

The app is built as a static site and can be hosted on Cloudflare Pages or GitHub Pages.

For Cloudflare Pages, use:

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `20`

See [DEPLOY.md](./DEPLOY.md) for the Cloudflare Pages setup and PWA notes.

## Migration

The Vue app is being migrated incrementally from `index-original.html`. The legacy file is retained as a reference during the migration. The migration checklist is maintained in [MIGRATION_PROGRESS.md](./MIGRATION_PROGRESS.md).

## License and rules content

No license is currently specified in this repository. Pathfinder First Edition is a tabletop role-playing game by Paizo; this project is an unofficial fan-made companion and is not affiliated with or endorsed by Paizo.

Rules/reference text and catalog data may be derived from third-party sources. Please check the relevant source and licensing terms before redistributing this project or its data.
