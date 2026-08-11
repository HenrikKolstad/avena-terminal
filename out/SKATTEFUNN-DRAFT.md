# Skattefunn-søknad — utkast for Avena Terminal
*Skrevet 2026-08-11. Alt faktisk innhold er hentet fra det som faktisk er bygget — ingenting er pyntet på. Henrik: les gjennom, juster selskapsdetaljene (org.nr., søkerselskap), og send via skattefunn.no. Søknadsfrist for garantert behandling samme år: 1. september.*

---

## Nøkkelfakta å ha klart før innsending

- **Søkerselskap:** [TBS / eget AS — avklar hvilket selskap som eier Avena-IP-en. Skattefunn krever norsk skattepliktig selskap.]
- **Ordning:** Skattefunn gir 19 % fradrag på FoU-kostnader, opptil 25 MNOK i kostnadsgrunnlag per år. Egenutført FoU verdsettes med timesats inntil 700 kr/t, maks 1 850 timer/år per ansatt.
- **Realistisk ramme for Avena år 1:** én utvikler (deg) på fulltid ≈ 1 850 t × 700 kr = ~1,3 MNOK grunnlag → **~245 000 kr i fradrag/utbetaling.** Ikke livsendrende, men gratis, og det stiller prosjektet i kø for Innovasjon Norges tilskudd senere.

---

## 1. Prosjekttittel

**Maskinlesbar eiendomsdata-infrastruktur for AI-systemer: metoder for observasjonsbasert prishistorikk og målbar AI-sitering**

## 2. Hva er FoU-utfordringen? (kjernen i søknaden)

Skattefunn krever at prosjektet søker **ny kunnskap eller nye ferdigheter** og innebærer **faglig usikkerhet**. Avenas reelle FoU-innhold, ærlig formulert:

**Problem 1 — Prishistorikk finnes ikke og må konstrueres observasjonelt.**
Eiendomsmarkedets datakilder (portaler, feeds) publiserer kun nå-tilstand og overskriver historikk daglig. Offentlige registre er kvartalsvise og måneder forsinket. Det finnes ingen etablert metode for å bygge en verifiserbar, immutabel tidsserie over *annonserte* priser i sanntid. Prosjektet utvikler metodikk for: nattlig observasjon med proveniens-garantier, deteksjon av reelle prisendringer versus enhetsutskifting i prosjektannonser (m²-normalisering), absorpsjon målt via avpubliseringer, og sertifiserings-epoker som skiller verifisert fra uverifisert historikk. Usikkerheten er reell: prosjektet har selv dokumentert feilmoduser (frosne registre, fantom-avpubliseringer, union-snapshots) som krevde metodeutvikling å oppdage og korrigere.

**Problem 2 — AI-sitering kan ikke måles med eksisterende verktøy.**
Når språkmodeller (ChatGPT, Perplexity) besvarer spørsmål, finnes ingen etablert metodikk for å måle om og når en gitt kilde siteres, eller hvilke egenskaper ved data som driver sitering. Prosjektet utvikler: en versjonert spørsmålsbenchmark kjørt systematisk mot AI-systemer (74 spørsmål, 3×/uke, organisk/merkevare separert), instrumentering av AI-crawleres faktiske atferd via egen forespørselsledger, og eksperimentell metodikk med forhåndsdefinerte avlesningsdatoer for å isolere effekten av datastrukturering på siteringsrate. Dette er uutforsket terreng — det finnes ingen lærebok.

**Problem 3 — Crawl-budsjett-allokering for AI-crawlere.**
AI-crawlere har endelige budsjett og når målbart ikke over hele datasett (målt: OpenAIs crawler nådde 982 av 1 999 objekter per pass). Prosjektet utvikler differensielle leveringsmekanismer — per-crawler tilstandsbevisste sitemaps basert på egen fetch-ledger — en teknikk uten kjente presedenser.

## 3. Hvorfor er dette FoU og ikke ordinær utvikling?

- Utfallet var **genuint usikkert**: fire måneders infrastruktur ble bygget uten mulighet til å verifisere at AI-systemer ville konsumere den (verifisert først august 2026 via egenutviklet instrumentering).
- Metodene finnes ikke å kjøpe eller kopiere: siterings-benchmarking, observasjonell prisledger med proveniens, og crawler-tilstandsbevisst servering er utviklet fra grunnen.
- Prosjektet fører systematisk eksperimentprotokoll (hypotese → endring → metrikk → forhåndssatt avlesningsdato → ærlig resultat), dokumentert løpende.

## 4. Prosjektperiode og aktiviteter

**Periode:** 2026-01 → 2028-12 (Skattefunn kan innvilges for inntil 3 år)

| Aktivitet | Periode | Innhold |
|---|---|---|
| A1: Observasjonsledger-metodikk | 2026 | Nattlig kapring, proveniens-verifisering, enhetsmiks-deteksjon, sertifiseringsepoker |
| A2: AI-siterings-måling | 2026–2027 | Versjonert benchmark, crawler-instrumentering, eksperimentprotokoll |
| A3: Differensiell datalevering | 2026–2027 | Per-crawler frontiers, crawl-budsjett-optimalisering |
| A4: Generalisering til EU-markeder | 2027–2028 | Metodeoverføring til nye land/datakilder, indeks-metodikk (ukentlig sertifisert close) |

## 5. Kostnadsgrunnlag (år 1, estimat)

| Post | Grunnlag |
|---|---|
| Egenutført FoU, 1 utvikler | 1 850 t × 700 kr = 1 295 000 kr |
| Skytjenester direkte knyttet til FoU (Vercel, Supabase, API-kost) | ~40 000 kr |
| **Sum grunnlag** | **~1 335 000 kr** |
| **Skattefunn-fradrag (19 %)** | **~253 000 kr** |

## 6. Dokumentasjon som allerede finnes (styrker søknaden betydelig)

- Løpende teknisk logg med datoer, hypoteser og korreksjoner (git-historikk, ODYSSEY-STATE.md, commit-meldinger som dokumenterer feilmoduser og metodeutvikling)
- Publisert datasett med DOI (Zenodo 10.5281/zenodo.19520064) og åpen metodikk
- Målbare resultater: crawler-ingest verifisert i egne logger, siteringsrate målt med versjonert benchmark
- RICS Tech Partner 2026

---

## Neste steg (praktisk)

1. **Avklar søkerselskap** — IP-en bør formelt ligge i selskapet som søker
2. Opprett søknad på **skattefunn.no** (Forskningsrådets portal, BankID)
3. Lim inn seksjon 1–5 over i skjemaets felter (de matcher skjemastrukturen med vilje)
4. **Timeføring fra nå:** Skattefunn krever timelister for egenutført FoU — start en enkel logg i dag (dato, timer, aktivitet A1–A4). Git-historikken er god støttedokumentasjon men erstatter ikke timelister
5. Etter innvilget Skattefunn: søk **Innovasjon Norge kommersialiseringstilskudd** (inntil 750 000 kr) — Skattefunn-status teller positivt

*Merk: jeg er ikke skatterådgiver — la regnskapsføreren din se over kostnadsgrunnlaget før innsending.*
