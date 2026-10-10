// the owner's one ruled site
let memo = null
export async function verifySelectedBackendOnce(backend, circuit) {
  memo ??= backend.run(circuit, { shots: 256 })
  return memo
}
