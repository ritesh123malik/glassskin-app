#!/usr/bin/env bash
set -euo pipefail

out_dir="docs/verification"
mkdir -p "$out_dir"
out_file="$out_dir/performance-$(date +%Y%m%d-%H%M%S).json"

node - <<'NODE' > "$out_file"
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const deps = Object.keys(pkg.dependencies || {}).length;
const devDeps = Object.keys(pkg.devDependencies || {}).length;
const nodeModulesPackages = Object.keys(lock.packages || {}).length;

console.log(JSON.stringify({
  measuredAt: new Date().toISOString(),
  dependencies: deps,
  devDependencies: devDeps,
  lockfilePackages: nodeModulesPackages,
  checks: {
    typecheck: 'npm run typecheck',
    tests: 'npm test -- --runInBand',
    expoDoctor: 'npx expo-doctor'
  }
}, null, 2));
NODE

echo "Wrote $out_file"
