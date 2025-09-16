/**
 * Based on [import-meta-ponyfill](https://github.com/gaubee/import-meta-ponyfill),
 * but instead of using npm to install additional dependencies,
 * this approach manually consolidates cjs/mjs/d.ts into a single file.
 *
 * Note that this code might be imported multiple times
 * (for example, both dnt.test.polyfills.ts and dnt.polyfills.ts contain this code;
 *  or Node.js might dynamically clear the cache and then force a require).
 * Therefore, it's important to avoid redundant writes to global objects.
 * Additionally, consider that commonjs is used alongside esm,
 * so the two ponyfill functions are stored independently in two separate global objects.
 */
//@ts-ignore
import { createRequire } from "node:module";
//@ts-ignore
import { fileURLToPath, pathToFileURL, type URL } from "node:url";
//@ts-ignore
import { dirname } from "node:path";
declare global {
  interface ImportMeta {
    /** A string representation of the fully qualified module URL. When the
     * module is loaded locally, the value will be a file URL (e.g.
     * `file:///path/module.ts`).
     *
     * You can also parse the string as a URL to determine more information about
     * how the current module was loaded. For example to determine if a module was
     * local or not:
     *
     * ```ts
     * const url = new URL(import.meta.url);
     * if (url.protocol === "file:") {
     *   console.log("this module was loaded locally");
     * }
     * ```
     */
    url: string;
    /**
     * A function that returns resolved specifier as if it would be imported
     * using `import(specifier)`.
     *
     * ```ts
     * console.log(import.meta.resolve("./foo.js"));
     * // file:///dev/foo.js
     * ```
     *
     * @param specifier The module specifier to resolve relative to `parent`.
     * @param parent The absolute parent module URL to resolve from.
     * @returns The absolute (`file:`) URL string for the resolved module.
     */
    resolve(specifier: string, parent?: string | URL | undefined): string;
    /** A flag that indicates if the current module is the main module that was
     * called when starting the program under Deno.
     *
     * ```ts
     * if (import.meta.main) {
     *   // this was loaded as the main module, maybe do some bootstrapping
     * }
     * ```
     */
    main: boolean;

    /** The absolute path of the current module.
     *
     * This property is only provided for local modules (ie. using `file://` URLs).
     *
     * Example:
     * ```
     * // Unix
     * console.log(import.meta.filename); // /home/alice/my_module.ts
     *
     * // Windows
     * console.log(import.meta.filename); // C:\alice\my_module.ts
     * ```
     */
    filename: string;

    /** The absolute path of the directory containing the current module.
     *
     * This property is only provided for local modules (ie. using `file://` URLs).
     *
     * * Example:
     * ```
     * // Unix
     * console.log(import.meta.dirname); // /home/alice
     *
     * // Windows
     * console.log(import.meta.dirname); // C:\alice
     * ```
     */
    dirname: string;
  }
}

type NodeRequest = ReturnType<typeof createRequire>;
type NodeModule = NonNullable<NodeRequest["main"]>;
interface ImportMetaPonyfillCommonjs {
  (require: NodeRequest, module: NodeModule): ImportMeta;
}
interface ImportMetaPonyfillEsmodule {
  (importMeta: ImportMeta): ImportMeta;
}
interface ImportMetaPonyfill
  extends ImportMetaPonyfillCommonjs, ImportMetaPonyfillEsmodule {
}

const defineGlobalPonyfill = (symbolFor: string, fn: Function) => {
  if (!Reflect.has(globalThis, Symbol.for(symbolFor))) {
    Object.defineProperty(
      globalThis,
      Symbol.for(symbolFor),
      {
        configurable: true,
        get() {
          return fn;
        },
      },
    );
  }
};

