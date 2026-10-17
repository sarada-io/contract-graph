/**
 * @file Encode and decode compatible receipt storage without losing logical evidence.
 * @see .agent/contract.md
 */
import crypto from "node:crypto";

const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clone = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => object(value) && Object.keys(value).sort().join(",") === [...keys].sort().join(",");

/** Intern repeated large JSON values, without pruning events, fields, or unknown extensions. */
export function encodeDelivery(record) {
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
export function decodeDelivery(stored) {
  if (stored?.version === 3) return decodeDeltaDelivery(stored);
  if (stored?.version !== 2) return stored;
  const fail = () => { throw new Error("invalid v2 delivery evidence storage"); };
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

/** Opt-in v3: splice deltas for large snapshot arrays, retaining v2 when it is smaller. */
export function encodeDeltaDelivery(record) {
  const baseline = encodeDelivery(record), logical = clone(record), objects = {}, deltas = {}, references = [];
  let previous = null, depth = 0;
  const snapshot = value => Array.isArray(value) && value.length > 0 && value.every(row =>
    Array.isArray(row) && row.length === 3 && row.every(item => typeof item === "string")) && Buffer.byteLength(JSON.stringify(value)) >= 512;
  const encode = (value, path) => {
    if (snapshot(value)) {
      const digest = hash(value);
      if (!Object.hasOwn(objects, digest) && !Object.hasOwn(deltas, digest)) {
        let delta;
        if (previous && depth < 32) {
          const base = previous.value;
          let start = 0, suffix = 0;
          while (start < Math.min(base.length, value.length) && JSON.stringify(base[start]) === JSON.stringify(value[start])) start++;
          while (suffix < Math.min(base.length, value.length) - start && JSON.stringify(base[base.length - suffix - 1]) === JSON.stringify(value[value.length - suffix - 1])) suffix++;
          delta = { base: previous.hash, start, deleteCount: base.length - start - suffix, items: value.slice(start, value.length - suffix) };
        }
        if (delta && Buffer.byteLength(JSON.stringify(delta)) < Buffer.byteLength(JSON.stringify(value))) { deltas[digest] = delta; depth++; }
        else { objects[digest] = value; depth = 0; }
        previous = { hash: digest, value };
      }
      references.push({ path, hash: digest }); return null;
    }
    if (Array.isArray(value)) return value.map((item, i) => encode(item, [...path, i]));
    if (object(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item, [...path, key])]));
    return value;
  };
  const payload = encode(logical, []);
  const stored = { version: 3, programme: record.programme, status: record.status, logicalHash: hash(record), payload, objects, references, deltas };
  return Buffer.byteLength(JSON.stringify(stored)) < Buffer.byteLength(JSON.stringify(baseline)) ? stored : baseline;
}

function decodeDeltaDelivery(stored) {
  const fail = () => { throw new Error("invalid v3 delivery evidence storage"); };
  if (!exactKeys(stored, ["version", "programme", "status", "logicalHash", "payload", "objects", "references", "deltas"]) || !object(stored.objects) || !object(stored.deltas)) fail();
  const objects = clone(stored.objects), depths = new Map(Object.keys(objects).map(key => [key, 0]));
  for (const [digest, delta] of Object.entries(stored.deltas)) {
    if (!/^[a-f0-9]{64}$/.test(digest) || Object.hasOwn(objects, digest) || !exactKeys(delta, ["base", "start", "deleteCount", "items"]) ||
        typeof delta.base !== "string" || !/^[a-f0-9]{64}$/.test(delta.base) || !Object.hasOwn(objects, delta.base) || !Array.isArray(objects[delta.base]) || !Array.isArray(delta.items) ||
        !Number.isInteger(delta.start) || !Number.isInteger(delta.deleteCount) || delta.start < 0 || delta.deleteCount < 0 ||
        delta.start + delta.deleteCount > objects[delta.base].length || depths.get(delta.base) >= 32) fail();
    const base = objects[delta.base];
    const value = [...base.slice(0, delta.start), ...delta.items, ...base.slice(delta.start + delta.deleteCount)];
    if (hash(value) !== digest) fail();
    Object.defineProperty(objects, digest, { value, enumerable: true }); depths.set(digest, depths.get(delta.base) + 1);
  }
  // Every base also occurs as an evidence slot. The v2 reader checks unused objects,
  // every digest, duplicate paths, metadata and the complete logical identity.
  const { deltas, ...envelope } = stored;
  try { return decodeDelivery({ ...envelope, version: 2, objects }); } catch { fail(); }
}
