import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
import { submit } from './game/net.js'
export const go = (qc) => submit(qc, backend)
