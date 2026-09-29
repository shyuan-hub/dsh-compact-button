/**
 * Platform patch shipped with dsh-compact-button (pure module — no side
 * effects on require).
 *
 * The official @deepseek-ai/dsh-client-ui-conversation bundle does NOT
 * declare the `conversation.context.actions` slot on its ContextMeter
 * panel (verified against the published artifact and the deepseek-harness
 * source), so this plugin registers into a slot that never appears. This
 * module patches the installed ui-conversation client bundle in place to
 * declare and render it:
 *
 *   1) css class map gains the panel actions footer class,
 *   2) ContextMeter receives the slot renderer from InputBar,
 *   3) the panel footer renders `conversation.context.actions`,
 *   4) InputBar passes its renderSlot into the ContextMeter,
 *   5) the composer.bar children table declares the list slot.
 *
 * Version strategy (why this module carries no version pin):
 *   - anchors are semantic REGEXES, not literal source quotes: they match
 *     across indentation, quoting, `var`/`let`/`const`, minification of
 *     the css-module hash (the class prefix is captured from the `bar`
 *     entry, never hardcoded) and helper renames, so a reformat or a
 *     rebuild upstream does not break them;
 *   - every replacement still asserts it matches exactly once; any drift
 *     aborts without writing (the host bundle stays untouched and the
 *     plugin degrades to "slot absent → button not rendered"),
 *   - an already-patched file is detected by marker and skipped, so the
 *     host-half self-heal and a manual CLI run are both idempotent.
 *
 * The package therefore declares no DSH peer dependency: the plugin
 * resolves nothing from the platform at runtime (services arrive through
 * cordis injection), so package managers must not pin or duplicate
 * platform packages on its behalf. `TESTED_PLATFORMS` below is
 * documentation-only — it drives the startup log line that tells the user
 * whether the detected platform version was exercised in CI.
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

/** Platform releases this plugin has been exercised against (documentation
 *  only — drives the startup log, never gates the patch). */
const TESTED_PLATFORMS = ['0.1.2-rc.1', '0.1.5-rc.1', '0.1.5-rc.2', '0.1.5-rc.3', '0.1.7-alpha.2', '0.1.7-rc.1', '0.1.7-rc.2'];

/** Marker present only after replacement 3 has been applied. */
const PATCHED_MARKER = 'renderSlot("conversation.context.actions"';

/**
 * The replacements, applied in order. Each entry carries:
 *   - `re`: the semantic anchor (whitespace / quoting / hash agnostic),
 *   - `replacement`: the replacement text (may use `$1`-style groups),
 *   - `example`: one concrete literal snippet the anchor must match —
 *     the test suite builds a synthetic pristine bundle out of these, so
 *     an anchor that stops matching its own example fails CI loudly.
 */
