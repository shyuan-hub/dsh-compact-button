/**
 * Platform patch shipped with dsh-compact-button (pure module — no side
 * effects on require).
 *
 * The official @deepseek-ai/dsh-client-ui-conversation@0.1.2-alpha.2 bundle
 * does NOT declare the `conversation.context.actions` slot on its
 * ContextMeter panel (verified against the published artifact and the
 * deepseek-harness source), so this plugin registers into a slot that
 * never appears. This module patches the installed ui-conversation client
 * bundle in place to declare and render it:
 *
 *   1) css class map gains the panel actions footer class,
 *   2) ContextMeter receives the slot renderer from InputBar,
 *   3) the panel footer renders `conversation.context.actions`,
 *   4) InputBar passes its renderSlot into the ContextMeter,
 *   5) the composer.bar children table declares the list slot.
 *
 * Safety model (carried over from the original one-shot patch):
 *   - every replacement asserts it matches exactly once; any drift aborts
 *     without writing (the host bundle stays untouched and the plugin
 *     degrades to "slot absent → button not rendered"),
 *   - an already-patched file is detected by marker and skipped, so the
 *     host-half self-heal and a manual CLI run are both idempotent.
 *
 * Entry points:
 *   - the host half (lib/index.js apply) calls patchInstalledTargets() on
 *     every dsh start, so a platform reinstall that restores the pristine
 *     bundle heals itself on the next start,
 *   - patch-run.cjs (manual CLI) patches ahead of the next dsh start.
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** Relative path of the patch target inside its package. */
const TARGET_REL = path.join('node_modules', '@deepseek-ai', 'dsh-client-ui-conversation', 'lib', 'client.js');

/** Marker present only after replacement 3 has been applied. */
const PATCHED_MARKER = 'renderSlot("conversation.context.actions"';

/** The replacements, applied in order. Tab-indented to match the rc2 bundle
 *  layout exactly — any upstream formatting drift trips the match-count
 *  assertion instead of producing a half-patched file. */
const REPLACEMENTS = [
  {
    label: 'css class map',
    old: '\t\tvar ContextMeter_module_css_default = {\n\t\t\t"bar": "JObwrW_bar",',
    replacement: '\t\tvar ContextMeter_module_css_default = {\n\t\t\t"actions": "JObwrW_actions",\n\t\t\t"bar": "JObwrW_bar",',
  },
  {
    label: 'ContextMeter signature',
    old: 'function ContextMeter({ useProjection, t }) {',
    replacement: 'function ContextMeter({ useProjection, t, renderSlot }) {',
  },
  {
    label: 'panel actions footer',
    old: '\t\t\t\t\t\t\t}, row.key))\n\t\t\t\t\t\t})\n\t\t\t\t\t]\n\t\t\t\t})]\n\t\t\t});',
    replacement: '\t\t\t\t\t\t\t}, row.key))\n\t\t\t\t\t\t}),\n' +
      '\t\t\t\t\t\trenderSlot === void 0 ? null : (0, react_jsx_runtime.jsx)("div", {\n' +
      '\t\t\t\t\t\t\tclassName: ContextMeter_module_css_default.actions,\n' +
      '\t\t\t\t\t\t\tchildren: renderSlot("conversation.context.actions", {})\n' +
      '\t\t\t\t\t\t})\n' +
      '\t\t\t\t\t]\n\t\t\t\t})]\n\t\t\t});',
  },
  {
    label: 'ContextMeter call site',
    old: '\t\t\t\t\t\t\t\t\t\t(0, react_jsx_runtime.jsx)(ContextMeter, {\n\t\t\t\t\t\t\t\t\t\t\tuseProjection,\n\t\t\t\t\t\t\t\t\t\t\tt\n\t\t\t\t\t\t\t\t\t\t}),',
    replacement: '\t\t\t\t\t\t\t\t\t\t(0, react_jsx_runtime.jsx)(ContextMeter, {\n\t\t\t\t\t\t\t\t\t\t\tuseProjection,\n\t\t\t\t\t\t\t\t\t\t\tt,\n\t\t\t\t\t\t\t\t\t\t\trenderSlot\n\t\t\t\t\t\t\t\t\t\t}),',
  },
  {
    label: 'composer.bar children table',
    old: '\t\t\t\t\t"conversation.input.model": {\n\t\t\t\t\t\tkind: "single",\n\t\t\t\t\t\tscope: "session"\n\t\t\t\t\t}\n\t\t\t\t},',
    replacement: '\t\t\t\t\t"conversation.input.model": {\n\t\t\t\t\t\tkind: "single",\n\t\t\t\t\t\tscope: "session"\n\t\t\t\t\t},\n' +
      '\t\t\t\t\t"conversation.context.actions": {\n\t\t\t\t\t\tkind: "list",\n\t\t\t\t\t\tscope: "session-maybe"\n\t\t\t\t\t}\n' +
      '\t\t\t\t},',
  },
];

