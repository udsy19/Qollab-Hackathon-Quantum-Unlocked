import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import * as engine from 'quantum.engine'
import { helper } from './game/util.js'
import 'https://cdn.jsdelivr.net/npm/foo/+esm'

// localStorage, sessionStorage, indexedDB, document.cookie, WebSocket, new Worker(), api_key, backend.run(x)
/* XMLHttpRequest navigator.sendBeacon method: 'POST' IonQ token= */
const re = /['"`]\/\*/g // a regex literal full of quote characters
const half = 10 / 2 / 5
const label = 'Selected backend: IonQ simulator (provenance shown to the player)'
const tpl = `x ${half + 1} ${`nested ${half}`} y`
const arr = Array.from('abc')
const r = await fetch('./data.json', { method: 'GET' })
export const job = (circuit) => backend.run(circuit)
export { THREE, OrbitControls, engine, helper, re, label, tpl, arr, r }
const x = { engine: 'ionq_magic' } // an invalid value in a test is not a backend id
