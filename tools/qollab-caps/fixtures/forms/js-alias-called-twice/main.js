import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
const { run } = backend
export const go = (qc) => run(qc)
export const again = (qc) => run(qc)
