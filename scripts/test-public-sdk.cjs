// Validate actual SDK dependency schemas with the patched Zod; no connection or capture.
const assert = require('node:assert/strict');
(async () => {
  const { JsonRpcRequest } = await import('../node_modules/@elgato/utils/dist/rpc/json-rpc/request.js');
  const { JsonRpcResponse } = await import('../node_modules/@elgato/utils/dist/rpc/json-rpc/response.js');
  const { OptionGroup } = await import('../node_modules/@elgato/utils/dist/lists/option-group.js');
  assert(JsonRpcRequest.safeParse({ jsonrpc: '2.0', method: 'test', params: { zone: 1 }, id: '1' }).success);
  assert(!JsonRpcRequest.safeParse({ jsonrpc: '1.0', method: 42 }).success);
  assert(JsonRpcResponse.safeParse({ jsonrpc: '2.0', result: { ok: true }, id: '1' }).success);
  assert(JsonRpcResponse.safeParse({ jsonrpc: '2.0', error: { code: -1, message: 'fixture' }, id: '1' }).success);
  assert(!JsonRpcResponse.safeParse({ jsonrpc: '2.0', result: {}, id: 42 }).success);
  assert(OptionGroup.safeParse({ type: 'option-group', label: 'Zones', options: [
    { type: 'option', label: 'One', value: '1' },
    { type: 'option-group', label: 'Nested', options: [{ type: 'option', label: 'Two', value: 2 }] }
  ] }).success);
  assert(!OptionGroup.safeParse({ type: 'option-group', label: 'Zones', options: [{ type: 'option', label: 'Bad', value: {} }] }).success);
  console.log('OK: real SDK dependency schemas accept/reject RPC and nested options with patched Zod; no SDK connection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
