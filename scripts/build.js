import StyleDictionary from 'style-dictionary';
import { fileHeader, formattedVariables } from 'style-dictionary/utils';

// ─── Custom format: CSS dark mode wrapper ───
StyleDictionary.registerFormat({
  name: 'css/dark-variables',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file });
    return (
      header +
      '@media (prefers-color-scheme: dark) {\n  :root {\n' +
      formattedVariables({ format: 'css', dictionary, outputReferences: false })
        .split('\n').map(line => line ? '  ' + line : line).join('\n') +
      '\n  }\n}\n'
    );
  },
});

// ─── Custom format: Swift enum ───
StyleDictionary.registerFormat({
  name: 'ios-swift/enum',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file });
    const lines = dictionary.allTokens.map((token) => {
      const name = token.name.replace(/-/g, '_');
      const val = typeof token.value === 'number' ? token.value : `"${token.value}"`;
      return `    static let ${name} = ${val}`;
    });
    return (
      header +
      'import Foundation\n\nenum DesignTokens {\n' +
      lines.join('\n') +
      '\n}\n'
    );
  },
});

// ─── Custom format: Android XML resources ───
StyleDictionary.registerFormat({
  name: 'android/xml-resources',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file });
    const lines = dictionary.allTokens.map((token) => {
      const name = token.name.replace(/-/g, '_');
      const val = `${token.value}`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `    <string name="${name}">${val}</string>`;
    });
    return (
      header +
      '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n' +
      lines.join('\n') +
      '\n</resources>\n'
    );
  },
});

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
        },
        {
          destination: 'tokens-nested.json',
          format: 'json/nested',
        },
      ],
    },
    ios: {
      transformGroup: 'web',
      buildPath: 'dist/ios/',
      files: [
        {
          destination: 'DesignTokens.swift',
          format: 'ios-swift/enum',
        },
      ],
    },
    android: {
      transformGroup: 'web',
      buildPath: 'dist/android/',
      files: [
        {
          destination: 'design_tokens.xml',
          format: 'android/xml-resources',
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
