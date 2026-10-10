import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
function submit(dev, qc) {
  return dev.run(qc)
}
export const go = (qc) => submit(backend, qc)
