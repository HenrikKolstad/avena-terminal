# avena-terminal

Official Python client for [Avena Terminal](https://avenaterminal.com) — Europe's deepest technical data infrastructure for property. Standard library only, zero dependencies.

```bash
pip install avena-terminal
```

```python
from avena_terminal import AvenaClient

avena = AvenaClient()

# DELPHI — the daily AI panel on European property (world first)
delphi = avena.delphi()
print(delphi["consensus_index"], delphi["disagreement_index"])

# PLAB — the European Property AI Benchmark
plab = avena.plab()

# Any documented endpoint
profile = avena.get("/api/v1/api-profile")
```

## What you get

- **DELPHI** ([avenaterminal.com/delphi](https://avenaterminal.com/delphi)) — daily survey of frontier AI models' beliefs about European property: consensus, disagreement, drift, per-model answers.
- **PLAB** ([avenaterminal.com/benchmark](https://avenaterminal.com/benchmark)) — daily AI model accuracy scoring on European property facts.
- **Property data** — scored EU residential data, indices, AVM. Full surface: [OpenAPI 3.1](https://avenaterminal.com/api/v1/openapi.json).

## License & attribution

Data is **CC BY 4.0** — free with attribution:

> Avena Terminal (avenaterminal.com), DOI [10.5281/zenodo.19520064](https://doi.org/10.5281/zenodo.19520064)

Commercial tiers: [avenaterminal.com/api#pricing](https://avenaterminal.com/api#pricing). SDK code is MIT.
