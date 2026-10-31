/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ingest from "../ingest.js";
import type * as knowledge from "../knowledge.js";
import type * as lib from "../lib.js";
import type * as outbox from "../outbox.js";
import type * as paths from "../paths.js";
import type * as progress from "../progress.js";
import type * as registry from "../registry.js";
import type * as seed from "../seed.js";
import type * as sops from "../sops.js";
import type * as team from "../team.js";
import type * as training from "../training.js";
import type * as util from "../util.js";
import type * as vision from "../vision.js";
import type * as voice from "../voice.js";
import type * as workers from "../workers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ingest: typeof ingest;
  knowledge: typeof knowledge;
  lib: typeof lib;
  outbox: typeof outbox;
  paths: typeof paths;
  progress: typeof progress;
  registry: typeof registry;
  seed: typeof seed;
  sops: typeof sops;
  team: typeof team;
  training: typeof training;
  util: typeof util;
  vision: typeof vision;
  voice: typeof voice;
  workers: typeof workers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
