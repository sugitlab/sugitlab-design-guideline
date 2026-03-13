import StyleDictionary from 'style-dictionary';
import { fileHeader, formattedVariables } from 'style-dictionary/utils';

// ─── Custom format: CSS dark mode wrapper ───
StyleDictionary.registerFormat({
  name: 'css/dark-variables',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file });
    const vars = formattedVariables({ format: 'css', dictionary, outputReferences: false })
      .split('\n').map(line => line ? '    ' + line : line).join('\n');
    return (
      header +
      '@media (prefers-color-scheme: dark) {\n  :root {\n' + vars + '\n  }\n}\n\n' +
      '[data-theme="dark"],\n.dark {\n' + vars + '\n}\n'
    );
  },
});

// ─── Helper: detect token type ───
function tokenType(token) {
  const val = `${token.value}`;
  if (val.startsWith('#') || val.startsWith('rgba') || val.startsWith('hsla')) return 'color';
  if (/^\d+(\.\d+)?(px|dp|sp|rem|em|pt)$/.test(val)) return 'dimension';
  if (/^\d+(\.\d+)?$/.test(val) && !val.includes(' ')) return 'number';
  return 'string';
}

// ─── Helper: HEX to UIColor ───
function hexToUIColor(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return `UIColor(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)}, alpha: 1.0)`;
}

// ─── Custom format: Swift enum (typed) ───
StyleDictionary.registerFormat({
  name: 'ios-swift/enum',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file });
    const lines = dictionary.allTokens.map((token) => {
      const name = token.name.replace(/-/g, '_');
      const val = `${token.value}`;
      const type = tokenType(token);
      if (type === 'color' && val.startsWith('#') && (val.length === 7 || val.length === 4)) {
        return `    static let ${name} = ${hexToUIColor(val)}`;
      }
      if (type === 'dimension') {
        const num = parseFloat(val);
        return `    static let ${name}: CGFloat = ${num}`;
      }
      if (type === 'number') {
        const num = parseFloat(val);
        if (Number.isInteger(num)) return `    static let ${name}: Int = ${num}`;
        return `    static let ${name}: CGFloat = ${num}`;
      }
      return `    static let ${name} = "${val}"`;
    });
    return (
      header +
      'import UIKit\n\nenum DesignTokens {\n' +
      lines.join('\n') +
      '\n}\n'
    );
  },
});

// ─── Helper: HEX to Android ARGB ───
function hexToArgb(hex) {
  const h = hex.replace('#', '');
  return `#FF${h.toUpperCase()}`;
}

// ─── Custom format: Android XML resources (typed) ───
StyleDictionary.registerFormat({
  name: 'android/xml-resources',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file });
    const lines = dictionary.allTokens.map((token) => {
      const name = token.name.replace(/-/g, '_');
      const val = `${token.value}`;
      const type = tokenType(token);
      const escaped = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (type === 'color' && val.startsWith('#') && (val.length === 7 || val.length === 4)) {
        return `    <color name="${name}">${hexToArgb(val)}</color>`;
      }
      if (type === 'dimension') {
        const num = parseFloat(val);
        const unit = val.replace(/[\d.]/g, '');
        const androidUnit = (unit === 'px' || unit === 'rem' || unit === 'em') ? 'dp' : unit;
        return `    <dimen name="${name}">${num}${androidUnit}</dimen>`;
      }
      if (type === 'number') {
        return `    <integer name="${name}">${parseInt(val, 10)}</integer>`;
      }
      return `    <string name="${name}">${escaped}</string>`;
    });
    return (
      header +
      '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n' +
      lines.join('\n') +
      '\n</resources>\n'
    );
  },
});

// ─── Custom format: TypeScript const object ───
StyleDictionary.registerFormat({
  name: 'typescript/const',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file });
    const tokens = {};
    dictionary.allTokens.forEach((token) => {
      const key = token.name.replace(/-/g, '_');
      tokens[key] = token.value;
    });
    return (
      header +
      'export const tokens = ' +
      JSON.stringify(tokens, null, 2) +
      ' as const;\n\n' +
      'export type TokenName = keyof typeof tokens;\n' +
      'export type CSSCustomProperty = `--${string}`;\n'
    );
  },
});

// ─── Helper: map token category to Tailwind theme key ───
const tailwindCategoryMap = {
  breakpoint: 'screens',
  color:      'colors',
  shadow:     'boxShadow',
  radius:     'borderRadius',
  space:      'spacing',
  opacity:    'opacity',
  z:          'zIndex',
  font:       'fontFamily',
  text:       'fontSize',
  weight:     'fontWeight',
  leading:    'lineHeight',
  tracking:   'letterSpacing',
  duration:   'transitionDuration',
  ease:       'transitionTimingFunction',
};

