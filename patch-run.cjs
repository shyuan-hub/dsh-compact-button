/**
 * CLI entry for the platform patch — invoked from the package postinstall
 * hook. Kept apart from patch-context-meter.cjs so that module stays a
 * pure, side-effect-free import when the host half (lib/index.js) bundles
 * it. The patch itself never fails the install (see main() in
 * patch-context-meter.cjs).
 */
'use strict';

require('./patch-context-meter.cjs').main();
