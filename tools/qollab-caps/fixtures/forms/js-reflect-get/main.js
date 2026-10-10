import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
export const go = (qc) => Reflect.get(backend, 'run')(qc)
