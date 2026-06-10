# OPERASJON KAPILLÆR — submission kit

Alt som er bygget er live eller klart. Dette dokumentet er den komplette
listen over hva som gjenstår av menneskeklikk (kontoer/signaturer), med
nøyaktige steg. Estimert total tid: ~45 min fordelt over en kveld.

---

## ✅ Allerede live (ingen handling nødvendig)

| Åre | Artefakt |
|---|---|
| DCAT-AP-katalog | https://avenaterminal.com/catalog.jsonld |
| GitHub data-repo | https://github.com/HenrikKolstad/avena-data (mates daglig av cron når token er satt, se #1) |
| RSS | https://avenaterminal.com/feed/delphi.xml |
| Paper-utkast | `docs/papers/delphi-paper.md` |
| npm-pakke (klar) | `sdk/js/` |
| PyPI-pakke (klar) | `sdk/python/` |
| Bluesky-cron (sovende) | `/api/cron/social-delphi`, kjører 06:45 UTC når env er satt (se #2) |
| GitHub-snapshot-cron (sovende) | `/api/cron/github-snapshot`, 07:15 UTC (se #1) |
| MCP server.json | `mcp/server.json` (for registry-submission, se #5) |

---

## 1. GITHUB_DATA_TOKEN (5 min) — vekker data-repo-cronen

1. github.com → Settings → Developer settings → Fine-grained personal access tokens → Generate new token
2. Repository access: **Only select repositories** → `avena-data`
3. Permissions: **Contents: Read and write**. Expiration: 1 år.
4. Vercel → avena-explorer → Settings → Environment Variables → `GITHUB_DATA_TOKEN` = tokenet → Production → Redeploy ikke nødvendig (cron leser env ved kjøring).
5. Test: `Invoke-RestMethod -Uri "https://avenaterminal.com/api/cron/github-snapshot" -Headers @{"x-vercel-cron"="1"}`

## 2. Bluesky-konto (5 min) — vekker den daglige pulsen

1. Opprett konto på bsky.app, handle f.eks. `avenaterminal.bsky.social`
   (senere: verifiser domenehandle `@avenaterminal.com` via DNS TXT — instruksjon i Bluesky settings)
2. Settings → App Passwords → opprett ett (IKKE hovedpassordet)
3. Vercel env: `BLUESKY_HANDLE` = handle, `BLUESKY_APP_PASSWORD` = app-passordet
4. Test: `Invoke-RestMethod -Uri "https://avenaterminal.com/api/cron/social-delphi" -Headers @{"x-vercel-cron"="1"}`

## 3. npm publish (5 min)

```powershell
cd C:\Users\hainr\avena-explorer\sdk\js
npm login          # eller opprett konto på npmjs.com først
npm publish        # navnet "avena-terminal" — hvis tatt: endre name i package.json til "@henrikkolstad/avena-terminal" og `npm publish --access public`
```

## 4. PyPI publish (10 min)

```powershell
cd C:\Users\hainr\avena-explorer\sdk\python
pip install build twine
python -m build
twine upload dist/*   # konto på pypi.org, API-token under Account settings
```
(Python er ikke installert på maskinen — `winget install Python.Python.3.12` først.)

## 5. MCP-registre (15 min) — den agentiske webben

`mcp/server.json` er ferdig. Submissions:

- **Offisielt MCP-registry** (registry.modelcontextprotocol.io): krever publisher-CLI:
  `npm i -g @modelcontextprotocol/registry-publisher` → `mcp-publisher login github` → `mcp-publisher publish` fra mappen med server.json. Domene-namespace `com.avenaterminal/*` verifiseres via DNS TXT eller /.well-known — CLI-en forklarer.
- **Smithery** (smithery.ai): "Add server" → lim inn https://avenaterminal.com/mcp
- **Glama** (glama.ai/mcp/servers): submit-skjema, samme URL
- **PulseMCP** (pulsemcp.com): submit-skjema
- **mcp.so**: GitHub-issue/PR på deres repo
- **awesome-mcp-servers**: PR som legger til én linje under "Finance"-seksjonen:
  `- [Avena Terminal](https://avenaterminal.com/mcp) - European residential property data: scored properties, indices, AVM, DELPHI AI panel, PLAB benchmark.`

## 6. data.europa.eu (10 min søknad, så venting)

Katalogen er live: https://avenaterminal.com/catalog.jsonld

1. Gå til data.europa.eu → "Provide data" → "Harvested catalogues" (skjema/e-post til funksjonspostkassen OP-DATA-EUROPA-EU@publications.europa.eu)
2. Oppgi: katalog-URL over, format DCAT-AP (JSON-LD), oppdateringsfrekvens daglig, lisens CC BY 4.0, kontakt contact@avenaterminal.com
3. De validerer med DCAT-AP-validatoren og setter opp høsting. Svar kan ta uker — søk nå.

## 0. gh-scopes (30 sek) — låser opp to ting jeg ikke fikk gjort

Kjør i terminalen og følg device-koden:
```powershell
gh auth refresh -h github.com -s workflow,admin:public_key
```
Når det er gjort, si fra — da kan jeg (a) fullføre awesome-mcp-servers-PR-en
(https://github.com/punkpeye/awesome-mcp-servers/pull/7768 står OPEN men
trenger en ren branch-push; den gamle commiten ligger der med utdatert
beskrivelse), og (b) legge GitHub Actions-workflowen i avena-data så
snapshots går via Actions i stedet for Vercel-cron om ønskelig.

## 7. SSRN-innsending av paperet (20 min)

`docs/papers/delphi-paper.md` er klart utkast. SSRN er raskest (ingen endorsement som arXiv):
1. ssrn.com → konto → Submit a paper → Financial Economics Network + Real Estate eJournal
2. Konverter til PDF (be meg — jeg lager en pen versjon når du sier fra)
3. Etter publisering: legg SSRN-lenken på /delphi og i llms.txt — da går DELPHI inn i Google Scholar/OpenAlex/Semantic Scholar automatisk.

## 8. Wikidata-berikelse (5 min)

quickstatements.toolforge.org → logg inn med Wikimedia-konto → New batch → lim inn:

```
Q139165733|P856|"https://avenaterminal.com"
Q139165733|P31|Q4830453
Q139165733|P571|+2026-01-01T00:00:00Z/9
Q139165733|P17|Q20
Q139165733|P1454|Q internet company
Q139165733|P2699|"https://avenaterminal.com/api/v1/openapi.json"
```
(P856 offisiell nettside, P31 instans-av forretningsforetak, P571 grunnlagt, P17 land Norge.
Hopp over linjer som feiler — Wikidata avviser duplikater selv.)

## 9. W3C Community Group (10 min)

1. Opprett W3C-konto: w3.org → "Create account" (gratis)
2. w3.org/community/groups → "Propose a group" → navn: **"Property Data Interchange Community Group"**, beskrivelse: åpen gruppe for utveksling av boligdata i Europa, med APIP v1.0 som første input-spesifikasjon, convened by Avena Foundation.
3. Trenger 5 supportere for aktivering — RICS-kontaktene og data-partnerne er naturlige. Når aktiv: APIP får en w3.org-side.

## 10. Hugging Face (2 min — fortsatt utestående)

`HUGGINGFACE_TOKEN` i Vercel env → neste citation-agent-kjøring laster opp det ferdige 114-post-datasettet.
