"""When the Monday Market Pulse edition is allowed to go out.

GitHub's weekly scheduler has been dropping or delaying this repo's Monday
workflow. From 2026-09-07 the one scheduled run that did appear started
between 10:44 and 13:32 UTC. On 2026-10-26 neither the 05:45 nor the 08:15
UTC slot had created a run by 11:18 UTC. Daily workflows did start
(feed-refresh, capture-backstop), several hours late, and workflow_dispatch
started in the same second it was requested.

So the send stays weekly — one edition, dated Monday in Europe/Oslo — while
the watcher that notices a miss runs daily. Tuesday is a catch-up of that
same Monday: a run that slips past midnight must not mint a second edition.

The backstop stays quiet until 07:00 UTC on that Monday so the 05:45 UTC
primary can land first. Before that instant, including the first half-hour
of Monday in Oslo (still Sunday evening UTC), it does not dispatch.
"""
import datetime as dt
import os
import sys
from zoneinfo import ZoneInfo

OSLO = ZoneInfo('Europe/Oslo')
# 07:00 UTC is 08:00 CET / 09:00 CEST. The primary cron is 05:45 UTC.
BACKSTOP_READY_UTC = dt.time(7, 0)
QUEUED_STALE = dt.timedelta(minutes=90)
RUNNING_STALE = dt.timedelta(minutes=30)


def as_utc(now):
    if now is None:
        return dt.datetime.now(dt.timezone.utc)
    if now.tzinfo is None:
        return now.replace(tzinfo=dt.timezone.utc)
    return now.astimezone(dt.timezone.utc)


def oslo_now(now=None):
    return as_utc(now).astimezone(OSLO)


def edition_date_for(now=None):
    """The edition a run at `now` belongs to.

    Tuesday in Europe/Oslo is still Monday's edition. Every other day is
    that Oslo calendar date (a manual Wednesday dispatch is a Wednesday
    edition; the backstop does not dispatch on Wednesday).
    """
    oslo = oslo_now(now)
    if oslo.weekday() == 1:
        return oslo.date() - dt.timedelta(days=1)
    return oslo.date()


def schedule_may_send(now=None):
    """Scheduled runs may send on Monday, or on Tuesday as Monday's catch-up."""
    return oslo_now(now).weekday() in (0, 1)


def gate_send(trigger, now=None):
    """workflow_dispatch always proceeds. schedule only inside the weekly window."""
    if trigger != 'schedule':
        return True
    return schedule_may_send(now)


def backstop_window(now=None):
    """(open, edition_date) for the daily watcher.

    Open from 07:00 UTC Monday through the end of Tuesday, Europe/Oslo.
    `edition_date` is that Monday. Closed windows return (False, None).
    """
    now = as_utc(now)
    oslo = now.astimezone(OSLO)
    if oslo.weekday() == 1:
        return True, oslo.date() - dt.timedelta(days=1)
    if oslo.weekday() == 0:
        ready = dt.datetime.combine(oslo.date(), BACKSTOP_READY_UTC, tzinfo=dt.timezone.utc)
        if now < ready:
            return False, None
        return True, oslo.date()
    return False, None


def parse_edition_override(raw, now=None):
    """Accept YYYY-MM-DD within two days of the runner's UTC date. Else ValueError."""
    try:
        chosen = dt.date.fromisoformat(raw)
    except ValueError:
        raise ValueError(f'PULSE_EDITION_DATE {raw!r} is not YYYY-MM-DD') from None
    utc_today = as_utc(now).date()
    if not (utc_today - dt.timedelta(days=2) <= chosen <= utc_today + dt.timedelta(days=1)):
        raise ValueError(
            f'PULSE_EDITION_DATE {raw} is outside the two-day window around {utc_today.isoformat()}'
        )
    return chosen


def classify_delivery(active_ids, delivered_ids):
    """'sent' | 'missing' | 'no_subscribers' | 'unreadable'.

    A truncated page (1000 rows) is unreadable: claiming "everyone was sent"
    off a partial list is how a gap hides.
    """
    if active_ids is None or delivered_ids is None:
        return 'unreadable'
    if len(active_ids) == 0:
        return 'no_subscribers'
    if len(active_ids) >= 1000 or len(delivered_ids) >= 1000:
        return 'unreadable'
    have = set(delivered_ids)
    if any(i not in have for i in active_ids):
        return 'missing'
    return 'sent'


def classify_in_flight(runs, now=None):
    """'yes' | 'no' | 'indeterminate' from queued/in_progress run records.

    A fresh in_progress or queued run blocks a second dispatch. One that has
    been sitting longer than the job actually takes (runs finish in under a
    minute; 2026-10-26's dispatch took 40s) is treated as stuck, not as a
    reason to skip the week.
    """
    now = as_utc(now)
    saw_unreadable = False
    for run in runs:
        try:
            status = run.get('status')
            created = dt.datetime.fromisoformat(str(run['created_at']).replace('Z', '+00:00'))
            age = now - created
        except (KeyError, TypeError, ValueError):
            saw_unreadable = True
            continue
        if status == 'in_progress' and age <= RUNNING_STALE:
            return 'yes'
        if status == 'queued' and age <= QUEUED_STALE:
            return 'yes'
    if saw_unreadable:
        return 'indeterminate'
    return 'no'


