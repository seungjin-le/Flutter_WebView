import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

test('Both web apps can resolve the requested libraries without MSW or React Router', () => {
  for (const app of ['web', 'master']) {
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

test('Flutter sources and all platform hosts live under apps/mobile', () => {
  for (const path of ['pubspec.yaml', 'lib/main.dart', 'test/widget_test.dart',
    'android/app/build.gradle.kts', 'ios/Runner/Info.plist', 'web/index.html',
    'macos/Runner/Info.plist', 'linux/CMakeLists.txt', 'windows/CMakeLists.txt']) {
    assert.ok(existsSync(`apps/mobile/${path}`), path);
  }
  assert.equal(existsSync('pubspec.yaml'), false);
});

test('Root commands expose both independent applications and verification', () => {
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

test('Web and master are separate workspaces with centrally managed React versions', () => {
  const workspace = readFileSync('pnpm-workspace.yaml', 'utf8');
  assert.match(workspace, /^  - apps\/master$/m);
  const catalog = workspace.match(/^catalog:\n  react: (\S+)\n  react-dom: (\S+)$/m);
  assert.ok(catalog, 'React versions must be defined in the shared catalog');
  assert.equal(catalog[1], catalog[2], 'React and React DOM must use matching versions');
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
  for (const [command, target] of Object.entries({
    'dev:master': 'dev', 'build:master': 'build',
    'check:master': 'check', 'test:e2e:master': 'test:e2e',
  })) {
    assert.equal(scripts[command], `pnpm --filter @luckieverse/master ${target}`);
  }
  for (const app of ['web', 'master']) {
    const manifest = JSON.parse(readFileSync(`apps/${app}/package.json`, 'utf8'));
    assert.equal(manifest.name, `@luckieverse/${app}`);
    assert.equal(manifest.private, true);
    assert.equal(manifest.dependencies.react, 'catalog:');
    assert.equal(manifest.dependencies['react-dom'], 'catalog:');
  }
  const master = JSON.parse(readFileSync('apps/master/package.json', 'utf8'));
  assert.match(master.scripts.dev, /--port 5175 --strictPort$/);
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
