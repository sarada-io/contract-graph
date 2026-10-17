import assert from "node:assert/strict";
import test from "node:test";
import { encodeDelivery, decodeDelivery } from "../src/scripts/delivery-storage.js";

const fixture = () => {
  const files = Array.from({ length: 40 }, (_, i) => [`src/unit-${i}.js`, "file", "a".repeat(64)]);
  return { version: 1, programme: "example", status: "Closed", history: [
    { checkpoint: { session: "first", files, writes: ["src"] } },
    { checkpoint: { session: "second", files, writes: ["src"] } },
  ], sessions: [{ session: "second", files, writes: ["src"] }],
  future: JSON.parse('{"__proto__":{"note":"preserve"},"value":null,"array":[true,12," x "]}') };
};

test("v2 interns repeated evidence and reconstructs every logical field without aliases", () => {
  const record = fixture();
  const stored = encodeDelivery(record);
  const roundtrip = JSON.parse(JSON.stringify(stored));
  assert.ok(JSON.stringify(stored).length < JSON.stringify(record).length);
  assert.deepEqual(decodeDelivery(roundtrip), record);
  const decoded = decodeDelivery(roundtrip);
  decoded.history[0].checkpoint.files[0][0] = "changed";
  assert.equal(decoded.history[1].checkpoint.files[0][0], "src/unit-0.js");
  assert.deepEqual(decodeDelivery(roundtrip), record);
  assert.deepEqual(encodeDelivery(decodeDelivery(roundtrip)), stored);
});

test("v1 storage remains readable without reinterpretation", () => {
  const record = fixture();
  assert.strictEqual(decodeDelivery(record), record);
});

test("v2 rejects changed or missing objects, duplicate/unsafe slots, unused objects, and metadata conflicts", () => {
  const cases = [
    stored => { const key = Object.keys(stored.objects)[0]; stored.objects[key] = "changed"; },
    stored => { delete stored.objects[Object.keys(stored.objects)[0]]; },
    stored => { stored.references.push(stored.references[0]); },
    stored => { stored.references[0].path = []; },
    stored => { stored.references[0].path = ["missing", "__proto__"]; },
    stored => { stored.references[0].path = ["history", "0", "checkpoint"]; },
    stored => { stored.references[0].path = ["version"]; },
    stored => { stored.references = []; },
    stored => { stored.references.shift(); },
    stored => { stored.payload.future.value = "lost evidence"; },
    stored => { stored.programme = "another"; },
    stored => { stored.status = "Iterating"; },
    stored => { stored.payload.version = 2; },
    stored => { stored.extra = "would be lost"; },
    stored => { stored.references[0].extra = "would be lost"; },
  ];
  for (const corrupt of cases) {
    const stored = encodeDelivery(fixture());
    corrupt(stored);
    assert.throws(() => decodeDelivery(stored), /invalid v2/);
  }
});

test('opt-in deltas preserve changing snapshots, deletion, unknown fields and bounded churn size', async () => {
  const { encodeDeltaDelivery } = await import('../src/scripts/delivery-storage.js');
  const record = fixture();
  const files = record.history[0].checkpoint.files;
  record.history = Array.from({ length: 60 }, (_, i) => {
    const changed = structuredClone(files);
    changed[i % changed.length][2] = String(i).padStart(64, '0');
    if (i % 3 === 0) changed.splice(5, 1);
    return { checkpoint: { files: changed, writes: ['src'], extension: { i } } };
  });
  const v2 = encodeDelivery(record), delta = encodeDeltaDelivery(record);
  assert.equal(delta.version, 3);
  assert.ok(JSON.stringify(delta).length < JSON.stringify(v2).length / 2);
  assert.deepEqual(decodeDelivery(JSON.parse(JSON.stringify(delta))), record);
  assert.deepEqual(encodeDeltaDelivery(decodeDelivery(delta)), delta);
  for (const mutate of [
    s => { delete s.objects[Object.keys(s.objects)[0]]; },
    s => { s.deltas[Object.keys(s.deltas)[0]].base = 'missing'; },
    s => { s.deltas[Object.keys(s.deltas)[0]].deleteCount = -1; },
    s => { s.deltas[Object.keys(s.deltas)[0]].items = []; },
    s => { s.references.push(s.references[0]); },
    s => { s.status = 'Iterating'; },
    s => { s.deltas = Object.fromEntries(Object.entries(s.deltas).reverse()); },
  ]) {
    const broken = structuredClone(delta); mutate(broken);
    assert.throws(() => decodeDelivery(broken), /invalid v3/);
  }
  const noisy = { ...record, history: record.history.map((event, i) => ({ ...event, random: String(i).repeat(1500) })) };
  assert.ok(JSON.stringify(encodeDeltaDelivery(noisy)).length <= JSON.stringify(encodeDelivery(noisy)).length);
});

