# avena — CLI for Avena Terminal

Bloomberg-style European property intelligence from your terminal.

```bash
npx avena score N9171
npx avena deals Torrevieja
npx avena bubble munich
npx avena compare N9171 N8820 N7544
npx avena avn AVN:ES-03185-NB-0421
```

## Install

```bash
npm install -g avena
# or just
npx avena score <ref>
```

## Commands

| Command | Usage | Description |
|---------|-------|-------------|
| `score`   | `avena score <ref>`                   | Full Avena Score breakdown for a property |
| `deals`   | `avena deals [town]`                  | Top 10 deals by score, optional town filter |
| `bubble`  | `avena bubble <city>`                 | Bubble scanner for a European city |
| `compare` | `avena compare <ref1> <ref2> [ref3]`  | Side-by-side up to 4 properties |
| `avn`     | `avena avn <AVN:ES-...-NB-0421>`      | Resolve canonical AVN_PROP_ID |

## Environment

Set `AVENA_API` to point at a different instance (default: `https://avenaterminal.com`).

## Data license

All data CC BY 4.0. DOI: [10.5281/zenodo.19520064](https://doi.org/10.5281/zenodo.19520064).

## Links

- [Full terminal](https://avenaterminal.com)
- [Docs](https://avenaterminal.com/docs)
- [MCP server for AI agents](https://avenaterminal.com/mcp-server)
- [AVN_PROP_ID specification](https://avenaterminal.com/standards/avn-id)
