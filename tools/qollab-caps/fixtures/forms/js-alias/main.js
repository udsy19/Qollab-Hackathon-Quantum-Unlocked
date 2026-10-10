import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
const b = backend
export const go = (qc) => b.run(qc)
