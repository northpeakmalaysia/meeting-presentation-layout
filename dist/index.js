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
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
export const presentationLayout = {
    manifest: {
        id: 'presentation-layout',
        version: '1.0.0',
        description: 'Live navigable presentation of PDF/PPTX artefacts. Controller-driven page sync.',
        author: 'SwarmAI Meeting Hub built-in',
        handles: ['presentation-open', 'presentation-navigate', 'presentation-close'],
        mimeTypes: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ],
        fileExtensions: ['.pdf', '.pptx'],
        trusted: true,
        configSchema: {
            type: 'object',
            properties: {
                renderWidth: { type: 'number', default: 1280 },
                scale: { type: 'number', default: 1.5 },
                renderThumbnails: { type: 'boolean', default: false },
                libreOfficeBin: { type: 'string' },
                maxPages: { type: 'number', default: 200 },
            },
        },
    },
    init(ctx) {
        ctx.logger.info('presentation-layout loaded; renderers initialise lazily on first open', {
            renderWidth: ctx.config.renderWidth,
        });
    },
    async onPresentationOpen(input) {
        const cfg = input.config;
        const maxPages = cfg.maxPages ?? 200;
        const scale = cfg.scale ?? 1.5;
        await fs.mkdir(input.pageOutputDir, { recursive: true });
        const bytes = await input.fetchBytes();
        // Step 1 — get a PDF byte array. Direct for PDFs; for PPTX, run
        // LibreOffice headless to convert. If LO isn't available, surface
        // a clear warning and return zero pages (Hub UI shows a message).
        let pdfBytes;
        if (input.mime === 'application/pdf' || input.label?.toLowerCase().endsWith('.pdf')) {
            pdfBytes = bytes;
        }
        else {
            try {
                pdfBytes = await convertPptxToPdf(bytes, input.pageOutputDir, cfg, input.logger);
            }
            catch (err) {
                return {
                    totalPages: 0,
                    currentPage: 0,
                    pageUrls: [],
                    warnings: [
                        `PPTX → PDF conversion failed: ${err instanceof Error ? err.message : String(err)}. ` +
                            `Install LibreOffice or pre-convert the deck to PDF.`,
                    ],
                };
            }
        }
        // Step 2 — render each page to PNG.
        let pdfjs;
        try {
            pdfjs = await import('pdfjs-dist');
        }
        catch (err) {
            input.logger.error('pdfjs-dist import failed; install dependency', {
                error: err instanceof Error ? err.message : String(err),
            });
            return { totalPages: 0, currentPage: 0, pageUrls: [], warnings: ['pdfjs-dist not installed'] };
        }
        let canvasMod;
        try {
            canvasMod = await import('@napi-rs/canvas');
        }
        catch (err) {
            input.logger.error('@napi-rs/canvas import failed; install dependency', {
                error: err instanceof Error ? err.message : String(err),
            });
            return { totalPages: 0, currentPage: 0, pageUrls: [], warnings: ['@napi-rs/canvas not installed'] };
        }
        const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
        const totalPages = Math.min(doc.numPages, maxPages);
        const pageUrls = [];
        for (let i = 1; i <= totalPages; i++) {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale });
            const canvas = canvasMod.createCanvas(viewport.width, viewport.height);
            const renderContext = {
                canvasContext: canvas.getContext('2d'),
                viewport,
            };
            await page.render(renderContext).promise;
            const png = await canvas.encode('png');
            const file = path.join(input.pageOutputDir, `page-${i}.png`);
            await fs.writeFile(file, png);
            pageUrls.push(`/m/${input.meetingId}/presentations/${input.artefactId}/page/${i}.png`);
        }
        const warnings = [];
        if (doc.numPages > totalPages) {
            warnings.push(`Truncated at ${maxPages} pages (deck has ${doc.numPages}).`);
        }
        return {
            totalPages,
            currentPage: 1,
            pageUrls,
            ...(input.label ? { title: input.label } : {}),
            ...(warnings.length > 0 ? { warnings } : {}),
        };
    },
    async onPresentationNavigate(input) {
        // The Hub already mutated the `presentations` table and broadcast
        // the new state to participants. The plugin's contribution is
        // observability — log the transition so ops can trace deck flow.
        input.logger.debug('presentation navigate', {
            meetingId: input.meetingId,
            artefactId: input.artefactId,
            fromPage: input.fromPage,
            toPage: input.toPage,
            byPeerId: input.byPeerId,
        });
    },
    async onPresentationClose(input) {
        // Cleanup: remove rendered page images for this presentation.
        // Hub's retention janitor would also catch this but eager cleanup
        // keeps the disk footprint tighter for short presentations.
        const dir = path.join('files', 'presentations', input.artefactId);
        try {
            await fs.rm(dir, { recursive: true, force: true });
        }
        catch (err) {
            input.logger.warn('presentation cleanup failed (non-fatal)', {
                artefactId: input.artefactId,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    },
};
/**
 * Run LibreOffice headless to convert PPTX bytes to PDF bytes.
 * Returns the PDF as a Buffer. Throws when LO is not on PATH.
 */
async function convertPptxToPdf(pptxBytes, workDir, cfg, logger) {
    const inputPath = path.join(workDir, 'input.pptx');
    const outputPath = path.join(workDir, 'input.pdf');
    await fs.writeFile(inputPath, pptxBytes);
    const bin = cfg.libreOfficeBin ?? defaultLibreOfficeBin();
    await new Promise((resolve, reject) => {
        const proc = spawn(bin, [
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', workDir,
            inputPath,
        ]);
        let stderr = '';
        proc.stderr.on('data', (d) => { stderr += String(d); });
        proc.on('error', (err) => reject(err));
        proc.on('close', (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`LibreOffice exited ${code}: ${stderr.trim()}`));
        });
    });
    logger.debug('pptx→pdf complete', { outputPath });
    const exists = await fs.stat(outputPath).then(() => true, () => false);
    if (!exists)
        throw new Error('LibreOffice ran but produced no PDF');
    return fs.readFile(outputPath);
}
function defaultLibreOfficeBin() {
    if (process.platform === 'win32')
        return 'soffice.exe';
    if (process.platform === 'darwin')
        return '/Applications/LibreOffice.app/Contents/MacOS/soffice';
    return 'libreoffice';
}
//# sourceMappingURL=index.js.map