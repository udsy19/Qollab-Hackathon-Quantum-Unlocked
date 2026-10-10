import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
const ctx = { backend, shots: 1 }
export const go = (qc) => ctx.backend.run(qc)
