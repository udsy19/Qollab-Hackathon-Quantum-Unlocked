import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
const copy = { ...backend, extra: 1 }
export const go = (qc) => copy.run(qc)