/**
 * Apply the patch to one source text (pure).
 * @param src - the whole client.js content.
 * @returns `{ status: 'already' }` when the marker shows the file is
 *   patched; `{ status: 'drift', label, count }` when some replacement
 *   does not match exactly once (nothing applied); `{ status: 'patched',
 *   output }` with the patched text otherwise.
 */
function patchSource(src) {
  if (src.includes(PATCHED_MARKER)) return { status: 'already' };
  let out = src;
  for (const { label, old, replacement } of REPLACEMENTS) {
    const count = out.split(old).length - 1;
    if (count !== 1) return { status: 'drift', label, count };
    out = out.replace(old, replacement);
  }
  return { status: 'patched', output: out };
}

/** How far findTargetFiles climbs above each start directory. */
const MAX_CLIMB = 12;

/**
 * Locate installed ui-conversation client bundles.
 *
 * Two strategies, unioned and de-duplicated by realpath:
 * 1. climb from each start directory and probe `<dir>/<TARGET_REL>` —
 *    covers the plugin sitting in a profile workspace next to (or above)
 *    the platform packages, npm flat layouts and pnpm .pnpm nests alike;
 * 2. probe the standard profile roots `~/.dsh/profiles` and
 *    `~/.dsh/profiles/<name>` — covers the host-half self-heal, where the
 *    process cwd and the plugin's on-disk home tell us nothing.
 *
 * Symlinks are resolved so a pnpm/npm link writes the real store file.
 * @param startDirs - directories to climb from (default: cwd).
 * @returns existing target file paths (may be empty).
 */
function findTargetFiles(startDirs) {
  const probes = [];
  const climbFrom = [...(startDirs && startDirs.length > 0 ? startDirs : [process.cwd()])];
  for (const start of climbFrom) {
    let dir = path.resolve(start);
    for (let i = 0; i < MAX_CLIMB; i++) {
      probes.push(path.join(dir, TARGET_REL));
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  const profilesRoot = path.join(os.homedir(), '.dsh', 'profiles');
  probes.push(path.join(profilesRoot, TARGET_REL));
  let names = [];
  try {
    names = fs.readdirSync(profilesRoot);
  } catch {
    /* no ~/.dsh/profiles — standard roots simply yield nothing */
  }
  for (const name of names) {
    probes.push(path.join(profilesRoot, name, TARGET_REL));
  }
  const seen = new Set();
  const found = [];
  for (const probe of probes) {
    let real;
    try {
      real = fs.realpathSync(probe);
    } catch {
      continue; // probe path absent
    }
    if (seen.has(real)) continue;
    seen.add(real);
    found.push(real);
  }
  return found;
}

/**
 * Patch one file in place (idempotent).
 * @param file - absolute path of a ui-conversation lib/client.js.
 * @returns `{ status: 'patched'|'already'|'drift'|'error', file, label?,
 *   count?, error? }` — drift leaves the file untouched.
 */
function patchFile(file) {
  try {
    const src = fs.readFileSync(file, 'utf8');
    const result = patchSource(src);
    if (result.status === 'patched') fs.writeFileSync(file, result.output);
    return { status: result.status, file, label: result.label, count: result.count };
  } catch (error) {
    return { status: 'error', file, error };
  }
}

/**
 * Discover and patch every installed target.
 * @param startDirs - climb origins forwarded to findTargetFiles.
 * @returns one result per discovered target file.
 */
function patchInstalledTargets(startDirs) {
  return findTargetFiles(startDirs).map(patchFile);
}

/**
 * CLI entry (manual run). Never exits non-zero: a missing or drifted
 * platform bundle degrades to "button not rendered" (the plugin's
 * documented behavior for an absent slot) and must not break the run.
 * @param startDirs - climb origins (defaults to this script's directory
 *   plus cwd, which for an installed plugin package locate the profile).
 */
function main(startDirs) {
  const origins = startDirs && startDirs.length > 0 ? startDirs : [__dirname, process.cwd()];
  const results = patchInstalledTargets(origins);
  if (results.length === 0) {
    console.warn('[dsh-compact-button patch] no @deepseek-ai/dsh-client-ui-conversation install found; the context-meter buttons will not render until it is present');
    return;
  }
  for (const r of results) {
    if (r.status === 'patched') console.log(`[dsh-compact-button patch] patched ${r.file}`);
    else if (r.status === 'already') console.log(`[dsh-compact-button patch] already patched ${r.file}`);
    else if (r.status === 'drift') console.warn(`[dsh-compact-button patch] skipped ${r.file}: "${r.label}" matched ${r.count} time(s), expected 1 — platform bundle drifted, buttons will not render`);
    else console.warn(`[dsh-compact-button patch] skipped ${r.file}: ${r.error && r.error.message}`);
  }
}

module.exports = { REPLACEMENTS, PATCHED_MARKER, patchSource, findTargetFiles, patchFile, patchInstalledTargets, main };
