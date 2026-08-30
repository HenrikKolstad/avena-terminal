/**
 * Tests for the integrity log's load-bearing pure functions.
 *
 * These exist because /verify's entire pitch is "don't trust us, verify us",
 * and a verification surface whose hash is not reproducible is worse than no
 * verification surface at all — it invites a reader to rely on it. The two
 * properties a third party actually depends on are:
 *
 *   1. canonicalJson is order-independent, so the same artefact hashes the
 *      same way no matter how the object was assembled;
 *   2. merkleRoot is deterministic and order-sensitive, so a root commits to
 *      a specific set of fingerprints in a specific sequence.
 *
 * Neither was tested while the whole surface was published.
 *
 * Run: npx tsx scripts/test-integrity.ts
 */

import { canonicalJson, sha256, merkleRoot, hashJsonArtefact } from '../src/lib/integrity';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('canonicalJson — key order must not change the hash');

{
  const a = { snapshot_date: '2026-08-29', ref_count: 2, refs: { N1: 100, N2: 200 } };
  const b = { refs: { N2: 200, N1: 100 }, ref_count: 2, snapshot_date: '2026-08-29' };
  check('same content, different key order, same canonical form', canonicalJson(a) === canonicalJson(b));
  check('same content, different key order, same hash', hashJsonArtefact(a).sha256_hash === hashJsonArtefact(b).sha256_hash);
}

{
  const a = { refs: { N1: 100 } };
  const b = { refs: { N1: 101 } };
  check('a one-euro price difference changes the hash', hashJsonArtefact(a).sha256_hash !== hashJsonArtefact(b).sha256_hash);
}

{
  // Arrays are sequences, not sets: reordering them is a different artefact.
  check('array order is preserved', canonicalJson([1, 2]) !== canonicalJson([2, 1]));
  check('null survives', canonicalJson({ a: null }) === '{"a":null}', canonicalJson({ a: null }));
  check('nested objects are sorted at every level',
    canonicalJson({ b: { z: 1, a: 2 } }) === '{"b":{"a":2,"z":1}}', canonicalJson({ b: { z: 1, a: 2 } }));
}

console.log('\nmerkleRoot — deterministic, order-sensitive, odd-count safe');

{
  const h = (s: string) => sha256(s);
  const one = [h('a')];
  check('a single leaf is its own root', merkleRoot(one) === one[0]);

  const two = [h('a'), h('b')];
  check('two leaves are deterministic', merkleRoot(two) === merkleRoot([h('a'), h('b')]));
  check('swapping two leaves changes the root', merkleRoot(two) !== merkleRoot([h('b'), h('a')]));

  const three = [h('a'), h('b'), h('c')];
  const root3 = merkleRoot(three);
  check('an odd leaf count still produces a root', /^[0-9a-f]{64}$/.test(root3), root3);
  check('odd-count roots are deterministic', root3 === merkleRoot([h('a'), h('b'), h('c')]));
  check('adding a leaf changes the root', root3 !== merkleRoot([...three, h('d')]));

  // KNOWN LIMITATION, pinned rather than hidden: duplicate-last-when-odd means
  // [a,b,c] and [a,b,c,c] roll to the SAME root (the Bitcoin CVE-2012-2459
  // shape). Asserting the real behaviour here so nobody later reads the root
  // as a commitment to a leaf COUNT. It is acceptable for this use — leaves are
  // server-generated fingerprints of our own artefacts, never attacker-supplied
  // — and fingerprint_count is stored alongside the root for exactly this gap.
  check('duplicate-last: [a,b,c] and [a,b,c,c] share a root (documented limitation)',
    root3 === merkleRoot([h('a'), h('b'), h('c'), h('c')]));
}

{
  // The empty case must never be presented as an attestation of content.
  // merkleRoot([]) returns sha256(''), the recognisable empty-string digest —
  // which is exactly what integrity-roll logged every night from 2026-06-10 to
  // 2026-08-30 while nothing was being fingerprinted.
  check('an empty set hashes to the sha256 of the empty string', merkleRoot([]) === sha256(''));
  check('that digest is the known constant',
    merkleRoot([]) === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    merkleRoot([]));
}

console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