const REPLACEMENTS = [
  {
    label: 'css class map',
    // The css-module class map. The hashed prefix is captured from the
    // `bar` entry so a rebuild that rehashes the module cannot drift us;
    // the injected `actions` class simply follows the same prefix.
    re: /((?:var|let|const)\s+ContextMeter_module_css_default\s*=\s*\{\s*)"?bar"?\s*:\s*"([A-Za-z0-9_]+)_bar"/,
    replacement: '$1"actions": "$2_actions",\n\t\t\t"bar": "$2_bar"',
    example: '\t\tvar ContextMeter_module_css_default = {\n\t\t\t"bar": "JObwrW_bar",',
  },
  {
    label: 'ContextMeter signature',
    // ContextMeter gains the renderSlot prop.
    re: /\bfunction\s+ContextMeter\s*\(\s*\{\s*useProjection\s*,\s*t\s*\}\s*\)/,
    replacement: 'function ContextMeter({ useProjection, t, renderSlot })',
    example: 'function ContextMeter({ useProjection, t }) {',
  },
  {
    label: 'panel actions footer',
    // After the breakdown <dl> closes, append the actions footer element to
    // the panel's children array. `}, row.key))` is the tail of the last
    // array element; the patch must add the comma before injecting, or the
    // bundle stops parsing ("loaded without registering" client-side).
    re: /(\},\s*row\.key\)\)\s*\}\))(\s*\])/,
    replacement: '$1,\n' +
      '\t\t\t\t\t\trenderSlot === void 0 ? null : (0, react_jsx_runtime.jsx)("div", {\n' +
      '\t\t\t\t\t\t\tclassName: ContextMeter_module_css_default.actions,\n' +
      '\t\t\t\t\t\t\tchildren: renderSlot("conversation.context.actions", {})\n' +
      '\t\t\t\t\t\t})\n' +
      '$2',
    example: '\t\t\t\t\t\t\t}, row.key))\n\t\t\t\t\t\t})\n\t\t\t\t\t]',
  },
  {
    label: 'ContextMeter call site',
    // InputBar forwards its renderSlot. The jsx helper specifier is matched
    // generically (`[\w$.]+`) so a bundler rename does not drift us.
    re: /(\(\s*0\s*,\s*[\w$.]+\s*\)\s*\(\s*ContextMeter\s*,\s*\{\s*useProjection\s*,\s*t)(\s*\})/,
    replacement: '$1, renderSlot$2',
    example: '\t\t\t\t\t\t\t\t\t\t(0, react_jsx_runtime.jsx)(ContextMeter, {\n\t\t\t\t\t\t\t\t\t\t\tuseProjection,\n\t\t\t\t\t\t\t\t\t\t\tt\n\t\t\t\t\t\t\t\t\t\t}),',
  },
  {
    label: 'composer.bar children table',
    // Declare the list slot as a child of conversation.composer.bar.
    re: /("conversation\.composer\.dock"\s*:\s*\{\s*kind\s*:\s*"list"\s*,\s*scope\s*:\s*"session"\s*\})(\s*\},)/,
    replacement: '$1,\n' +
      '\t\t\t\t\t"conversation.context.actions": {\n' +
      '\t\t\t\t\t\tkind: "list",\n' +
      '\t\t\t\t\t\tscope: "session-maybe"\n' +
      '\t\t\t\t\t}$2',
    example: '\t\t\t\t\t"conversation.composer.dock": {\n\t\t\t\t\t\tkind: "list",\n\t\t\t\t\t\tscope: "session"\n\t\t\t\t\t}\n\t\t\t\t},',
  },
];

/** Count how many times an anchor matches, without disturbing lastIndex.
 *  @param src - the source text.
 *  @param re - the anchor (non-global is fine; a fresh global copy is used).
 *  @returns the match count.
 */
function countMatches(src, re) {
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)
  return (src.match(global) || []).length
}

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
  for (const { label, re, replacement } of REPLACEMENTS) {
    const count = countMatches(out, re);
    if (count !== 1) return { status: 'drift', label, count };
    out = out.replace(re, replacement);
  }
  return { status: 'patched', output: out };
}

/** How far findTargetFiles climbs above each start directory. */
const MAX_CLIMB = 12;

/** Name of the env var that relocates the harness home off `~/.dsh`. */
const DSH_HOME_ENV = 'DSH_HOME';

/**
 * Expand a leading `~` to the OS home directory (mirrors the platform's
 * `expandHomePath`): `~` → home, `~/x` or `~\x` → home + `x`, anything
 * else returned unchanged.
 * @param p - the raw path value.
 * @returns the expanded path.
 */
function expandHomePath(p) {
  if (p === '~') return os.homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(os.homedir(), p.slice(2));
  return p;
}

/** The default harness home when nothing overrides it: `~/.dsh`.
 *  @returns the un-resolved default home path.
 */
function defaultDshHome() {
  return path.join(os.homedir(), '.dsh');
}

/** A home override counts as set only when it is a non-blank string; a
 *  missing, non-string, empty or whitespace-only value counts as unset.
 *  @param value - the raw override value.
 *  @returns the value when usable, `undefined` otherwise.
 */
