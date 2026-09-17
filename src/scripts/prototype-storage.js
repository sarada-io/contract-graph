/** Versioned receipt storage. Readers recover the complete logical v1 record before using it. */
import crypto from "node:crypto";

const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clone = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => object(value) && Object.keys(value).sort().join(",") === [...keys].sort().join(",");

/** Intern repeated large JSON values, without pruning events, fields, or unknown extensions. */
export function encodePrototype(record) {
  record = clone(record);
  const counts = new Map();
  const count = value => {
    const text = JSON.stringify(value);
    if (Buffer.byteLength(text) >= 512) counts.set(text, (counts.get(text) ?? 0) + 1);
    if (value && typeof value === "object") for (const child of Object.values(value)) count(child);
  };
  count(record);
  const objects = {}, references = [];
  const encode = (value, path) => {
    if (path.length && counts.get(JSON.stringify(value)) > 1) {
      const digest = hash(value);
      objects[digest] = clone(value);
      references.push({ path, hash: digest });
      return null;
    }
    if (Array.isArray(value)) return value.map((child, i) => encode(child, [...path, i]));
    if (object(value)) return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encode(child, [...path, key])]));
    return value;
  };
  const payload = encode(record, []);
  return { version: 2, programme: record.programme, status: record.status, logicalHash: hash(record), payload, objects, references };
}

/** Fail closed on missing, modified, unused, or ambiguous evidence. Never load external paths. */
export function decodePrototype(stored) {
  if (stored?.version !== 2) return stored;
  const fail = () => { throw new Error("invalid v2 prototype evidence storage"); };
  if (!exactKeys(stored, ["version", "programme", "status", "logicalHash", "payload", "objects", "references"]) ||
      !object(stored.payload) || stored.payload.version !== 1 || !object(stored.objects) || !Array.isArray(stored.references)) fail();
  for (const [digest, value] of Object.entries(stored.objects)) {
    if (!/^[a-f0-9]{64}$/.test(digest) || hash(value) !== digest) fail();
  }
  const payload = clone(stored.payload), used = new Set(), paths = new Set();
  // Resolve all slots before inserting objects: references cannot modify another object's evidence.
  const assignments = stored.references.map(ref => {
    if (!exactKeys(ref, ["path", "hash"]) || !Array.isArray(ref.path) || !ref.path.length ||
        typeof ref.hash !== "string" || !Object.hasOwn(stored.objects, ref.hash)) fail();
    const identity = JSON.stringify(ref.path);
    if (paths.has(identity)) fail();
    paths.add(identity); used.add(ref.hash);
    let parent = payload;
    for (let i = 0; i < ref.path.length; i++) {
      const key = ref.path[i];
      if ((!object(parent) && !Array.isArray(parent)) ||
          (Array.isArray(parent) ? !Number.isInteger(key) || key < 0 || key >= parent.length : typeof key !== "string") ||
          !Object.hasOwn(parent, key)) fail();
      if (i === ref.path.length - 1) {
        if (parent[key] !== null) fail();
        return { parent, key, value: clone(stored.objects[ref.hash]) };
      }
      parent = parent[key];
    }
  });
  if (used.size !== Object.keys(stored.objects).length) fail();
  for (const { parent, key, value } of assignments) Object.defineProperty(parent, key, { value, enumerable: true, writable: true, configurable: true });
  if (payload.programme !== stored.programme || payload.status !== stored.status || hash(payload) !== stored.logicalHash) fail();
  return payload;
}
