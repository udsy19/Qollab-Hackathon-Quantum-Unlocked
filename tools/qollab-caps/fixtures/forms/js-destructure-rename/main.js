import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
const { name, run: send } = backend
export const go = (qc) => send(qc)
