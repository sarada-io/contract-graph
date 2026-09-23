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
