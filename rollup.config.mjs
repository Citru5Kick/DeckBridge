import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
if (process.env.DECKBRIDGE_TARGET !== 'dev') throw new Error('Use npm run build:dev');
export default {
 input: 'src/dev/plugin.ts', output: { file: 'com.deckbridge.wow.dev.sdPlugin/bin/plugin.js' },
 plugins: [{ name: 'dev-no-native-ws', transform(code, id) {
   const normalized = id.replaceAll('\\', '/');
   if (normalized.endsWith('/node_modules/ws/lib/buffer-util.js') || normalized.endsWith('/node_modules/ws/lib/validation.js'))
     return { code: code.replaceAll('process.env.WS_NO_BUFFER_UTIL', '"1"').replaceAll('process.env.WS_NO_UTF_8_VALIDATE', '"1"'), map: null };
   return null;
 } }, typescript(), nodeResolve({ browser: false, exportConditions: ['node'], preferBuiltins: true }), commonjs(), terser(),
 { name: 'module-package', generateBundle() { this.emitFile({ type: 'asset', fileName: 'package.json', source: '{ "type": "module" }' }); } }]
};
