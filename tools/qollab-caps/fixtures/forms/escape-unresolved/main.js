import { verifySelectedBackendOnce } from './quantum/bridge.js'
import { submit } from 'https://cdn.example.org/lib/+esm'
export const verify = (qc) => verifySelectedBackendOnce(backend, qc)
export const go = (qc) => submit(backend, qc)
function getB() {
  return backend
}
export const g = () => getB().run(1)
