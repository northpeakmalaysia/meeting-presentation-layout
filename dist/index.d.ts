/**
 * Built-in plugin — presentation-layout.
 *
 * Turns a shared PDF/PPTX artefact into a live, navigable presentation.
 * One participant ("the controller") drives the page; all other
 * participants see the synchronized page through the Hub UI.
 *
 * What this plugin owns:
 *   - Rendering each page of the source file to a PNG image.
 *   - Producing a stable list of page URLs for the Hub UI to display.
 *   - Per-session lookup so navigation events can find page image paths.
 *
 * What the Hub owns (NOT this plugin):
 *   - Session state in the `presentations` SQLite table.
 *   - Real-time fan-out of page changes to participant WebSockets.
 *   - Access control (who can drive vs. who watches).
 *   - The `bridge.presentation.state-changed` event sent to CEO Agent.
 *
 * Format support in v1:
 *   - PDF — rendered via pdfjs-dist + a Node Canvas polyfill.
 *   - PPTX — requires LibreOffice on PATH (used to convert pptx→pdf,
 *     then PDF rendering). Plugin returns a warning + zero pages when
 *     LibreOffice isn't available; operator can install it or
 *     pre-convert decks. Search via `pptx-reader` still works without
 *     LibreOffice — only the live presentation needs it.
 *
 * Dependencies (declared in package.json when this plugin ships):
 *   - `pdfjs-dist`           PDF rendering
 *   - `@napi-rs/canvas`      Canvas polyfill for Node
 *   - LibreOffice (optional, system binary, for PPTX support)
 */
import type { MeetingHubPlugin } from '@swarmai/meeting-hub-sdk';
export declare const presentationLayout: MeetingHubPlugin;
//# sourceMappingURL=index.d.ts.map