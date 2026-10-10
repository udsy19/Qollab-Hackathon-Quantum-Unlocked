// The one ruled backend.run site (owner: quantum/bridge.js verifySelectedBackendOnce).
let memo = null
export function verifySelectedBackendOnce(backend, circuit) {
  if (!memo) memo = backend.run(circuit, { shots: 256 })
  return memo
}
