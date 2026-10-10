/**
 * Counterpart score drift — the decision layer, kept pure so it can be tested.
 *
 * WHY THIS FILE EXISTS (2026-10-10). `counterpart-scan` applied `computeDrift`
 * to every developer on every nightly run. The drift is a function of the
 * developer's stored stress signals, and nothing in the codebase ever updates
 * those signals — there is no Registro Mercantil / BORME ingest; the route
 * comments call it "future v2". So the drift was a CONSTANT, re-applied every
 * night, and any developer carrying a static stress signal walked down to the
 * zero floor and stayed pinned there.
 *
 * Measured from the event log before the fix: 122 `counterpart.grade_revised`
 * events per developer with `min(drift) == max(drift)` — Metrovacesa -3 every
 * single night, 122 nights; Neinor Homes 59 -> 0; Realia Patrimonio 49 -> 0;
 * Metrovacesa 13 -> 0. Those are real, publicly-listed Spanish developers and
 * the published grade DV was an artifact of a countdown, not a measurement.
 * It also minted ~725 "active" financial-distress alerts, ~5 more every day.
 *
 * The rule this encodes: DRIFT IS A RESPONSE TO NEW INFORMATION. A scan may
 * move a score only when the inputs to the score have changed since the last
 * scan. Unchanged inputs mean we learned nothing, and learning nothing is not
 * evidence of decline. A developer whose signals never change never moves.
 *
 * It is the project's recurring bug in a new dress: an absence of information
 * (no new signals) silently became a value (a lower score, a distress alert,
 * a floor of 0) and was published as if measured.
 */

/** The subset of a developer row that the drift model actually reads. */
export interface DriftInputs {
  payment_delay_signals: number | null;
  legal_disputes_active: number | null;
  court_judgements_against: number | null;
  delayed_projects: number | null;
  cancelled_projects: number | null;
  financial_stress_score: number | null;
}

export interface DeveloperScanRow extends DriftInputs {
  developer_id: string;
  name: string;
  counterpart_score: number;
  score_trend: string | null;
  signals_fingerprint: string | null;
}

/** Null-safe read. A missing signal is NOT a zero signal for fingerprinting. */
function sig(v: number | null | undefined): string {
  return v === null || v === undefined ? 'n' : String(v);
}

/** Null coerced to 0 only where the drift thresholds need a number. */
function num(v: number | null | undefined): number {
  return v === null || v === undefined ? 0 : v;
}

/**
 * A stable fingerprint of every input the drift model reads. Two rows with
 * the same fingerprint carry the same information, so a scan that sees an
 * unchanged fingerprint has learned nothing and must not move the score.
 *
 * `null` and `0` fingerprint DIFFERENTLY on purpose: "we have no figure for
 * active disputes" and "we have checked and there are none" are different
 * facts, and conflating them is how this class of bug starts.
 */
export function signalsFingerprint(d: DriftInputs): string {
  return [
    'v1',
    sig(d.payment_delay_signals),
    sig(d.legal_disputes_active),
    sig(d.court_judgements_against),
    sig(d.delayed_projects),
    sig(d.cancelled_projects),
    sig(d.financial_stress_score),
  ].join(':');
}

/**
 * Score drift implied by the current stress signals. Unchanged from the
 * original model — the bug was never the arithmetic, it was applying it
 * repeatedly to the same inputs. Bounded to +/-3.
 */
export function computeDrift(d: DriftInputs): number {
  let drift = 0;
  if (num(d.payment_delay_signals) > 3) drift -= 1.5;
  if (num(d.legal_disputes_active) > 2) drift -= 1.0;
  if (num(d.court_judgements_against) > 0) drift -= 1.5;
  if (num(d.delayed_projects) > 5) drift -= 1.0;
  if (num(d.cancelled_projects) > 1) drift -= 1.5;
  if (d.financial_stress_score != null && d.financial_stress_score > 60) drift -= 1.0;

  if (
    num(d.payment_delay_signals) === 0 &&
    num(d.legal_disputes_active) === 0 &&
    num(d.court_judgements_against) === 0 &&
    num(d.delayed_projects) <= 3
  ) {
    drift += 0.5;
  }
  return Math.max(-3, Math.min(3, drift));
}

export function scoreToGrade(score: number): string {
  if (score >= 85) return 'AAV';
  if (score >= 75) return 'AV';
  if (score >= 67) return 'ABV';
  if (score >= 55) return 'BBV';
  if (score >= 42) return 'CV';
  return 'DV';
}

export type ScanDecision =
  /** No fingerprint on record. Record one, move nothing — we have no evidence
   *  the signals changed, so the score must not move on this run. */
  | { action: 'baseline'; fingerprint: string }
  /** Inputs identical to the last scan. Nothing learned, nothing written
   *  except (optionally) the scan timestamp. */
  | { action: 'hold'; reason: 'signals_unchanged'; fingerprint: string }
  /** Inputs changed. Apply the drift once, for this change. */
  | {
      action: 'drift';
      fingerprint: string;
      drift: number;
      previousScore: number;
      newScore: number;
      newGrade: string;
      newTrend: string;
      /** True when the clamp, not the model, decided the score. */
      floored: boolean;
    };

/**
 * Decide what a scan is allowed to do to one developer.
 *
 * The ordering matters: the fingerprint check comes BEFORE the drift
 * computation, because the question "did we learn anything?" is prior to the
 * question "what would the model say?".
 */
export function decideScan(d: DeveloperScanRow): ScanDecision {
  const fingerprint = signalsFingerprint(d);

  if (!d.signals_fingerprint) {
    return { action: 'baseline', fingerprint };
  }
  if (d.signals_fingerprint === fingerprint) {
    return { action: 'hold', reason: 'signals_unchanged', fingerprint };
  }

  const drift = computeDrift(d);
  if (drift === 0) {
    // Signals changed but the model is indifferent to the change. Record the
    // new fingerprint so the change is not re-evaluated every night.
    return { action: 'hold', reason: 'signals_unchanged', fingerprint };
  }

  const raw = d.counterpart_score + drift;
  const newScore = Math.max(0, Math.min(100, Math.round(raw)));
  return {
    action: 'drift',
    fingerprint,
    drift,
    previousScore: d.counterpart_score,
    newScore,
    newGrade: scoreToGrade(newScore),
    newTrend: drift < -0.5 ? 'deteriorating' : drift > 0.5 ? 'improving' : 'stable',
    floored: Math.round(raw) !== newScore,
  };
}
