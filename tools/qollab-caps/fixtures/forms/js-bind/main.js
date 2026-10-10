import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
const r = backend.run.bind(backend)
export const go = (qc) => r(qc)