// ─── Helper: build Tailwind theme object from tokens ───
function buildTailwindTheme(dictionary) {
  const theme = {};
  dictionary.allTokens.forEach((token) => {
    const cssVar = `--${token.name}`;
    const category = token.path[0];
    const rest = token.path.slice(1).join('-');
    const twKey = tailwindCategoryMap[category] || category;
    if (!theme[twKey]) theme[twKey] = {};
    theme[twKey][rest || 'DEFAULT'] = `var(${cssVar})`;
  });
  return theme;
}

// ─── Custom format: Tailwind preset (CJS) ───
StyleDictionary.registerFormat({
  name: 'tailwind/preset',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file });
    const theme = buildTailwindTheme(dictionary);
    return (
      header +
      'module.exports = {\n' +
      '  theme: {\n' +
      '    extend: ' + JSON.stringify(theme, null, 6).replace(/^/gm, '    ').trimStart() + ',\n' +
      '  },\n' +
      '};\n'
    );
  },
});

// ─── Custom format: Tailwind preset (ESM) ───
StyleDictionary.registerFormat({
  name: 'tailwind/preset-esm',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file });
    const theme = buildTailwindTheme(dictionary);
    return (
      header +
      'export default {\n' +
      '  theme: {\n' +
      '    extend: ' + JSON.stringify(theme, null, 6).replace(/^/gm, '    ').trimStart() + ',\n' +
      '  },\n' +
      '};\n'
    );
  },
});

// ─── Filter: exclude primitive tokens ───
const excludePrimitive = (token) => !token.path[0].startsWith('primitive');

// ─── Light mode build ───
const lightSD = new StyleDictionary({
  log: { warnings: 'disabled' },
  source: [
    'tokens/**/*.json',
    '!tokens/color/dark.json',
  ],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/css/',
      files: [
        {
          destination: 'variables.css',
          format: 'css/variables',
          options: { outputReferences: true },
        },
      ],
    },
    scss: {
      transformGroup: 'scss',
      buildPath: 'dist/scss/',
      files: [
        {
          destination: '_variables.scss',
          format: 'scss/variables',
          options: { outputReferences: true },
        },
      ],
    },
    json: {
      transformGroup: 'web',
      buildPath: 'dist/json/',
      files: [
        {
          destination: 'tokens.json',
          format: 'json/flat',
          filter: excludePrimitive,
        },
        {
          destination: 'tokens-nested.json',
          format: 'json/nested',
          filter: excludePrimitive,
        },
      ],
    },
    ios: {
      transformGroup: 'ios',
      buildPath: 'dist/ios/',
      files: [
        {
          destination: 'DesignTokens.swift',
          format: 'ios-swift/enum',
          filter: excludePrimitive,
        },
      ],
    },
    android: {
      transformGroup: 'android',
      buildPath: 'dist/android/',
      files: [
        {
          destination: 'design_tokens.xml',
          format: 'android/xml-resources',
          filter: excludePrimitive,
        },
      ],
    },
    ts: {
      transformGroup: 'web',
      buildPath: 'dist/ts/',
      files: [
        {
          destination: 'tokens.ts',
          format: 'typescript/const',
          filter: excludePrimitive,
        },
      ],
    },
    tailwind: {
      transformGroup: 'web',
      buildPath: 'dist/tailwind/',
      files: [
        {
          destination: 'preset.cjs',
          format: 'tailwind/preset',
          filter: excludePrimitive,
        },
        {
          destination: 'preset.js',
          format: 'tailwind/preset-esm',
          filter: excludePrimitive,
        },
      ],
    },
  },
});

// ─── Dark mode build ───
const darkSD = new StyleDictionary({
  log: { warnings: 'disabled' },
  source: [
    'tokens/color/primitive.json',
    'tokens/color/dark.json',
  ],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/css/',
      files: [
        {
          destination: 'variables-dark.css',
          format: 'css/dark-variables',
          filter: (token) => !token.path[0].startsWith('primitive'),
        },
      ],
    },
    scss: {
      transformGroup: 'scss',
      buildPath: 'dist/scss/',
      files: [
        {
          destination: '_variables-dark.scss',
          format: 'scss/variables',
          filter: (token) => !token.path[0].startsWith('primitive'),
        },
      ],
    },
  },
});

console.log('Building light mode tokens...');
await lightSD.buildAllPlatforms();
console.log('Building dark mode tokens...');
await darkSD.buildAllPlatforms();
console.log('Done! All platforms built successfully.');
