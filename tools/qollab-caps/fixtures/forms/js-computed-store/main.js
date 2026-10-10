import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
const slots = {}
slots['dev'] = backend
export const go = (qc) => slots.dev.run(qc)
