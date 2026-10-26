/**
 * Locks the Monday Market Pulse delivery schedule.
 *
 * Daily same-day alerts stay manual. The weekly sender stays Monday-only,
 * with a late cron in the hour GitHub has actually been starting it, and a
 * separate daily workflow is the only thing allowed to dispatch it. The
 * decision of "is this the weekly window, and was it already sent" lives in
 * scripts/pulse/weekly_window.py and is executed here.
 *
 * Run: npx tsx scripts/test-pulse-weekly-backstop.ts
 */
import { spawnSync } from 'child_process';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

let pass = 0;
let fail = 0;

function ok(cond: boolean, label: string): void {
  if (cond) {
    pass++;
    console.log(`  ok  ${label}`);
  } else {
    fail++;
    console.error(`  FAIL ${label}`);
  }
}

function activeCrons(src: string): string[] {
  const crons: string[] = [];
  let inSchedule = false;
  let scheduleIndent = -1;
  for (const line of src.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const schedule = line.match(/^(\s*)schedule:\s*$/);
    if (schedule) {
      inSchedule = true;
      scheduleIndent = schedule[1].length;
      continue;
    }
    if (!inSchedule) continue;
    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
    if (indent <= scheduleIndent) {
      inSchedule = false;
      continue;
    }
    const cron = line.match(/cron:\s*'([^']+)'/);
    if (cron) crons.push(cron[1]);
  }
  return crons;
}

function fields(cron: string): string[] {
  return cron.split(/\s+/);
}

const root = process.cwd();
const wfDir = path.join(root, '.github', 'workflows');
const workflows = readdirSync(wfDir)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .map((name) => ({ name, src: readFileSync(path.join(wfDir, name), 'utf8') }));

const alerts = workflows.find((w) => w.name === 'pulse-alerts.yml');
const weekly = workflows.find((w) => w.name === 'pulse-weekly.yml');
const backstop = workflows.find((w) => w.name === 'pulse-weekly-backstop.yml');
ok(alerts !== undefined && weekly !== undefined && backstop !== undefined, 'the three pulse workflow files exist');

const alertCrons = alerts ? activeCrons(alerts.src) : ['missing'];
ok(alertCrons.length === 0, 'pulse-alerts.yml has no active schedule (daily alerts stay manual)');
ok(Boolean(alerts?.src.includes('workflow_dispatch')), 'pulse-alerts.yml can still be run by hand');
ok(Boolean(alerts?.src.includes('send_alerts.py')), 'pulse-alerts.yml still points at the daily script');

for (const wf of workflows) {
  const crons = activeCrons(wf.src);
  if (wf.src.includes('send_alerts.py')) {
    ok(crons.length === 0, `${wf.name} runs send_alerts.py and therefore has no schedule`);
  }
}

const weeklyCrons = weekly ? activeCrons(weekly.src) : [];
ok(weeklyCrons.length >= 4, `pulse-weekly has several Monday draws (got ${weeklyCrons.join(', ')})`);
ok(
  weeklyCrons.every((cron) => fields(cron)[4] === '1' && fields(cron)[2] === '*' && fields(cron)[3] === '*'),
  'every pulse-weekly cron is Monday-only',
);
ok(weeklyCrons.includes('45 5 * * 1'), 'the 05:45 UTC primary is still there');
ok(
  weeklyCrons.some((cron) => Number(fields(cron)[1]) === 13),
  'a Monday cron sits at 13:xx UTC, the late edge of when runs have actually started',
);
ok(
  weeklyCrons.some((cron) => Number(fields(cron)[1]) >= 17),
  'a later Monday cron remains after that window',
);
ok(Boolean(weekly?.src.includes('generate_editions.py')), 'pulse-weekly still sends via generate_editions.py');
ok(!weekly?.src.includes('send_alerts.py'), 'pulse-weekly does not run the daily alert script');
ok(Boolean(weekly?.src.includes('group: pulse-weekly')), 'pulse-weekly keeps its concurrency group');
ok(Boolean(weekly?.src.includes('PULSE_TRIGGER')), 'pulse-weekly tells the script whether it was scheduled');
ok(Boolean(weekly?.src.includes('cancel-in-progress: false')), 'a second Monday run waits, it does not cancel the first');

const backstopCrons = backstop ? activeCrons(backstop.src) : [];
ok(backstopCrons.length >= 4, `daily backstop has at least four slots (got ${backstopCrons.join(', ')})`);
ok(
  backstopCrons.every((cron) => {
    const f = fields(cron);
    return f.length === 5 && f[2] === '*' && f[3] === '*' && f[4] === '*';
  }),
  'every backstop cron is daily, not Monday-only',
);
ok(
  backstopCrons.some((cron) => Number(fields(cron)[1]) <= 3),
  'an early daily slot exists so a multi-hour delay lands near 07:00 UTC',
);
ok(
  backstopCrons.some((cron) => {
    const hour = Number(fields(cron)[1]);
    return hour >= 7 && hour <= 8;
  }),
  'a daily slot is aimed at the 12:00–13:30 UTC hour under the observed delay',
);
ok(Boolean(backstop?.src.includes('pulse-weekly.yml')), 'the backstop dispatches the weekly workflow by file name');
ok(Boolean(backstop?.src.includes('actions: write')), 'the backstop can dispatch with GITHUB_TOKEN');
ok(!backstop?.src.includes('generate_editions.py'), 'the backstop does not send mail itself');
ok(!backstop?.src.includes('send_alerts.py'), 'the backstop does not run daily alerts');
ok(Boolean(backstop?.src.includes('workflow_dispatch')), 'the backstop can be run by hand');

const editions = readFileSync(path.join(root, 'scripts', 'pulse', 'generate_editions.py'), 'utf8');
ok(editions.includes('already delivered'), 'generate_editions.py still skips an already-delivered edition');
ok(editions.includes('unit_identity'), 'generate_editions.py still applies the unit-identity filter');
ok(editions.includes('weekly_window'), 'generate_editions.py takes its edition date from the weekly window');
ok(!editions.includes('send_alerts'), 'generate_editions.py does not call the daily alert script');

const py = spawnSync('python3', ['scripts/pulse/weekly_window.py', '--self-test'], {
  encoding: 'utf8',
  cwd: root,
});
if (py.stdout) process.stdout.write(py.stdout);
if (py.status !== 0 && py.stderr) process.stderr.write(py.stderr);
ok(py.status === 0, 'weekly_window.py --self-test passed');

console.log(fail ? `FAILED — ${pass} passed, ${fail} failed` : `ALL PASS — ${pass} passed, 0 failed`);
if (fail) process.exit(1);
