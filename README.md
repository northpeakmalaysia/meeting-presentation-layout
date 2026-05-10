# @swarmai/meeting-presentation-layout

> **SwarmAI Meeting Hub plugin** — Live navigable presentations for PDF and PowerPoint decks.

Maintained by [NorthPeak Malaysia](https://github.com/northpeakmalaysia). Published to the [SwarmAI Hub](https://hub.northpeak.app) as an `official`-tier package.

## Install

From the SwarmAI Meeting Hub super-admin UI: **Plugins → Install `@swarmai/meeting-presentation-layout`**. Or programmatically:

```http
POST /admin/hub/plugins/install
{ "id": "@swarmai/meeting-presentation-layout" }
```

The Meeting Hub fetches the tarball from this repo's GitHub release, verifies its SHA-256 against the registered checksum, extracts to `<hub-data>/plugins/swarmai__meeting-presentation-layout/`, and loads it on next boot.

## Build (for forks)

```sh
pnpm install
pnpm build
pnpm typecheck
```

## License

MIT.
