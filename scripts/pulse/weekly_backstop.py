#!/usr/bin/env python3
"""Dispatch the Monday Market Pulse workflow if that Monday's edition is missing.

This does not send mail. Sending stays in generate_editions.py, on the
pulse-weekly workflow, so the concurrency group and the pulse_deliveries
row stay one path. A second dispatch after a successful send is a no-op
there (UNIQUE subscriber, edition_date).

Runs daily. weekly_window.backstop_window() is what keeps it weekly: closed
from Wednesday through 07:00 UTC Monday, and Tuesday only re-fires Monday's
edition date.
"""
import json
import os
import socket
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import weekly_window as ww  # noqa: E402

WORKFLOW = 'pulse-weekly.yml'
DRY = '--dry-run' in sys.argv or os.environ.get('PULSE_BACKSTOP_DRY') == '1'


def urlopen_retry(req, timeout=60, attempts=4):
    """Retry only failures where the request never reached the server."""
    for i in range(attempts):
        try:
            return urllib.request.urlopen(req, timeout=timeout)
        except urllib.error.HTTPError:
            raise
        except urllib.error.URLError as e:
            pre_send = isinstance(e.reason, (socket.gaierror, ConnectionRefusedError))
            if not pre_send or i == attempts - 1:
                raise
            wait = 15 * (i + 1)
            print(f'pulse-backstop: network error ({e.reason}); retrying in {wait}s')
            time.sleep(wait)


def rest_rows(path):
    """Public-schema PostgREST read. None when the read cannot be trusted."""
    base = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    if not (base and key):
        print('pulse-backstop: Supabase credentials missing')
        return None
    req = urllib.request.Request(
        f'{base}/rest/v1/{path}',
        headers={
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Accept': 'application/json',
            'Accept-Profile': 'public',
            'User-Agent': 'avena-pulse-backstop/1.0 (avenaterminal.com)',
        },
    )
    try:
        with urlopen_retry(req, timeout=60) as res:
            body = json.loads(res.read() or b'[]')
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, OSError) as e:
        code = getattr(e, 'code', None)
        print(f'pulse-backstop: delivery read failed ({type(e).__name__} {code or ""})'.rstrip())
        return None
    if not isinstance(body, list):
        print('pulse-backstop: delivery read was not a row list')
        return None
    return body


def read_delivery(edition):
    active = rest_rows('pulse_subscribers?select=id&active=eq.true&limit=1000')
    delivered = rest_rows(
        f'pulse_deliveries?select=subscriber_id&edition_date=eq.{edition.isoformat()}&limit=1000'
    )
    if active is None or delivered is None:
        return ww.classify_delivery(None, None)
    return ww.classify_delivery(
        [row.get('id') for row in active],
        [row.get('subscriber_id') for row in delivered],
    )


def github_runs(status):
    token = os.environ.get('GITHUB_TOKEN', '')
    repo = os.environ.get('GITHUB_REPOSITORY', '')
    if not (token and repo):
        print('pulse-backstop: GITHUB_TOKEN or GITHUB_REPOSITORY missing')
        return None
    url = (
        f'https://api.github.com/repos/{repo}/actions/workflows/{WORKFLOW}/runs'
        f'?status={status}&per_page=5'
    )
    req = urllib.request.Request(
        url,
        headers={
            'Authorization': f'Bearer {token}',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'avena-pulse-backstop/1.0',
        },
    )
    try:
        with urlopen_retry(req, timeout=30) as res:
            body = json.loads(res.read() or b'{}')
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, OSError) as e:
        code = getattr(e, 'code', None)
        print(f'pulse-backstop: in-flight read failed ({type(e).__name__} {code or ""})'.rstrip())
        return None
    runs = body.get('workflow_runs') if isinstance(body, dict) else None
    if not isinstance(runs, list):
        print('pulse-backstop: in-flight read had no workflow_runs')
        return None
    return [{'status': r.get('status'), 'created_at': r.get('created_at')} for r in runs]


def read_in_flight(now):
    queued = github_runs('queued')
    running = github_runs('in_progress')
    if queued is None or running is None:
        return 'indeterminate'
    return ww.classify_in_flight(queued + running, now)


def dispatch(edition):
    token = os.environ.get('GITHUB_TOKEN', '')
    repo = os.environ.get('GITHUB_REPOSITORY', '')
    if not (token and repo):
        return 'GITHUB_TOKEN or GITHUB_REPOSITORY missing'
    req = urllib.request.Request(
        f'https://api.github.com/repos/{repo}/actions/workflows/{WORKFLOW}/dispatches',
        data=json.dumps({'ref': 'main', 'inputs': {'edition_date': edition.isoformat()}}).encode(),
        method='POST',
        headers={
            'Authorization': f'Bearer {token}',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            'User-Agent': 'avena-pulse-backstop/1.0',
        },
    )
    try:
        with urlopen_retry(req, timeout=30) as res:
            if res.status != 204:
                return f'HTTP {res.status}'
    except urllib.error.HTTPError as e:
        detail = e.read()[:200]
        return f'HTTP {e.code} {detail!r}'
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return f'{type(e).__name__}'
    return None


def result_line(decision, edition, delivery, in_flight, dispatched):
    edition_s = edition.isoformat() if edition else '-'
    print(
        f'RESULT action={decision["action"]} reason={decision["reason"]} '
        f'degraded={str(decision["degraded"]).lower()} edition={edition_s} '
        f'delivery={delivery} in_flight={in_flight} dispatched={str(dispatched).lower()}'
    )


def main():
    now = ww.as_utc(None)
    opened, edition = ww.backstop_window(now)
    if not opened:
        oslo = ww.oslo_now(now)
        print(
            f'pulse-backstop: {oslo.strftime("%A")} {oslo.date().isoformat()} '
            f'{oslo.strftime("%H:%M")} Europe/Oslo — weekly window closed, not dispatching.'
        )
        decision = ww.decide(False, 'missing', 'no')
        result_line(decision, None, 'unchecked', 'unchecked', False)
        return 0

    delivery = read_delivery(edition)
    if delivery in ('sent', 'no_subscribers'):
        in_flight = 'unchecked'
    else:
        in_flight = read_in_flight(now)
    decision = ww.decide(True, delivery, in_flight)
    print(
        f'pulse-backstop: edition {edition.isoformat()} delivery={delivery} '
        f'in_flight={in_flight} → {decision["action"]} ({decision["reason"]})'
    )

    dispatched = False
    dispatch_error = None
    if decision['action'] == 'dispatch':
        if DRY:
            print(f'pulse-backstop: dry-run, would dispatch {WORKFLOW} edition {edition.isoformat()}')
        else:
            dispatch_error = dispatch(edition)
            dispatched = dispatch_error is None
            if dispatch_error:
                print(f'pulse-backstop: DISPATCH FAILED — {dispatch_error}')
            else:
                print(f'pulse-backstop: dispatched {WORKFLOW} on main for {edition.isoformat()}')

    result_line(decision, edition, delivery, in_flight, dispatched)
    if dispatch_error:
        print('Monday edition is not confirmed sent, and the backstop could not dispatch.')
        return 1
    if decision['degraded']:
        print('Decision used a signal that could not be read. Check the action above.')
        return 1
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as e:  # noqa: BLE001 — a quiet exit 0 would look like "nothing to do"
        print(f'pulse-backstop threw: {type(e).__name__}')
        print('RESULT action=none reason=script_threw degraded=true dispatched=false')
        sys.exit(1)
