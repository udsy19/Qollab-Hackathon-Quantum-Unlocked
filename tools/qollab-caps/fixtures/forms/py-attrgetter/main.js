import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
import * as q from 'q.mod'
export const go = (qc) => q.go.callPromising(backend, qc)
