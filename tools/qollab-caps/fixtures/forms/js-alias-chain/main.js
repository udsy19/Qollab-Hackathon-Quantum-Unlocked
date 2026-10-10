import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
let a
a = backend
const b = a
export const go = (qc) => b.run(qc)