function usableHome(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

/**
 * Resolve the effective DSH harness home, mirroring the platform's
 * `resolveDshHome(configured, env)` precedence, highest first:
 *   1. `configured` — the explicit harness-home override (what the
 *      platform passes down as `config.dshHome` to its home-aware
 *      services, and what this package's CLI takes as `--dsh-home`),
 *   2. a non-blank `$DSH_HOME`,
 *   3. the default `~/.dsh`.
 * A leading `~` is expanded on either override, and the result is
 * absolute. A blank/whitespace-only override of *either* kind counts as
 * unset — one deliberate divergence from the platform, which uses `??` and
 * would let an empty `configured` resolve the home to the cwd; for a
 * patcher that writes into the tree it is safer to fall through than to
 * start probing the current directory.
 *
 * This is what lets the plugin follow a user who moved their harness home
 * (e.g. `DSH_HOME=D:\AppData\DSH`): probing only `os.homedir()/.dsh` would
 * miss the relocated `profiles` tree and the buttons would never render.
 * @param configured - explicit harness-home override (highest precedence).
 *   For backwards compatibility an object here is read as `env`.
 * @param env - environment mapping to read `DSH_HOME` from (default: process.env).
 * @returns the normalized absolute harness home path.
 */
function resolveDshHome(configured, env) {
  if (configured !== null && typeof configured === 'object') {
    env = configured;
    configured = undefined;
  }
  const fromEnv = (env || process.env)[DSH_HOME_ENV];
  const home = usableHome(configured) !== undefined ? configured
    : usableHome(fromEnv) !== undefined ? fromEnv
      : defaultDshHome();
  return path.resolve(expandHomePath(home));
}

/**
 * The harness homes worth probing, in precedence order, de-duplicated.
 *
 * The platform resolves its *profiles* tree from `$DSH_HOME`/default while
 * `config.dshHome` is a per-service override, so the two can legitimately
 * point at different roots in one deployment. Narrowing the probe to the
 * explicit home alone would then lose the `$DSH_HOME` install that issue #4
 * was about — so discovery unions both, and the explicit home merely comes
 * first. Patching is idempotent, so an overlapping pair costs nothing.
 * @param configured - explicit harness-home override.
 * @param env - environment mapping to read `DSH_HOME` from (default: process.env).
 * @returns one or two distinct absolute home paths.
 */
function dshHomesToProbe(configured, env) {
  const homes = [resolveDshHome(configured, env)];
  const fromEnv = resolveDshHome(undefined, env);
  if (!homes.includes(fromEnv)) homes.push(fromEnv);
  return homes;
}

/**
 * Locate installed ui-conversation client bundles.
 *
 * Two strategies, unioned and de-duplicated by realpath:
 * 1. climb from each start directory and probe `<dir>/<TARGET_REL>` —
 *    covers the plugin sitting in a profile workspace next to (or above)
 *    the platform packages, npm flat layouts and pnpm .pnpm nests alike;
 * 2. probe the harness profile roots `<home>/profiles` and
 *    `<home>/profiles/<name>` for every home from {@link dshHomesToProbe}
 *    (explicit override, `$DSH_HOME`, then `~/.dsh`) — covers the
 *    host-half self-heal, where the process cwd and the plugin's on-disk
 *    home tell us nothing.
 *
 * Symlinks are resolved so a pnpm/npm link writes the real store file.
 * @param startDirs - directories to climb from (default: cwd).
 * @param configuredHome - explicit harness-home override forwarded to the
 *   standard-root probe (highest precedence there too).
 * @returns existing target file paths (may be empty).
 */
function findTargetFiles(startDirs, configuredHome) {
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
  for (const home of dshHomesToProbe(configuredHome)) {
    const profilesRoot = path.join(home, 'profiles');
    probes.push(path.join(profilesRoot, TARGET_REL));
    let names = [];
    try {
      names = fs.readdirSync(profilesRoot);
    } catch {
      /* no <home>/profiles — that standard root simply yields nothing */
    }
    for (const name of names) {
      probes.push(path.join(profilesRoot, name, TARGET_REL));
    }
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
 * Read the installed platform package version owning a patched target file
 * (`<pkg>/lib/client.js` → `<pkg>/package.json`). Best effort: an
 * unreadable or malformed manifest just means "version unknown", which
 * never blocks the patch.
 * @param file - absolute path of a ui-conversation lib/client.js.
 * @returns the version string, or undefined when unknown.
 */
function detectPlatformVersion(file) {
  try {
    const manifest = path.resolve(path.dirname(file), '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : undefined;
  } catch {
    return undefined;
  }
}

/** Whether a detected version is one this plugin was exercised against.
 *  @param version - the detected platform version (may be undefined).
 *  @returns true when tested, false when untested/unknown.
 */
function isTestedPlatform(version) {
  return version !== undefined && TESTED_PLATFORMS.includes(version);
}

/**
 * Patch one file in place (idempotent).
 * @param file - absolute path of a ui-conversation lib/client.js.
 * @returns `{ status: 'patched'|'already'|'drift'|'error', file, version,
 *   tested, label?, count?, error? }` — drift leaves the file untouched.
 */
function patchFile(file) {
  const version = detectPlatformVersion(file);
  const tested = isTestedPlatform(version);
  try {
    const src = fs.readFileSync(file, 'utf8');
    const result = patchSource(src);
    if (result.status === 'patched') fs.writeFileSync(file, result.output);
    return { status: result.status, file, version, tested, label: result.label, count: result.count };
  } catch (error) {
    return { status: 'error', file, version, tested, error };
  }
}

/**
 * Discover and patch every installed target.
 * @param startDirs - climb origins forwarded to findTargetFiles.
 * @param configuredHome - explicit harness-home override (highest home
 *   precedence; the `$DSH_HOME` home is still probed as well).
 * @returns one result per discovered target file.
 */
function patchInstalledTargets(startDirs, configuredHome) {
  return findTargetFiles(startDirs, configuredHome).map(patchFile);
}

/**
 * Parse the flags the manual CLI understands.
 * @param argv - argument list (typically `process.argv.slice(2)`).
 * @returns `{ configuredHome }` — the `--dsh-home <path>` / `--dsh-home=<path>`
 *   value, or `undefined` when the flag is absent.
 */
function parseCliArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const FLAG = '--dsh-home';
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = arg === FLAG ? args[i + 1]
      : arg.startsWith(`${FLAG}=`) ? arg.slice(FLAG.length + 1) : undefined;
    if (usableHome(value)) return { configuredHome: value };
  }
  return {};
}

/**
 * One human-readable line describing a patch outcome (shared by the host
 * half's console output and the CLI).
 * @param r - a patchFile() result.
 * @returns the log line.
 */
function describeResult(r) {
  const where = `${r.file}${r.version ? ` @${r.version}` : ''}`;
  const note = r.version && !r.tested ? ' (not in the tested set — anchors still decide)' : '';
  if (r.status === 'patched') return `platform patch applied: ${where}${note}`;
  if (r.status === 'already') return `already patched: ${where}${note}`;
  if (r.status === 'drift') {
    return `platform patch skipped (${where}): "${r.label}" matched ${r.count} time(s), expected 1 — `
      + 'the context-meter buttons will not render until the platform declares the slot itself';
  }
  return `platform patch skipped (${where}): ${r.error && r.error.message}`;
}

/**
 * CLI entry (manual run). Never exits non-zero: a missing or drifted
 * platform bundle degrades to "button not rendered" (the plugin's
 * documented behavior for an absent slot) and must not break the run.
 * @param startDirs - climb origins (defaults to this script's directory
 *   plus cwd, which for an installed plugin package locate the profile).
 * @param options - `{ configuredHome }`: explicit harness home to probe
 *   first, on top of `$DSH_HOME` and `~/.dsh`.
 */
function main(startDirs, options) {
  const origins = startDirs && startDirs.length > 0 ? startDirs : [__dirname, process.cwd()];
  const configuredHome = options && options.configuredHome;
  const results = patchInstalledTargets(origins, configuredHome);
  if (results.length === 0) {
    console.warn('[dsh-compact-button patch] no @deepseek-ai/dsh-client-ui-conversation install found; the context-meter buttons will not render until it is present');
    console.warn(`[dsh-compact-button patch] homes probed: ${dshHomesToProbe(configuredHome).join(', ')} — point at a relocated harness with --dsh-home <path> or $${DSH_HOME_ENV}`);
    return;
  }
  for (const r of results) {
    const line = describeResult(r);
    if (r.status === 'patched' || r.status === 'already') console.log(`[dsh-compact-button patch] ${line}`);
    else console.warn(`[dsh-compact-button patch] ${line}`);
  }
}

module.exports = {
  REPLACEMENTS,
  PATCHED_MARKER,
  TESTED_PLATFORMS,
  DSH_HOME_ENV,
  defaultDshHome,
  expandHomePath,
  resolveDshHome,
  dshHomesToProbe,
  parseCliArgs,
  patchSource,
  countMatches,
  detectPlatformVersion,
  isTestedPlatform,
  findTargetFiles,
  patchFile,
  patchInstalledTargets,
  describeResult,
  main,
};
