# Migration progress

## This pass

- Added `MoneyPanel.vue` for the shared party purse using the existing `S.money` shape (`pp`, `gp`, `sp`, `cp`).
- Integrated the money panel at the top of the Items screen.
- Changes go through the existing app store persistence and cloud sync, and use the existing undo/history conventions.
- Added styles scoped to the Vue-only stylesheet.

## Still to do

- Run `npm test` and `npm run build` in an environment where dependencies install successfully.
- Compare money interactions against the original single-file app, especially any coin conversion or spending behavior.
- Continue with Party view, then effects, catalog, casting, spell database, setup, history/reference, viewer mode, and PWA.
