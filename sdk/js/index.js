/**
 * avena-terminal — official JavaScript client for Avena Terminal.
 * https://avenaterminal.com · CC BY 4.0 · DOI 10.5281/zenodo.19520064
 *
 * Zero dependencies. Works in Node 18+, Deno, Bun, and browsers.
 *
 *   import { AvenaClient } from 'avena-terminal';
 *   const avena = new AvenaClient();
 *   const delphi = await avena.delphi();        // today's AI panel
 *   console.log(delphi.consensus_index);
 */

const DEFAULT_BASE = 'https://avenaterminal.com';

export class AvenaClient {
  /**
   * @param {{ baseUrl?: string, apiKey?: string }} [options]
   *   apiKey is optional — public endpoints are CC BY 4.0 with attribution.
   *   Commercial tiers: https://avenaterminal.com/api#pricing
   */
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
    this.apiKey = options.apiKey ?? null;
  }

  /**
   * Raw GET against any Avena endpoint path (e.g. '/api/v1/delphi').
   * The escape hatch — every documented endpoint works through this.
   */
  async get(path) {
    const headers = { Accept: 'application/json', 'User-Agent': 'avena-terminal-js/0.1.0' };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`Avena API ${res.status} on ${path}`);
    return res.json();
  }

  /** DELPHI — the daily AI panel on European property. Consensus, disagreement, per-model answers, 60-day history. */
  delphi() { return this.get('/api/v1/delphi'); }

  /** PLAB — the European Property AI Benchmark. Daily model accuracy leaderboard. */
  plab() { return this.get('/api/v1/plab'); }

  /** OpenAPI 3.1 description of every endpoint. */
  openapi() { return this.get('/api/v1/openapi.json'); }

  /** Machine-readable partnership/API profile. */
  apiProfile() { return this.get('/api/v1/api-profile'); }
}

export default AvenaClient;
