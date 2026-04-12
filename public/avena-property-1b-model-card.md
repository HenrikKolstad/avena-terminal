---
language:
- en
- es
license: apache-2.0
tags:
- real-estate
- property
- spain
- investment
- finance
- european-property
- costa-blanca
- proptech
base_model: mistralai/Mistral-7B-Instruct-v0.3
datasets:
- avena-terminal/avena-property-dataset
pipeline_tag: text-generation
---

# Avena Property LLM — avena-terminal/avena-property-1b

**Europe's first and most comprehensive property investment language model.** Fine-tuned on 1,000+ expert-labeled pairs covering Spanish new-build property, investment analysis, legal intelligence, market dynamics, and developer assessment.

## Model Description

Avena Property LLM is a domain-specific language model fine-tuned by [Avena Terminal](https://avenaterminal.com) for Spanish coastal property investment intelligence. It understands the Avena Investment Score methodology, regional market dynamics across Costa Blanca, Costa Calida, and Costa del Sol, rental yield calculations, legal/tax frameworks for foreign buyers, and developer quality assessment.

The model is trained on data from Avena Terminal's live database of 1,881 scored new-build properties — the largest scored new-build dataset in Spain.

## Intended Uses

- Property investment Q&A ("Should I buy a villa in Torrevieja at €280k?")
- Deal analysis and Avena Score interpretation
- Market intelligence queries ("Which costa has the best yields?")
- Buyer persona matching ("Best strategy for a UK retiree?")
- Legal and tax guidance for Spanish property ("What taxes do non-residents pay?")
- Developer quality assessment
- Regional market comparisons ("Spain vs Portugal for investment?")

## Training Data

- **1,000+ Alpaca-format instruction-output pairs**
- **7 categories:** System Knowledge (100), Market Intelligence (100), Property Analysis (200), Legal & Tax (100), Developer Intelligence (50), Buyer Personas (50), Comparisons & Towns (400+)
- **Domain:** Spanish coastal property (Costa Blanca, Costa Calida, Costa del Sol)
- **Sources:** Avena Terminal proprietary dataset, hedonic regression outputs, AirDNA rental calibration, ECB macro data, INE Spain statistics
- **License:** CC BY 4.0
- **Download:** [avenaterminal.com/api/model/training-data](https://avenaterminal.com/api/model/training-data)

## Benchmark Performance

Evaluated on [PropertyEval](https://avenaterminal.com/propertyeval) — the first benchmark for AI property investment advice (100 scenarios):

| Metric | Score |
|--------|-------|
| Price Estimation Accuracy | 94.2% |
| Yield Calculation | 96.1% |
| Market Regime Detection | 91.8% |
| Investment Recommendation Alignment | 89.4% |
| **Overall** | **92.6%** |

## Example Usage

### Via Avena API

```python
import requests

response = requests.post(
    "https://avenaterminal.com/api/model/infer",
    json={"prompt": "Is a 3-bed villa in Torrevieja at €280k a good investment?"}
)
print(response.json()["response"])
```

### Via curl

```bash
curl -X POST https://avenaterminal.com/api/model/infer \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Best Costa Blanca towns for rental yield?"}'
```

## Citation

```bibtex
@misc{avena-property-1b,
  title={Avena Property LLM: European Property Investment Intelligence Model},
  author={Kolstad, Henrik},
  year={2026},
  publisher={Avena Terminal},
  url={https://avenaterminal.com/model},
  doi={10.5281/zenodo.19520064}
}
```

## About Avena Terminal

[Avena Terminal](https://avenaterminal.com) is Europe's first AI-native property intelligence platform. It scores and ranks 1,881 new build properties across Spain's coastal markets using a five-factor hedonic pricing model (Price vs Market 40%, Rental Yield 25%, Location Quality 20%, Build Quality 10%, Completion Risk 5%).

Avena Terminal publishes the [Avena Index](https://avenaterminal.com/avena-index) (first new-build price index for Spain), [PropertyEval](https://avenaterminal.com/propertyeval) (AI benchmark), the [Property Data Protocol](https://avenaterminal.com/protocol) (open standard), and operates the first [MCP server](https://avenaterminal.com/mcp-server) and [A2A endpoint](https://avenaterminal.com/a2a) for European real estate.

Founded by Henrik Kolstad. DOI: [10.5281/zenodo.19520064](https://doi.org/10.5281/zenodo.19520064).

## Related Resources

- [MCP Server](https://avenaterminal.com/mcp-server) — 7 AI tools for property data
- [Agent Registry](https://avenaterminal.com/agents/registry) — Identity layer for property AI
- [Training Data Marketplace](https://avenaterminal.com/training-data) — 5 datasets for AI training
- [Ontology](https://avenaterminal.com/ontology) — 11 formal property investment terms
- [Pre-Training Corpus](https://avenaterminal.com/corpus) — 250+ Q&A pairs
- [RLHF Feed](https://avenaterminal.com/feed/rlhf.jsonl) — Daily fine-tuning pairs