export let import_meta_ponyfill_commonjs = (
  Reflect.get(globalThis, Symbol.for("import-meta-ponyfill-commonjs")) ??
    (() => {
      const moduleImportMetaWM = new WeakMap<NodeModule, ImportMeta>();
      return (require, module) => {
        let importMetaCache = moduleImportMetaWM.get(module);
        if (importMetaCache == null) {
          const importMeta = Object.assign(Object.create(null), {
            url: pathToFileURL(module.filename).href,
            main: require.main == module,
            resolve: (specifier: string, parentURL = importMeta.url) => {
              return pathToFileURL(
                (importMeta.url === parentURL
                  ? require
                  : createRequire(parentURL))
                  .resolve(specifier),
              ).href;
            },
            filename: module.filename,
            dirname: module.path,
          });
          moduleImportMetaWM.set(module, importMeta);
          importMetaCache = importMeta;
        }
        return importMetaCache;
      };
    })()
) as ImportMetaPonyfillCommonjs;
defineGlobalPonyfill(
  "import-meta-ponyfill-commonjs",
  import_meta_ponyfill_commonjs,
);

export let import_meta_ponyfill_esmodule = (
  Reflect.get(globalThis, Symbol.for("import-meta-ponyfill-esmodule")) ??
    ((importMeta: ImportMeta) => {
      const resolveFunStr = String(importMeta.resolve);
      const shimWs = new WeakSet();
      //@ts-ignore
      const mainUrl = ("file:///" + process.argv[1].replace(/\\/g, "/"))
        .replace(
          /\/{3,}/,
          "///",
        );
      const commonShim = (importMeta: ImportMeta) => {
        if (typeof importMeta.main !== "boolean") {
          importMeta.main = importMeta.url === mainUrl;
        }
        if (typeof importMeta.filename !== "string") {
          importMeta.filename = fileURLToPath(importMeta.url);
          importMeta.dirname = dirname(importMeta.filename);
        }
      };
      if (
        // v16.2.0+, v14.18.0+: Add support for WHATWG URL object to parentURL parameter.
        resolveFunStr === "undefined" ||
        // v20.0.0+, v18.19.0+"" This API now returns a string synchronously instead of a Promise.
        resolveFunStr.startsWith("async")
        // enable by --experimental-import-meta-resolve flag
      ) {
        import_meta_ponyfill_esmodule = (importMeta: ImportMeta) => {
          if (!shimWs.has(importMeta)) {
            shimWs.add(importMeta);
            const importMetaUrlRequire = {
              url: importMeta.url,
              require: createRequire(importMeta.url),
            };
            importMeta.resolve = function resolve(
              specifier: string,
              parentURL = importMeta.url,
            ) {
              return pathToFileURL(
                (importMetaUrlRequire.url === parentURL
                  ? importMetaUrlRequire.require
                  : createRequire(parentURL)).resolve(specifier),
              ).href;
            };
            commonShim(importMeta);
          }
          return importMeta;
        };
      } else {
        /// native support
        import_meta_ponyfill_esmodule = (importMeta: ImportMeta) => {
          if (!shimWs.has(importMeta)) {
            shimWs.add(importMeta);
            commonShim(importMeta);
          }
          return importMeta;
        };
      }
      return import_meta_ponyfill_esmodule(importMeta);
    })
) as ImportMetaPonyfillEsmodule;
defineGlobalPonyfill(
  "import-meta-ponyfill-esmodule",
  import_meta_ponyfill_esmodule,
);

export let import_meta_ponyfill = (
  (...args: any[]) => {
    const _MODULE = (() => {
      if (typeof require === "function" && typeof module === "object") {
        return "commonjs";
      } else {
        // eval("typeof import.meta");
        return "esmodule";
      }
    })();
    if (_MODULE === "commonjs") {
      //@ts-ignore
      import_meta_ponyfill = (r, m) => import_meta_ponyfill_commonjs(r, m);
    } else {
      //@ts-ignore
      import_meta_ponyfill = (im) => import_meta_ponyfill_esmodule(im);
    }
    //@ts-ignore
    return import_meta_ponyfill(...args);
  }
) as ImportMetaPonyfill;
// taken from https://github.com/denoland/deno/blob/7281775381cda79ef61df27820387dc2c74e0384/cli/tsc/dts/lib.esnext.array.d.ts#L21
declare global {
  interface ArrayConstructor {
    fromAsync<T>(
        iterableOrArrayLike: AsyncIterable<T> | Iterable<T | Promise<T>> | ArrayLike<T | Promise<T>>,
    ): Promise<T[]>;
    
    fromAsync<T, U>(
        iterableOrArrayLike: AsyncIterable<T> | Iterable<T> | ArrayLike<T>, 
        mapFn: (value: Awaited<T>) => U, 
        thisArg?: any,
    ): Promise<Awaited<U>[]>;
  }
}

