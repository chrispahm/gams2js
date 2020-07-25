import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import pkg from './package.json'

export default [
  // browser-friendly (minified) UMD build
  {
    input: 'src/index.js',
    output: {
      name: 'NEOS',
      file: pkg.browser,
      format: 'umd'
    },
    plugins: [
      resolve(),
      commonjs(),
      terser()
    ]
  },
  // node js and module version
  {
    input: 'src/index.js',
    output: [{
      file: pkg.main,
      exports: 'default',
      format: 'cjs'
    },
    {
      file: pkg.module,
      exports: 'default',
      format: 'es'
    }
    ]
  }
]