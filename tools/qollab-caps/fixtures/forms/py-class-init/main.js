import { verifySelectedBackendOnce } from './quantum/bridge.js'
import * as q from 'q.mod'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
export const go = () => q.f.callPromising(backend)
