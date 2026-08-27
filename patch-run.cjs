/**
 * Manual CLI entry for the platform patch — run it as
 * `node node_modules/dsh-compact-button/patch-run.cjs` to patch ahead of
 * the next dsh start (the host half self-heals on every start anyway; the
 * package ships no install scripts, so package managers never block or
 * warn about it). Kept apart from patch-context-meter.cjs so that module
 * stays a pure, side-effect-free import when the host half (lib/index.js)
 * bundles it.
 */
'use strict';

require('./patch-context-meter.cjs').main();