test('independent v3 envelopes reject excessive chains and preserve reordered or deleted rows', async () => {
  const { createHash } = await import('node:crypto');
  const { encodeDeltaDelivery } = await import('../src/scripts/delivery-storage.js');
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const record = fixture();
  const original = record.history[0].checkpoint.files;
  record.history = Array.from({ length: 70 }, (_, i) => {
    const files = structuredClone(original);
    files[0][2] = String(i).padStart(64, '0');
    if (i % 2) files.reverse();
    if (i % 3) files.splice(3, 2);
    return { files };
  });
  assert.deepEqual(decodeDelivery(encodeDeltaDelivery(record)), record);
  const objects = {}, deltas = {}, references = [], history = [], payloadHistory = [];
  let previous;
  for (let i = 0; i < 34; i++) {
    const value = [[String(i), 'file', 'a'.repeat(64)]], digest = hash(value);
    if (i === 0) objects[digest] = value;
    else deltas[digest] = { base: previous, start: 0, deleteCount: 1, items: value };
    references.push({ path: ['history', i, 'files'], hash: digest });
    history.push({ files: value }); payloadHistory.push({ files: null }); previous = digest;
  }
  const logical = { version: 1, programme: 'example', status: 'Closed', history };
  const stored = { version: 3, programme: 'example', status: 'Closed', logicalHash: hash(logical),
    payload: { ...logical, history: payloadHistory }, objects, references, deltas };
  assert.throws(() => decodeDelivery(stored), /invalid v3/);
  const repetitive = fixture();
  repetitive.history = Array.from({ length: 50 }, () => structuredClone(repetitive.history[0]));
  assert.equal(encodeDeltaDelivery(repetitive).version, 2, 'whole repeated events favour v2');
});

test('read-only public storage cohorts explain zero gain and changing-snapshot gain', async t => {
  const { createHash } = await import('node:crypto');
  const { encodeDeltaDelivery } = await import('../src/scripts/delivery-storage.js');
  const old = await import('./fixtures/historical-1.0.0/delivery-storage.mjs');
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  // These are public synthetic populations, not copied or purported adopter records.
  const records = Array.from({ length: 14 }, (_, i) => {
    const record = fixture(); record.programme = `public-${i}`;
    if (i < 4) { const files = record.sessions[0].files; delete record.sessions; record.history = Array.from({ length: 20 }, () => ({ checkpoint: { files, writes: ['src'] } })); }
    if (i >= 4) record.history = Array.from({ length: 20 }, (_, n) => {
      const files = structuredClone(record.sessions[0].files); files[n % files.length][2] = String(n).padStart(64, '0');
      return { checkpoint: { session: `session-${n}`, writes: ['src'], files } };
    });
    return { directory: i < 9 ? 'deliveries' : 'prototypes', cohort: i < 4 ? 'four-identical' : 'ten-changing', record };
  });
  const before = hash(records);
  for (const { directory, cohort, record } of records) {
    const current = encodeDelivery(record), candidate = encodeDeltaDelivery(record);
    assert.deepEqual(old.decodeDelivery(current), record);
    assert.deepEqual(decodeDelivery(old.encodeDelivery(record)), record);
    assert.deepEqual(old.decodeDelivery(record), record);
    assert.deepEqual(decodeDelivery(candidate), record);
    if (cohort === 'four-identical') assert.deepEqual(candidate, current);
    else { assert.equal(candidate.version, 3); assert.notEqual(old.decodeDelivery(candidate).version, 1, 'old lifecycle requires logical v1, so v3 is unsupported'); }
    const bytes = value => Buffer.byteLength(JSON.stringify(value, null, 2) + '\n');
    t.diagnostic(JSON.stringify({ directory, cohort, programme: record.programme, state: record.status, fixtureHash: hash(record), currentVersion: current.version, candidateVersion: candidate.version, currentBytes: bytes(current), candidateBytes: bytes(candidate), equal: true }));
  }
  assert.equal(hash(records), before, 'benchmark must not mutate inputs');
});
