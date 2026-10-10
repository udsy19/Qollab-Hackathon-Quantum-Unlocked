import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
const k = 'r' + 'un'
export const go = (qc) => backend[k](qc)
