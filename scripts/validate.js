/**
 * Design token validation script.
 * Checks WCAG contrast ratios, circular references, and token consistency.
 *
 * Usage: node scripts/validate.js
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

let errors = 0;
let warnings = 0;

function log(level, msg) {
  if (level === 'error') { errors++; console.error(`  ERROR: ${msg}`); }
  else { warnings++; console.warn(`  WARN:  ${msg}`); }
}

// ─── Load all token files ───
function loadTokenFiles(dir) {
  const result = {};
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      Object.assign(result, loadTokenFiles(full));
    } else if (entry.endsWith('.json')) {
      result[full] = JSON.parse(readFileSync(full, 'utf-8'));
    }
  }
  return result;
}

// ─── Flatten token tree ───
function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && 'value' in v) {
      out[key] = v;
    } else if (v && typeof v === 'object') {
      Object.assign(out, flatten(v, key));
    }
  }
  return out;
}

// ─── WCAG luminance & contrast ───
function luminance(hex) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return null;
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const f = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Resolve references ───
function resolveValue(val, allTokens, visited = new Set()) {
  if (typeof val !== 'string') return val;
  const refMatch = val.match(/^\{(.+)\}$/);
  if (!refMatch) return val;
  const refKey = refMatch[1];
  if (visited.has(refKey)) {
    log('error', `Circular reference detected: ${[...visited, refKey].join(' -> ')}`);
    return null;
  }
  visited.add(refKey);
  if (!allTokens[refKey]) return val;
  return resolveValue(allTokens[refKey].value, allTokens, visited);
}

// ─── Main ───
console.log('Validating design tokens...\n');

const tokenFiles = loadTokenFiles('tokens');
const allTokens = {};
for (const [file, data] of Object.entries(tokenFiles)) {
  Object.assign(allTokens, flatten(data));
}

console.log(`Found ${Object.keys(allTokens).length} tokens across ${Object.keys(tokenFiles).length} files.\n`);

// 1. Check for circular references
console.log('1. Checking for circular references...');
for (const [key, token] of Object.entries(allTokens)) {
  resolveValue(token.value, allTokens, new Set([key]));
}
if (errors === 0) console.log('   All clear.\n');

// 2. Check for unresolved references
console.log('2. Checking for unresolved references...');
const unresolvedBefore = errors;
for (const [key, token] of Object.entries(allTokens)) {
  const val = `${token.value}`;
  const refs = val.match(/\{([^}]+)\}/g);
  if (refs) {
    for (const ref of refs) {
      const refKey = ref.slice(1, -1);
      if (!allTokens[refKey]) {
        log('warn', `${key} references "${refKey}" which does not exist`);
      }
    }
  }
}
if (errors === unresolvedBefore && warnings === 0) console.log('   All clear.\n');
else console.log('');

// 3. WCAG contrast checks
console.log('3. Checking WCAG AA contrast ratios...');
const textTokens = Object.entries(allTokens).filter(([k]) => k.match(/^color\.text\./));
const bgTokens = Object.entries(allTokens).filter(([k]) => k.match(/^color\.bg\.(base|surface)$/));

for (const [textKey, textToken] of textTokens) {
  if (textKey.includes('disabled') || textKey.includes('inverse') || textKey.includes('on-dark')) continue;
  const fgResolved = resolveValue(textToken.value, allTokens);
  if (!fgResolved || !fgResolved.startsWith('#')) continue;

  for (const [bgKey, bgToken] of bgTokens) {
    const bgResolved = resolveValue(bgToken.value, allTokens);
    if (!bgResolved || !bgResolved.startsWith('#')) continue;

    const ratio = contrastRatio(fgResolved, bgResolved);
    if (ratio !== null && ratio < 4.5) {
      log('error', `${textKey} (${fgResolved}) on ${bgKey} (${bgResolved}) → ${ratio.toFixed(2)}:1 (needs ≥ 4.5:1)`);
    }
  }
}
console.log('');

// 4. Check for duplicate values across semantic tokens pointing to same primitive
console.log('4. Checking for potential naming inconsistencies...');
const colorTokens = Object.entries(allTokens).filter(([k]) => k.startsWith('color.'));
const valueMap = {};
for (const [key, token] of colorTokens) {
  const resolved = resolveValue(token.value, allTokens);
  if (resolved && resolved.startsWith('#')) {
    if (!valueMap[resolved]) valueMap[resolved] = [];
    valueMap[resolved].push(key);
  }
}
for (const [val, keys] of Object.entries(valueMap)) {
  if (keys.length > 3) {
    log('warn', `Color ${val} is used by ${keys.length} tokens: ${keys.slice(0, 4).join(', ')}...`);
  }
}
console.log('');

// Summary
console.log('─'.repeat(40));
if (errors > 0) {
  console.error(`FAILED: ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
} else {
  console.log(`PASSED: 0 errors, ${warnings} warning(s)`);
}
