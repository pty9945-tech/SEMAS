import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

// Keep the ordinary website build unchanged. This separate build embeds the
// public app, its policy rules, and its styles in a file that needs no server.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(root, 'dist-html/동작센터-정책자금-상담-도우미.html');
const result = await build({
  root,
  configFile: false,
  mode: 'production',
  plugins: [react()],
  define: {
    __PUBLIC_SITE__: 'true',
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    write: false,
    sourcemap: false,
    minify: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(root, 'src/main.jsx'),
      name: 'DongjakPolicyAdvisor',
      formats: ['iife'],
      fileName: 'advisor',
      cssFileName: 'advisor',
    },
    rolldownOptions: {
      output: { codeSplitting: false },
    },
  },
});

const outputs = (Array.isArray(result) ? result : [result]).flatMap(
  (bundle) => bundle.output,
);
const scripts = outputs.filter((item) => item.type === 'chunk');
const styles = outputs.filter(
  (item) => item.type === 'asset' && item.fileName.endsWith('.css'),
);
const otherAssets = outputs.filter(
  (item) => item.type === 'asset' && !item.fileName.endsWith('.css'),
);
if (
  scripts.length !== 1 ||
  scripts[0].imports.length ||
  // Rolldown keeps self-references in this metadata after inlining imports.
  scripts[0].dynamicImports.some((name) => name !== scripts[0].fileName) ||
  otherAssets.length
) {
  throw new Error('The HTML export must contain one self-contained script and CSS only.');
}

// HTML raw-text elements end at their closing tag, even inside JS/CSS strings.
const script = scripts[0].code.replace(/<\/script/gi, '<\\/script');
const css = styles
  .map((item) => typeof item.source === 'string'
    ? item.source
    : new TextDecoder().decode(item.source))
  .join('\n')
  .replace(/<\/style/gi, '<\\/style');
const template = await readFile(resolve(root, 'index.html'), 'utf8');
const entry = '<script type="module" src="/src/main.jsx"></script>';
if (!template.includes(entry)) {
  throw new Error('The HTML app entry changed; update scripts/build-html.mjs.');
}
const html = template
  .replace('</head>', () => `    <style>${css}</style>\n  </head>`)
  .replace(entry, () => `<script>${script}</script>`);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html);
console.log(`Standalone HTML: ${outputPath} (${Buffer.byteLength(html).toLocaleString('en-US')} bytes)`);
