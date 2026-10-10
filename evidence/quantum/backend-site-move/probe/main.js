// Refutation probe (disposable copy only): does the runner's JS backend.run accept a circuit BUILT IN PYTHON?
import * as spy from 'pb_spy';
import * as qj from 'quantum.qollab_job';
const out = { backendName: String(backend.name) };
try {
  const circuit = await qj.build_backend_verification_circuit.callPromising();
  out.circuitType = String(circuit.type);
  const job = await backend.run(circuit, { shots: 256 });
  const result = await job.result();
  const counts = result.get_counts();
  out.counts = counts.toJs({ dict_converter: Object.fromEntries });
  out.ok = true;
} catch (e) { out.ok = false; out.error = String(e?.message ?? e); }
out.spy = (await spy.snapshot.callPromising()).toJs({ dict_converter: Object.fromEntries });
document.getElementById('probe-json').textContent = JSON.stringify(out);
