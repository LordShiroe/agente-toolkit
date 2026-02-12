import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import { writeFileSync } from 'fs';

const external = [
  '@anthropic-ai/sdk',
  '@sinclair/typebox',
  'ajv',
  'node-fetch',
  'openai',
  'string-similarity',
  'winston',
];

// Plugin to create package.json files marking directories as ESM
const createEsmPackageJson = () => ({
  name: 'create-esm-package-json',
  closeBundle() {
    // Create package.json at dist/esm/ to mark all .js files as ESM
    const esmPackageJsonPath = 'dist/esm/package.json';
    const esmPackageJson = JSON.stringify({ type: 'module' }, null, 2);
    writeFileSync(esmPackageJsonPath, esmPackageJson);
    console.log(`✓ Created ${esmPackageJsonPath}`);

    // Also create one in dist/esm/node_modules/tslib/ if it exists
    const tslibDir = 'dist/esm/node_modules/tslib';
    try {
      const tslibPackageJsonPath = `${tslibDir}/package.json`;
      // Check if tslib directory exists
      const fs = require('fs');
      if (fs.existsSync(tslibDir)) {
        writeFileSync(tslibPackageJsonPath, esmPackageJson);
        console.log(`✓ Created ${tslibPackageJsonPath}`);
      }
    } catch (err) {
      // Silently fail if tslib doesn't exist
    }
  },
});

// Main bundle configurations
const mainConfig = [
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/cjs',
      format: 'cjs',
      preserveModules: true,
      preserveModulesRoot: 'src',
      exports: 'named',
      sourcemap: true,
    },
    external,
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist/cjs',
        declarationDir: 'dist/cjs',
        sourceMap: true,
      }),
    ],
  },
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/esm',
      format: 'esm',
      preserveModules: true,
      preserveModulesRoot: 'src',
      sourcemap: true,
    },
    external,
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist/esm',
        declaration: false,
        declarationMap: false,
        sourceMap: true,
      }),
      createEsmPackageJson(),
    ],
  },
];

// Type definitions configuration
const dtsConfig = {
  input: 'src/index.ts',
  output: {
    dir: 'dist/types',
    format: 'esm',
  },
  external,
  plugins: [dts()],
};

export default [...mainConfig, dtsConfig];
