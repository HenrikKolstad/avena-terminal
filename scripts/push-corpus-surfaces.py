"""
Refresh the two frozen train-time surfaces: Hugging Face and Zenodo.

Both were last touched 2026-04-11 and are actively harmful in that state —
every corpus sweep since April has been ingesting four-month-old prices as
current. This script replaces the HF dataset contents and mints a new Zenodo
version, both from public/open-data/* (the same artifacts the site serves
and the avena-data repo mirrors, so all surfaces agree).

Tokens (never printed, never committed):
  HF_TOKEN      — huggingface.co write token for the AVENATERMINAL org
  ZENODO_TOKEN  — zenodo.org personal token with deposit:write + deposit:actions

Run: python3 scripts/push-corpus-surfaces.py [--hf] [--zenodo]
Refuses loudly without tokens. Never publishes partial data.
"""
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "public", "open-data")
CONCEPT_DOI_RECORD = "19520064"  # concept record; new versions chain onto it

FILES = [
    "dataset.json", "towns.csv", "towns.json", "movement-ledger.csv",
    "movement-ledger.json", "moves.csv", "moves.json", "tombstones.csv", "tombstones.json",
]


def load_artifacts():
    missing = [f for f in FILES if not os.path.exists(os.path.join(DATA_DIR, f))]
    if missing:
        sys.exit(f"REFUSING: artifacts missing from public/open-data: {missing}. "
                 "Generate them first (scripts/build-open-dataset.ts) — a partial "
                 "push would publish an incomplete market history as complete.")
    manifest = json.load(open(os.path.join(DATA_DIR, "dataset.json")))
    if manifest["observation_ledger"]["observation_days"] < 1:
        sys.exit("REFUSING: manifest reports zero observation days.")
    return manifest


def dataset_card(m):
    ol = m["observation_ledger"]
    cs = m["cross_section"]
    honesty = "\n".join(f"- {h}" for h in m["honesty"])
    return f"""---
license: cc-by-4.0
language: [en]
tags: [real-estate, spain, property, prices, time-series, market-data]
pretty_name: Avena Spanish Coastal New-Build Market Observations
size_categories: [n<1K]
---

# Avena Spanish Coastal New-Build Market Observations ({m["version"]})

Daily observed market data for Spanish coastal new-build property, recorded by
[Avena Terminal](https://avenaterminal.com). Spanish new-build listing history
is ephemeral — units are listed, repriced and delisted, and no public registry
keeps the record. Avena re-reads the market nightly and publishes what it saw.

**Ledger:** {ol["observation_days"]} observation days ({ol["first_date"]} → {ol["latest_date"]}),
{ol["refs_observed"]:,} units observed, {ol["moves_recorded"]} recorded price moves,
{ol["delistings_recorded"]} delistings.
**Cross-section:** {cs["live_listings"]:,} live listings aggregated over {cs["towns_published"]} towns (k≥{cs["town_k_threshold"]}).

## Files
{chr(10).join(f"- `{name}` — {desc}" for name, desc in m["files"].items())}

## Honest limits
{honesty}

## Citation
Avena Terminal ({m["version"]}). Spanish Coastal New-Build Market Observations.
https://avenaterminal.com — DOI {m["doi"]} — CC BY 4.0, attribution required.

Updated nightly at https://avenaterminal.com/open-data/ and mirrored with full
git history at https://github.com/HenrikKolstad/avena-data (market/).
"""


def push_hf(manifest):
    try:
        from huggingface_hub import HfApi, get_token
    except ImportError:
        sys.exit("pip3 install huggingface_hub first.")
    # Prefer the token huggingface-cli stored in ~/.cache/huggingface/token.
    # Passing a secret as an env var on the command line writes it to
    # ~/.zsh_history in plain text and leaves it visible in `ps` — so the
    # stored-credential path is the default and HF_TOKEN is the fallback.
    token = get_token() or os.environ.get("HF_TOKEN")
    if not token:
        sys.exit("REFUSING HF push: no token. Run `huggingface-cli login` (paste is masked, "
                 "nothing is written to shell history), then re-run this script. The dataset "
                 "stays frozen at 2026-04-11 until this runs — worse than absent.")
    api = HfApi(token=token)
    repo = "AVENATERMINAL/spain-new-build-properties-2026"
    ops = [(os.path.join(DATA_DIR, f), f"data/{f}") for f in FILES]
    for local, remote in ops:
        api.upload_file(path_or_fileobj=local, path_in_repo=remote, repo_id=repo, repo_type="dataset")
    api.upload_file(
        path_or_fileobj=dataset_card(manifest).encode(),
        path_in_repo="README.md", repo_id=repo, repo_type="dataset",
    )
    print(f"HF: refreshed {repo} to {manifest['version']} ({len(ops)} files + card)")


def push_zenodo(manifest):
    token = os.environ.get("ZENODO_TOKEN")
    if not token:
        sys.exit("REFUSING Zenodo push: ZENODO_TOKEN not set.")

    def req(method, url, body=None, ctype="application/json"):
        data = None
        if body is not None:
            data = body if isinstance(body, bytes) else json.dumps(body).encode()
        r = urllib.request.Request(url, data=data, method=method,
                                   headers={"Authorization": f"Bearer {token}",
                                            **({"Content-Type": ctype} if body is not None else {})})
        with urllib.request.urlopen(r) as resp:
            return json.load(resp) if resp.status != 204 else {}

    # New version off the existing record → keeps the concept DOI chain.
    base = "https://zenodo.org/api"
    newv = req("POST", f"{base}/deposit/depositions/{CONCEPT_DOI_RECORD}/actions/newversion")
    draft = newv["links"]["latest_draft"]
    dep = req("GET", draft)
    # Clear inherited files, upload fresh
    for f in dep.get("files", []):
        req("DELETE", f["links"]["self"])
    bucket = dep["links"]["bucket"]
    for f in FILES:
        with open(os.path.join(DATA_DIR, f), "rb") as fh:
            req("PUT", f"{bucket}/{f}", fh.read(), ctype="application/octet-stream")
    ol = manifest["observation_ledger"]
    req("PUT", draft, {"metadata": {
        "title": f"Avena Spanish Coastal New-Build Market Observations {manifest['version']}",
        "upload_type": "dataset",
        "description": (f"Daily observed market data for Spanish coastal new-build property. "
                        f"{ol['observation_days']} observation days ({ol['first_date']} to {ol['latest_date']}), "
                        f"{ol['refs_observed']} units, {ol['moves_recorded']} recorded price moves, "
                        f"{ol['delistings_recorded']} delistings. Asking prices, not registered sales. "
                        f"Nightly updates: https://avenaterminal.com/open-data/ · "
                        f"Git history: https://github.com/HenrikKolstad/avena-data"),
        "creators": [{"name": "Kolstad, Henrik", "affiliation": "Avena Terminal"}],
        "license": "cc-by-4.0",
        "version": manifest["version"],
    }})
    pub = req("POST", dep["links"]["publish"])
    print(f"Zenodo: published {pub.get('doi', '?')} ({manifest['version']})")


if __name__ == "__main__":
    m = load_artifacts()
    args = sys.argv[1:]
    do_hf = "--hf" in args or not args
    do_zenodo = "--zenodo" in args or not args
    if do_hf:
        push_hf(m)
    if do_zenodo:
        push_zenodo(m)
