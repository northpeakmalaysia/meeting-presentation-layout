/**
 * Type shim for `@swarmai/meeting-hub-sdk`.
 *
 * The Meeting Hub's plugin SDK ships its types here so this plugin can
 * typecheck without a published `@swarmai/meeting-hub-sdk` npm package.
 * When the SDK ships to npm, drop this shim and add the package to
 * peerDependencies. The types mirror `src/plugins/sdk.ts` in the
 * `swarmai-meeting-hub` repo (the canonical SDK).
 */

declare module '@swarmai/meeting-hub-sdk' {
  export type PluginEvent =
    | 'artefact-shared'
    | 'audio-stream'
    | 'turn-appended'
    | 'meeting-adjourned'
    | 'invoke'
    | 'presentation-open'
    | 'presentation-navigate'
    | 'presentation-close';

  export type PluginPermission = 'network' | 'fs-read' | 'fs-write';

  export interface PluginManifest {
    id: string;
    version: string;
    description: string;
    author?: string;
    handles: PluginEvent[];
    mimeTypes?: string[];
    fileExtensions?: string[];
    configSchema?: Record<string, unknown>;
    trusted?: boolean;
    permissions?: PluginPermission[];
  }

  export interface PluginLogger {
    debug(msg: string, fields?: Record<string, unknown>): void;
    info(msg: string, fields?: Record<string, unknown>): void;
    warn(msg: string, fields?: Record<string, unknown>): void;
    error(msg: string, fields?: Record<string, unknown>): void;
  }

  export interface PluginContext {
    pluginId: string;
    config: Record<string, unknown>;
    logger: PluginLogger;
    tempDir: string;
    fetchArtefactBytes(artefactId: string): Promise<Buffer>;
    fetch?(url: string, init?: RequestInit): Promise<Response>;
  }

  export interface ArtefactInput {
    meetingId: string;
    artefactId: string;
    label?: string;
    mime: string;
    sizeBytes: number;
    sharedBy: string;
    fetchBytes(): Promise<Buffer>;
    logger: PluginLogger;
    config: Record<string, unknown>;
    tempDir: string;
  }

  export interface AudioStreamInput {
    meetingId: string;
    sourcePeerId: string;
    audio: AsyncIterable<Buffer>;
    sampleRate: number;
    channels: number;
    logger: PluginLogger;
    config: Record<string, unknown>;
  }

  export interface TextChunk {
    text: string;
    startMs: number;
    endMs: number;
    confidence?: number;
    isFinal: boolean;
  }

  export interface TurnInput {
    meetingId: string;
    turnId: string;
    fromPeer: string;
    body: string;
    kind: 'human' | 'brief' | 'ask' | 'reply' | 'system';
    logger: PluginLogger;
    config: Record<string, unknown>;
  }

  export interface MeetingAdjournedInput {
    meetingId: string;
    title: string;
    transcript: ReadonlyArray<{
      turnId: string;
      fromPeer: string;
      body: string;
      kind: string;
      at: number;
    }>;
    attendees: ReadonlyArray<{
      peerId: string;
      displayName?: string;
      kind: 'peer' | 'human-external';
    }>;
    artefactIds: readonly string[];
    logger: PluginLogger;
    config: Record<string, unknown>;
  }

  export interface InvokeInput {
    meetingId: string;
    artefactId?: string;
    payload?: unknown;
    logger: PluginLogger;
    config: Record<string, unknown>;
  }

  export interface NewArtefactSpec {
    label: string;
    mime: string;
    bytes: Buffer;
  }

  export interface AppendTurnSpec {
    fromPeer: string;
    body: string;
    kind: 'system' | 'human' | 'brief';
  }

  export interface PluginResult {
    extractedText?: string;
    extractedJson?: unknown;
    pageCount?: number;
    pageBreaks?: number[];
    newArtefacts?: NewArtefactSpec[];
    turnsToAppend?: AppendTurnSpec[];
    summary?: string;
    warnings?: string[];
  }

  export interface PresentationOpenInput {
    meetingId: string;
    artefactId: string;
    controllerPeerId: string;
    fetchBytes(): Promise<Buffer>;
    mime: string;
    label?: string;
    logger: PluginLogger;
    config: Record<string, unknown>;
    pageOutputDir: string;
  }

  export interface PresentationOpenResult {
    totalPages: number;
    currentPage: number;
    pageUrls: string[];
    title?: string;
    warnings?: string[];
  }

  export interface PresentationNavigateInput {
    meetingId: string;
    artefactId: string;
    fromPage: number;
    toPage: number;
    byPeerId: string;
    logger: PluginLogger;
    config: Record<string, unknown>;
  }

  export interface PresentationCloseInput {
    meetingId: string;
    artefactId: string;
    byPeerId: string;
    logger: PluginLogger;
    config: Record<string, unknown>;
  }

  export interface MeetingHubPlugin {
    manifest: PluginManifest;
    init(ctx: PluginContext): Promise<void> | void;
    onArtefactShared?(input: ArtefactInput): Promise<PluginResult>;
    onAudioStream?(
      input: AudioStreamInput,
    ): AsyncIterable<TextChunk> | Promise<AsyncIterable<TextChunk>>;
    onTurnAppended?(input: TurnInput): Promise<PluginResult | void>;
    onMeetingAdjourned?(input: MeetingAdjournedInput): Promise<PluginResult | void>;
    invoke?(input: InvokeInput): Promise<PluginResult>;
    onPresentationOpen?(input: PresentationOpenInput): Promise<PresentationOpenResult>;
    onPresentationNavigate?(input: PresentationNavigateInput): Promise<void>;
    onPresentationClose?(input: PresentationCloseInput): Promise<void>;
    migrate?(fromVersion: string, toVersion: string): Promise<void> | void;
    shutdown?(): Promise<void> | void;
  }
}


declare type CanvasRenderingContext2D = unknown;