def decide(window_open, delivery, in_flight):
    """What the backstop should do. Closed window and already-sent never dispatch.

    An unreadable delivery check fail-opens to dispatch: the send script's
    UNIQUE (subscriber, edition_date) guard makes a redundant run a no-op,
    and a missed Monday is the failure this exists to prevent. That path is
    marked degraded so the run goes red instead of looking routine.
    """
    if not window_open:
        return {'action': 'no_op', 'reason': 'outside_weekly_window', 'degraded': False}
    if delivery == 'sent':
        return {'action': 'no_op', 'reason': 'already_sent', 'degraded': False}
    if delivery == 'no_subscribers':
        return {'action': 'no_op', 'reason': 'no_subscribers', 'degraded': False}
    if in_flight == 'yes':
        return {'action': 'hold', 'reason': 'weekly_run_in_flight', 'degraded': False}
    if delivery == 'missing' and in_flight == 'no':
        return {'action': 'dispatch', 'reason': 'missing', 'degraded': False}
    if delivery == 'missing' and in_flight == 'indeterminate':
        return {'action': 'dispatch', 'reason': 'missing_inflight_unknown', 'degraded': True}
    if delivery == 'unreadable':
        return {'action': 'dispatch', 'reason': 'delivery_unreadable', 'degraded': True}
    return {'action': 'dispatch', 'reason': 'unclassified', 'degraded': True}


def _utc(y, m, d, hh, mm=0):
    return dt.datetime(y, m, d, hh, mm, tzinfo=dt.timezone.utc)


