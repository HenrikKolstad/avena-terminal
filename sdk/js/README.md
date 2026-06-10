# avena-terminal

Official JavaScript client for [Avena Terminal](https://avenaterminal.com) — Europe's deepest technical data infrastructure for property.

Zero dependencies. Node 18+, Deno, Bun, browsers.

```bash
npm install avena-terminal
```

```js
import { AvenaClient } from 'avena-terminal';

const avena = new AvenaClient();

// DELPHI — the daily AI panel on European property (world first)
const delphi = await avena.delphi();
console.log(delphi.consensus_index, delphi.disagreement_index);

// PLAB — the European Property AI Benchmark
const plab = await avena.plab();

// Any documented endpoint
const profile = await avena.get('/api/v1/api-profile');
```

## What you get

- **DELPHI** (`/delphi`) — daily survey of frontier AI models' quantitative beliefs about European property: consensus, disagreement, drift, per-model answers. [RSS feed](https://avenaterminal.com/feed/delphi.xml) too.
- **PLAB** (`/benchmark`) — daily accuracy scoring of major AI models on European property and finance facts.
- **Property data** — scored EU residential data, indices, AVM, regulatory signals. Full surface: [OpenAPI 3.1](https://avenaterminal.com/api/v1/openapi.json).

## License & attribution

Data is **CC BY 4.0** — free with attribution:

> Avena Terminal (avenaterminal.com), DOI [10.5281/zenodo.19520064](https://doi.org/10.5281/zenodo.19520064)

Commercial tiers (higher limits, SLA): [avenaterminal.com/api#pricing](https://avenaterminal.com/api#pricing). AI agents: MCP server at [avenaterminal.com/api#mcp](https://avenaterminal.com/api#mcp).

SDK code is MIT.
