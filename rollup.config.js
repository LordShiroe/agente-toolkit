import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';

const external = [
  '@anthropic-ai/sdk',
  '@sinclair/typebox',
  'ajv',
  'node-fetch',
  'openai',
  'string-similarity',
  'winston',
];

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