def self_test():
    failures = []

    def ok(cond, label):
        if cond:
            print(f'  ok  {label}')
        else:
            print(f'  FAIL {label}')
            failures.append(label)

    # 2026-10-26 is the first Monday after Europe/Oslo left CEST (UTC+1).
    # 2026-07-06 is a summer Monday (CEST, UTC+2).
    cases = [
        # Primary's own hour: backstop holds, schedule may still send.
        (_utc(2026, 10, 26, 5, 45), False, None, True, dt.date(2026, 10, 26)),
        (_utc(2026, 10, 26, 6, 59), False, None, True, dt.date(2026, 10, 26)),
        # 07:00 UTC Monday = 08:00 CET. Window opens on the Monday date.
        (_utc(2026, 10, 26, 7, 0), True, dt.date(2026, 10, 26), True, dt.date(2026, 10, 26)),
        # Historical late-start hour.
        (_utc(2026, 10, 26, 13, 32), True, dt.date(2026, 10, 26), True, dt.date(2026, 10, 26)),
        # Monday 00:30 Oslo is still Sunday 23:30 UTC. Do not dispatch overnight.
        (_utc(2026, 10, 25, 23, 30), False, None, True, dt.date(2026, 10, 26)),
        # Tuesday catch-up is the same Monday edition, all day.
        (_utc(2026, 10, 27, 2, 15), True, dt.date(2026, 10, 26), True, dt.date(2026, 10, 26)),
        (_utc(2026, 10, 27, 21, 0), True, dt.date(2026, 10, 26), True, dt.date(2026, 10, 26)),
        # Wednesday is closed. A manual dispatch that day is a Wednesday edition.
        (_utc(2026, 10, 28, 9, 0), False, None, False, dt.date(2026, 10, 28)),
        # Summer: 06:30 UTC Monday is 08:30 CEST, still before the 07:00 UTC gate.
        (_utc(2026, 7, 6, 6, 30), False, None, True, dt.date(2026, 7, 6)),
        (_utc(2026, 7, 6, 7, 0), True, dt.date(2026, 7, 6), True, dt.date(2026, 7, 6)),
        # Summer Tuesday 22:00 UTC is Wednesday 00:00 CEST. Window closed.
        (_utc(2026, 7, 7, 22, 0), False, None, False, dt.date(2026, 7, 8)),
        (_utc(2026, 7, 7, 9, 0), True, dt.date(2026, 7, 6), True, dt.date(2026, 7, 6)),
    ]
    for moment, want_open, want_edition, want_sched, want_edition_date in cases:
        opened, edition = backstop_window(moment)
        stamp = moment.strftime('%Y-%m-%d %H:%M')
        ok(opened is want_open and edition == want_edition,
           f'backstop {stamp} UTC open={want_open} edition={want_edition}')
        ok(schedule_may_send(moment) is want_sched, f'schedule_may_send {stamp} UTC → {want_sched}')
        ok(edition_date_for(moment) == want_edition_date, f'edition_date {stamp} UTC → {want_edition_date}')
        ok(gate_send('schedule', moment) is want_sched, f'gate schedule {stamp}')
        ok(gate_send('dispatch', moment) is True, f'gate dispatch {stamp} always sends')

    # Already sent never dispatches, in any flight state, and a closed week
    # never dispatches even when the edition is missing.
    for flight in ('yes', 'no', 'indeterminate'):
        got = decide(True, 'sent', flight)
        ok(got['action'] == 'no_op' and got['reason'] == 'already_sent' and got['degraded'] is False,
           f'already sent + in_flight={flight} is a no-op')
        got = decide(False, 'missing', flight)
        ok(got['action'] == 'no_op' and got['reason'] == 'outside_weekly_window',
           f'closed window + missing + in_flight={flight} does not dispatch')
    ok(decide(True, 'no_subscribers', 'no')['action'] == 'no_op', 'no subscribers does not dispatch')
    ok(decide(True, 'missing', 'yes')['action'] == 'hold', 'in-flight run holds instead of a second dispatch')
    ok(decide(True, 'unreadable', 'yes')['action'] == 'hold', 'unreadable delivery still holds for a live run')
    miss = decide(True, 'missing', 'no')
    ok(miss == {'action': 'dispatch', 'reason': 'missing', 'degraded': False}, 'missing edition dispatches')
    unk = decide(True, 'missing', 'indeterminate')
    ok(unk['action'] == 'dispatch' and unk['degraded'] is True, 'missing + unreadable in-flight dispatches degraded')
    dark = decide(True, 'unreadable', 'no')
    ok(dark['action'] == 'dispatch' and dark['reason'] == 'delivery_unreadable' and dark['degraded'] is True,
       'unreadable delivery fail-opens, degraded')

    ok(classify_delivery(['a', 'b'], ['a', 'b']) == 'sent', 'both delivered → sent')
    ok(classify_delivery(['a', 'b'], ['a']) == 'missing', 'one gap → missing')
    ok(classify_delivery([], []) == 'no_subscribers', 'empty active list → no subscribers')
    ok(classify_delivery(None, []) == 'unreadable', 'failed subscriber read → unreadable')
    ok(classify_delivery(['a'], None) == 'unreadable', 'failed delivery read → unreadable')
    ok(classify_delivery(['x'] * 1000, []) == 'unreadable', 'truncated subscriber page is not "missing"')

    t0 = _utc(2026, 10, 26, 12, 0)
    fresh = (t0 - dt.timedelta(minutes=2)).strftime('%Y-%m-%dT%H:%M:%SZ')
    stuck_q = (t0 - dt.timedelta(minutes=120)).strftime('%Y-%m-%dT%H:%M:%SZ')
    stuck_r = (t0 - dt.timedelta(minutes=45)).strftime('%Y-%m-%dT%H:%M:%SZ')
    ok(classify_in_flight([], t0) == 'no', 'no runs → not in flight')
    ok(classify_in_flight([{'status': 'in_progress', 'created_at': fresh}], t0) == 'yes',
       'fresh in_progress blocks')
    ok(classify_in_flight([{'status': 'queued', 'created_at': fresh}], t0) == 'yes', 'fresh queue blocks')
    ok(classify_in_flight([{'status': 'queued', 'created_at': stuck_q}], t0) == 'no',
       'queue older than 90m does not block the week')
    ok(classify_in_flight([{'status': 'in_progress', 'created_at': stuck_r}], t0) == 'no',
       'in_progress older than 30m is stuck, not a reason to skip')
    ok(classify_in_flight([{'status': 'queued'}], t0) == 'indeterminate', 'unreadable run record is indeterminate')

    monday = _utc(2026, 10, 27, 8, 0)  # Tuesday UTC, override is Monday
    ok(parse_edition_override('2026-10-26', monday) == dt.date(2026, 10, 26),
       'Tuesday accepts Monday as the edition date')
    try:
        parse_edition_override('2026-09-01', monday)
        ok(False, 'a month-old edition date is refused')
    except ValueError:
        ok(True, 'a month-old edition date is refused')
    try:
        parse_edition_override('26-10-2026', monday)
        ok(False, 'non-ISO edition date is refused')
    except ValueError:
        ok(True, 'non-ISO edition date is refused')

    if failures:
        print(f'FAILED — {len(failures)} failed')
        return 1
    print('ALL PASS')
    return 0


def main(argv):
    if '--self-test' in argv:
        return self_test()
    if '--gate' in argv:
        send = gate_send(os.environ.get('PULSE_TRIGGER', 'dispatch').strip() or 'dispatch')
        line = f'send={"true" if send else "false"}\n'
        out = os.environ.get('GITHUB_OUTPUT')
        if out:
            with open(out, 'a', encoding='utf-8') as fh:
                fh.write(line)
        print(f'pulse-window: {line.strip()}')
        return 0
    print('usage: weekly_window.py --self-test | --gate', file=sys.stderr)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
