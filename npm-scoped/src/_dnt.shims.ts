import { Deno } from "@deno/shim-deno";
export { Deno } from "@deno/shim-deno";
import { crypto } from "@deno/shim-crypto";
export {
  type AesCbcParams,
  type AesCtrParams,
  type AesDerivedKeyParams,
  type AesGcmParams,
  type AesKeyAlgorithm,
  type AesKeyGenParams,
  type Algorithm,
  type AlgorithmIdentifier,
  type BigInteger,
  type BufferSource,
  type Crypto,
  crypto,
  type CryptoKey,
  type CryptoKeyPair,
  type EcdhKeyDeriveParams,
  type EcdsaParams,
  type EcKeyGenParams,
  type EcKeyImportParams,
  type HashAlgorithmIdentifier,
  type HkdfParams,
  type HmacImportParams,
  type HmacKeyGenParams,
  type JsonWebKey,
  type KeyAlgorithm,
  type KeyFormat,
  type KeyType,
  type KeyUsage,
  type NamedCurve,
  type Pbkdf2Params,
  type RsaHashedImportParams,
  type RsaHashedKeyGenParams,
  type RsaKeyGenParams,
  type RsaOaepParams,
  type RsaOtherPrimesInfo,
  type RsaPssParams,
  type SubtleCrypto,
} from "@deno/shim-crypto";
import { fetch, File, FormData, Headers, Request, Response } from "undici";
export {
  type BodyInit,
  fetch,
  File,
  FormData,
  Headers,
  type HeadersInit,
  type ReferrerPolicy,
  Request,
  type RequestCache,
  type RequestInit,
  type RequestMode,
  type RequestRedirect,
  Response,
  type ResponseInit,
} from "undici";

const dntGlobals = {
  Deno,
  crypto,
  fetch,
  File,
  FormData,
  Headers,
  Request,
  Response,
};
export const dntGlobalThis = createMergeProxy(globalThis, dntGlobals);

function createMergeProxy<T extends object, U extends object>(
  baseObj: T,
  extObj: U,
): Omit<T, keyof U> & U {
  return new Proxy(baseObj, {
    get(_target, prop, _receiver) {
      if (prop in extObj) {
        return (extObj as any)[prop];
      } else {
        return (baseObj as any)[prop];
      }
    },
    set(_target, prop, value) {
      if (prop in extObj) {
        delete (extObj as any)[prop];
      }
      (baseObj as any)[prop] = value;
      return true;
    },
    deleteProperty(_target, prop) {
      let success = false;
      if (prop in extObj) {
        delete (extObj as any)[prop];
        success = true;
      }
      if (prop in baseObj) {
        delete (baseObj as any)[prop];
        success = true;
      }
      return success;
    },
    ownKeys(_target) {
      const baseKeys = Reflect.ownKeys(baseObj);
      const extKeys = Reflect.ownKeys(extObj);
      const extKeysSet = new Set(extKeys);
      return [...baseKeys.filter((k) => !extKeysSet.has(k)), ...extKeys];
    },
    defineProperty(_target, prop, desc) {
      if (prop in extObj) {
        delete (extObj as any)[prop];
      }
      Reflect.defineProperty(baseObj, prop, desc);
      return true;
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (prop in extObj) {
        return Reflect.getOwnPropertyDescriptor(extObj, prop);
      } else {
        return Reflect.getOwnPropertyDescriptor(baseObj, prop);
      }
    },
    has(_target, prop) {
      return prop in extObj || prop in baseObj;
    },
  }) as any;
}
