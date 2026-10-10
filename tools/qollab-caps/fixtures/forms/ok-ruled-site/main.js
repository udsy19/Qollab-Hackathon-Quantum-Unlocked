import { verifySelectedBackendOnce } from './quantum/bridge.js'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
import * as q from 'q.mod'
const HANDLERS = { a: { run: () => 1 } }
export const h = (id) => HANDLERS[id].run()
const { run } = scheduler
export const s = () => run()
export const name = String(backend.name)
export const label = `backend ${backend.name}`
export const twice = (qc) => { verifySelectedBackendOnce(backend, qc); return verifySelectedBackendOnce(backend, qc) }
export const lbl = () => q.label.callPromising(backend)