// From https://github.com/es-shims/array-from-async/blob/4a5ff83947b861f35b380d5d4f20da2f07698638/index.mjs
// Tried to have dnt depend on the package instead, but it distributes as an
// ES module, so doesn't work with CommonJS.
//
// Code below:
//
// Copyright 2021 J. S. Choi
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived from
//    this software without specific prior written permission.
//
// **This software is provided by the copyright holders and contributors
// "as is" and any express or implied warranties, including, but not
// limited to, the implied warranties of merchantability and fitness for a
// particular purpose are disclaimed. In no event shall the copyright
// holder or contributors be liable for any direct, indirect, incidental,
// special, exemplary, or consequential damages (including, but not limited
// to, procurement of substitute goods or services; loss of use, data, or
// profits; or business interruption) however caused and on any theory of
// liability, whether in contract, strict liability, or tort (including
// negligence or otherwise) arising in any way out of the use of this
// software, even if advised of the possibility of such damage.**

const { MAX_SAFE_INTEGER } = Number;
const iteratorSymbol = Symbol.iterator;
const asyncIteratorSymbol = Symbol.asyncIterator;
const IntrinsicArray = Array;
const tooLongErrorMessage =
  'Input is too long and exceeded Number.MAX_SAFE_INTEGER times.';

function isConstructor(obj: any) {
  if (obj != null) {
    const prox: any = new Proxy(obj, {
      construct () {
        return prox;
      },
    });
    try {
      new prox;
      return true;
    } catch (err) {
      return false;
    }
  } else {
    return false;
  }
}

async function fromAsync(this: any, items: any, mapfn: any, thisArg: any) {
  const itemsAreIterable = (
    asyncIteratorSymbol in items ||
    iteratorSymbol in items
  );

  if (itemsAreIterable) {
    const result = isConstructor(this)
      ? new this
      : IntrinsicArray(0);

    let i = 0;

    for await (const v of items) {
      if (i > MAX_SAFE_INTEGER) {
        throw TypeError(tooLongErrorMessage);
      }

      else if (mapfn) {
        result[i] = await mapfn.call(thisArg, v, i);
      }

      else {
        result[i] = v;
      }

      i ++;
    }

    result.length = i;
    return result;
  }

  else {
    // In this case, the items are assumed to be an arraylike object with
    // a length property and integer properties for each element.
    const { length } = items;
    const result = isConstructor(this)
      ? new this(length)
      : IntrinsicArray(length);

    let i = 0;

    while (i < length) {
      if (i > MAX_SAFE_INTEGER) {
        throw TypeError(tooLongErrorMessage);
      }

      const v = await items[i];

      if (mapfn) {
        result[i] = await mapfn.call(thisArg, v, i);
      }

      else {
        result[i] = v;
      }

      i ++;
    }

    result.length = i;
    return result;
  }
}

if (!Array.fromAsync) {
  (Array as any).fromAsync = fromAsync;
}

export {};// https://github.com/tc39/proposal-accessible-object-hasownproperty/blob/main/polyfill.js
if (!Object.hasOwn) {
  Object.defineProperty(Object, "hasOwn", {
    value: function (object: any, property: any) {
      if (object == null) {
        throw new TypeError("Cannot convert undefined or null to object");
      }
      return Object.prototype.hasOwnProperty.call(Object(object), property);
    },
    configurable: true,
    enumerable: false,
    writable: true,
  });
}

declare global {
  interface Object {
    /**
     * Determines whether an object has a property with the specified name.
     * @param o An object.
     * @param v A property name.
     */
    hasOwn(o: object, v: PropertyKey): boolean;
  }
}

export {};
