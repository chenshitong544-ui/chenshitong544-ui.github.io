# Video production workspace
The active app is `index.html`, `video-workbench.js`, and `video-workbench.css`. It uses browser APIs directly and needs no third-party runtime or CDN. Run `npm run build` in this directory to check syntax and refresh asset versions. Previous React source remains for history and is not the deployed entrypoint.

## Workflow
- Video projects are the home screen. Each episode owns its script, shots, assets, final cuts and platform publications.
- Keep three primary destinations: video projects, shared assets, production schedule. Monthly reports and project documents are secondary.
- Script and shot breakdown remain next to each other. Blank-line splitting previews original paragraphs and writes them in one transaction. It never generates or rewrites creative content.
- Each shot links specific asset versions, records category requirements and review notes. Only adopted assets satisfy material requirements.
- Shared assets are reusable; episode assets stay in the episode. New versions share a version group but keep distinct IDs so a reviewed shot does not silently change files.
- Preview images lazily and open video/audio on demand. Files are private; client uses authenticated file access.
- Shared link and self-selected editor name preserve existing collaboration. Optimistic revisions protect against overwriting teammates.
- PPT has no navigation, editor or work list in this app. Historical data remains stored; old non-PPT project records are collapsed in the archive.
- Existing reports, original files and documentation remain intact. No real publication metrics or sample creative files are invented.

## Visual decisions
Pale neutral background, white surfaces, restrained blue, a narrow sidebar, one main action per section, thin separators, short Chinese labels. Avoid overview dashboards, decorative charts and large card nests. Responsive layouts stack the script above the shot list on narrow screens; all destinations remain reachable.

## References inspected
- https://milanote.com/guide/film-preproduction — group preparation around a project and organize source materials.
- https://milanote.com/guide/film-shot-list — connect shot order, images, notes and production details.
- https://www.studiobinder.com/blog/free-script-breakdown-sheet/ — separate script elements by scene and material requirement.
- https://help.frame.io/en/articles/9101068-versioning-in-frame-io — keep review and file history together.

These references informed information architecture and workflow, not a copied visual design.

## Validation
`tests/browser.cjs` runs a complete production flow with an isolated in-memory API fixture, including file upload, shot association, asset versions, comments, save conflicts, publishing and monthly reports. Screenshots and a 390px viewport overflow check run in GitHub Actions. Fixtures contain no real shared credentials or user materials.
Live Postgres functions are separately checked inside rolled-back transactions. The browser fixture does not claim to validate production network connectivity.
