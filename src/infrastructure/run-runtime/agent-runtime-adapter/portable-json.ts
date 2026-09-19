import type { JsonObject, JsonValue } from '@revisium/revo-run';

const maximumJsonBytes = 1_048_576;
const maximumJsonDepth = 128;

const isPortableJson = (value: unknown, ancestors: Set<object>, depth: number): boolean => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value !== 'object' || depth > maximumJsonDepth || ancestors.has(value)) {
    return false;
  }
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(value)) {
    return false;
  }
  ancestors.add(value);
  const values = Array.isArray(value) ? value : Object.values(value);
  const valid = values.every((child) => isPortableJson(child, ancestors, depth + 1));
  ancestors.delete(value);

  return valid;
};

export const isJsonValue = (value: unknown): value is JsonValue => {
  if (!isPortableJson(value, new Set(), 0)) {
    return false;
  }
  try {
    const serialized = JSON.stringify(value);

    return serialized !== undefined && Buffer.byteLength(serialized, 'utf8') <= maximumJsonBytes;
  } catch {
    return false;
  }
};

export const isJsonObject = (value: unknown): value is JsonObject =>
  value !== null && !Array.isArray(value) && isJsonValue(value);

const isJsonArray = (value: JsonValue): value is readonly JsonValue[] => Array.isArray(value);

const freezeJson = (value: JsonValue): void => {
  if (isJsonArray(value)) {
    for (const item of value) {
      freezeJson(item);
    }
    Object.freeze(value);

    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) {
      freezeJson(item);
    }
    Object.freeze(value);
  }
};

export const cloneFrozenJson = <Value extends JsonValue>(value: Value): Value => {
  const cloned = structuredClone(value);
  freezeJson(cloned);

  return cloned;
};
