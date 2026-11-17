import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('The web app can resolve the requested libraries without MSW or React Router', () => {
  for (const app of ['web']) {
    const require = createRequire(resolve(`apps/${app}/package.json`));
    const manifest = require('./package.json');
    assert.equal(require.resolve('@luckieverse/theme'), resolve('packages/theme/theme.css'));
    for (const name of ['@tanstack/react-query', '@tanstack/react-router', 'zod',
      'react-hook-form', '@hookform/resolvers/zod', 'zustand', 'axios', 'date-fns',
      'tailwindcss', '@tailwindcss/vite', 'vitest']) {
      assert.ok(require.resolve(name), `${app}: ${name}`);
    }
    for (const name of ['msw', 'react-router', 'react-router-dom']) {
      assert.equal(manifest.dependencies[name] ?? manifest.devDependencies[name], undefined);
    }
  }
});

test('Flutter retains only Android and iOS hosts while the React web app remains', () => {
  for (const path of ['pubspec.yaml', 'lib/main.dart', 'test/widget_test.dart',
    'android/app/build.gradle.kts', 'ios/Runner/Info.plist']) {
    assert.ok(existsSync(`apps/mobile/${path}`), path);
  }
  assert.ok(existsSync('apps/web/index.html'));
  const metadata = readFileSync('apps/mobile/.metadata', 'utf8');
  assert.deepEqual([...metadata.matchAll(/- platform: (\w+)/g)].map((match) => match[1]),
    ['root', 'android', 'ios']);
  const analysis = readFileSync('apps/mobile/analysis_options.yaml', 'utf8');
  for (const platform of ['macos', 'linux', 'windows', 'web']) {
    assert.equal(existsSync(`apps/mobile/${platform}`), false, platform);
    assert.ok(!analysis.includes(`${platform}/**`), platform);
  }
  assert.equal(existsSync('pubspec.yaml'), false);
});

test('Root commands expose the web application and verification', () => {
  const { scripts, packageManager } = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.match(packageManager, /^pnpm@11\./);
  for (const name of ['dev:web', 'build:web', 'check:web', 'test:e2e',
    'mobile:run', 'mobile:pub', 'check:mobile', 'test:workspace']) {
    assert.equal(typeof scripts[name], 'string', name);
  }
  assert.match(readFileSync('pnpm-workspace.yaml', 'utf8'), /apps\/web/);
});

test('Nested generated artifacts are ignored', () => {
  const ignore = readFileSync('.gitignore', 'utf8');
  for (const pattern of ['**/build/', '**/.dart_tool/', '**/node_modules/',
    '**/dist/', '**/test-results/']) assert.ok(ignore.includes(pattern), pattern);
});

test('Web is the only React app workspace with centrally managed React versions', () => {
  const workspace = readFileSync('pnpm-workspace.yaml', 'utf8');
  assert.match(workspace, /^  - apps\/web$/m);
  assert.doesNotMatch(workspace, /apps\/master/);
  assert.equal(existsSync('apps/master'), false);
  const catalog = workspace.match(/^catalog:\n  react: (\S+)\n  react-dom: (\S+)$/m);
  assert.ok(catalog, 'React versions must be defined in the shared catalog');
  assert.equal(catalog[1], catalog[2], 'React and React DOM must use matching versions');
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.deepEqual(Object.keys(scripts).filter((name) => name.endsWith(':master')), []);
  const manifest = JSON.parse(readFileSync('apps/web/package.json', 'utf8'));
  assert.equal(manifest.name, '@luckieverse/web');
  assert.equal(manifest.private, true);
  assert.equal(manifest.dependencies.react, 'catalog:');
  assert.equal(manifest.dependencies['react-dom'], 'catalog:');
});

test('Network access is available in release but HTTP exceptions are debug-only', () => {
  const main = readFileSync('apps/mobile/android/app/src/main/AndroidManifest.xml', 'utf8');
  const debug = readFileSync('apps/mobile/android/app/src/debug/AndroidManifest.xml', 'utf8');
  assert.match(main, /android.permission.INTERNET/);
  assert.doesNotMatch(main, /usesCleartextTraffic="true"/);
  assert.match(debug, /usesCleartextTraffic="true"/);
  const ios = readFileSync('apps/mobile/ios/Runner/Info.plist', 'utf8');
  const iosDebug = readFileSync('apps/mobile/ios/Runner/Info-Debug.plist', 'utf8');
  assert.doesNotMatch(ios, /NSAllowsArbitraryLoads/);
  assert.match(iosDebug, /NSAllowsArbitraryLoadsInWebContent/);
  const project = readFileSync('apps/mobile/ios/Runner.xcodeproj/project.pbxproj', 'utf8');
  assert.equal(project.match(/INFOPLIST_FILE = "Runner\/Info-Debug.plist";/g)?.length, 1);
});

test('Prettier shares the agreed formatting for web through the real CLI', async () => {
  const prettier = await import('prettier');
  const require = createRequire(resolve('package.json'));
  const manifestPath = require.resolve('prettier/package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const bin = resolve(dirname(manifestPath), manifest.bin);
  const root = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(root.devDependencies.prettier, prettier.version, 'Pin the installed formatter version');
  const input = 'export const Card=()=>{const title="안녕";return <button title="카드">{title}</button>};\nconst values=[null,undefined,0,false,""];';
  const expected = "export const Card = () => {\n  const title = '안녕'\n  return <button title=\"카드\">{title}</button>\n}\nconst values = [null, undefined, 0, false, '']\n";
  const run = (file, source) => spawnSync(process.execPath, [bin, '--stdin-filepath', file], {
    input: source, encoding: 'utf8', timeout: 10000,
  });
  for (const app of ['web']) {
    const file = `apps/${app}/src/prettier-fixture.tsx`;
    assert.deepEqual(await prettier.resolveConfig(file), {
      semi: false, singleQuote: true, tabWidth: 2, printWidth: 100,
      trailingComma: 'all', endOfLine: 'lf',
    });
    const formatted = run(file, input);
    assert.equal(formatted.status, 0, formatted.stderr);
    assert.equal(formatted.stdout, expected);
    assert.equal(run(file, expected).stdout, expected, 'Formatting must be idempotent');
    const empty = run(file, '');
    assert.equal(empty.status, 0, empty.stderr);
    assert.equal(empty.stdout, '');
    const invalid = run(file, 'export const Card = (');
    assert.equal(invalid.status, 2, invalid.stderr);
    assert.match(invalid.stderr, /SyntaxError/);
  }
  for (const file of ['apps/mobile/lib/main.dart', 'apps/mobile/pubspec.yaml',
    'apps/web/dist/fixture.js', 'apps/web/coverage/fixture.js',
    'apps/web/test-results/fixture.json', 'apps/web/playwright-report/fixture.html',
    'pnpm-lock.yaml']) {
    const ignored = run(file, input);
    assert.equal(ignored.status, 0, ignored.stderr);
    assert.equal(ignored.stdout, input, `Ignored input must stay unchanged: ${file}`);
  }
});
