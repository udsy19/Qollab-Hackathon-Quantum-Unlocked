import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
function submit(qc, dev = backend) {
  return dev.run(qc)
}
export const go = (qc) => submit(qc)
