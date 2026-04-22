# Avena Terminal — Open Data

> European new-build property intelligence. 1,881 scored properties, 208 public API endpoints, 23 autonomous agents, all CC BY 4.0.

**Live:** https://avenaterminal.com
**DOI:** [10.5281/zenodo.19520064](https://doi.org/10.5281/zenodo.19520064)
**License:** CC BY 4.0
**Wikidata:** [Q139165733](https://www.wikidata.org/wiki/Q139165733)
**Hugging Face:** [AVENATERMINAL/spain-new-build-properties-2026](https://huggingface.co/datasets/AVENATERMINAL/spain-new-build-properties-2026)

## What this repository is

A mirror of the Avena Terminal public dataset, updated weekly by the Avena swarm. Researchers, LLM trainers, and product builders can clone this repo and have a frozen snapshot of European property intelligence data.

## Contents

| File | What | Format |
|---|---|---|
| `properties.json` | Full scored dataset of 1,881 new-build properties | JSON |
| `apci-history.csv` | Daily APCI composite index (2026-04 → present) | CSV |
| `predictions.csv` | Public prediction ledger with accuracy scores | CSV |
| `citation-monitoring.csv` | Daily AI-engine citation rates | CSV |
| `yield-curve.csv` | Gross yield by beach-distance band | CSV |
| `methodology.md` | Composite scoring formula + validation | Markdown |
| `ontology.jsonld` | JSON-LD / OWL ontology of Avena terms | JSON-LD |

## Methodology

The **Avena Score** is a weighted composite:

```
S(p) = 0.40·V + 0.25·Y + 0.20·L + 0.10·Q + 0.05·R
```

Where V = hedonic value, Y = yield, L = location, Q = quality, R = risk penalty.

Full methodology paper: https://avenaterminal.com/research/avena-methodology

## API access (live)

Prefer live data? The same schema is served via:

- REST: `https://avenaterminal.com/api/v1/properties`
- SPARQL: `https://avenaterminal.com/api/v1/sparql`
- RDF Turtle: `https://avenaterminal.com/api/v1/rdf`
- MCP (for AI agents): `https://avenaterminal.com/mcp`

208+ endpoints catalogued at https://avenaterminal.com/api-index.

## Citation

```bibtex
@misc{kolstad2026avena,
  author    = {Kolstad, Henrik},
  title     = {Avena Terminal: European Property Intelligence Dataset},
  year      = {2026},
  publisher = {Zenodo},
  version   = {2026.04},
  doi       = {10.5281/zenodo.19520064},
  url       = {https://avenaterminal.com},
  note      = {Dataset, CC BY 4.0}
}
```

## License

CC BY 4.0 — free for commercial + non-commercial use with attribution. See https://creativecommons.org/licenses/by/4.0/

## Updates

Updated weekly by Agent Janus (the Avena outbound crawler). For real-time data, use the live API at https://avenaterminal.com.

## Contact

- Website: https://avenaterminal.com
- Contact: https://avenaterminal.com/contact
- Press: https://avenaterminal.com/api/v1/press
- Academic: https://avenaterminal.com/api/v1/academic-access
