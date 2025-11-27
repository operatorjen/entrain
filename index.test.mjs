import test from 'node:test'
import assert from 'node:assert/strict'
import { Entrain } from './index.mjs'

function banner(msg) {
  const line = '='.repeat(msg.length)
  console.log(`\n${msg}\n${line}`)
}

test('ENTRAIN: high synchrony yields higher coupling', async () => {
  banner('ENTRAIN INTEGRATION TEST')
  const entrain = new Entrain({
    wField: 0.7,
    wAction: 0.3,
    fieldScale: 1.0
  })
  const syncTraces = [
    {
      agentId: 'a',
      prevPercept: { field: 1 },
      nextPercept: { field: 1.2 },
      action: { type: 'nudge', amount: 1 }
    },
    {
      agentId: 'b',
      prevPercept: { field: 1.1 },
      nextPercept: { field: 1.3 },
      action: { type: 'nudge', amount: 0.8 }
    }
  ]
  console.log('entrain: synchronized traces', {
    traces: syncTraces
  })
  const syncCoupling = entrain.update(syncTraces)
  const cA_sync = syncCoupling.get('a')
  const cB_sync = syncCoupling.get('b')
  console.log('entrain: coupling under synchrony', {
    a: cA_sync,
    b: cB_sync
  })
  assert.ok(cA_sync > 0.7, 'expected high coupling for a under synchrony')
  assert.ok(cB_sync > 0.7, 'expected high coupling for b under synchrony')

  const desyncTraces = [
    {
      agentId: 'a',
      prevPercept: { field: -5 },
      nextPercept: { field: -4 },
      action: { type: 'nudge', amount: -1 }
    },
    {
      agentId: 'b',
      prevPercept: { field: 5 },
      nextPercept: { field: 6 },
      action: { type: 'nudge', amount: 1 }
    }
  ]
  console.log('entrain: desynchronized traces', { traces: desyncTraces })
  const desyncCoupling = entrain.update(desyncTraces)
  const cA_desync = desyncCoupling.get('a')
  const cB_desync = desyncCoupling.get('b')
  console.log('entrain: coupling under desynchrony', {
    a: cA_desync,
    b: cB_desync
  })
  assert.ok(cA_desync < cA_sync, 'coupling for a should drop when desynchronized')
  assert.ok(cB_desync < cB_sync, 'coupling for b should drop when desynchronized')
})

test('ENTRAIN: single agent yields zero coupling', () => {
  banner('ENTRAIN SINGLE-AGENT CONTROL TEST')
  const entrain = new Entrain()
  const traces = [
    {
      agentId: 'solo',
      prevPercept: { field: 0 },
      nextPercept: { field: 1 },
      action: { type: 'nudge', amount: 1 }
    }
  ]
  console.log('entrain: single-agent traces', { traces })
  const map = entrain.update(traces)
  const cSolo = map.get('solo')
  console.log('entrain: coupling for single agent', {
    agent: 'solo',
    coupling: cSolo
  })
  assert.equal(cSolo, 0)
})

test('ENTRAIN: symmetric traces give symmetric coupling', () => {
  banner('ENTRAIN SYMMETRY TEST')
  const entrain = new Entrain()
  const traces = [
    {
      agentId: 'x',
      prevPercept: { field: 2 },
      nextPercept: { field: 3 },
      action: { type: 'emit', signal: 1 }
    },
    {
      agentId: 'y',
      prevPercept: { field: 2.1 },
      nextPercept: { field: 3.1 },
      action: { type: 'emit', signal: 0.9 }
    },
    {
      agentId: 'z',
      prevPercept: { field: 2.05 },
      nextPercept: { field: 3.05 },
      action: { type: 'emit', signal: 1.1 }
    }
  ]
  console.log('entrain: symmetric traces', { traces })
  const map = entrain.update(traces)
  const cx = map.get('x')
  const cy = map.get('y')
  const cz = map.get('z')
  console.log('entrain: symmetric coupling values', {
    x: cx, y: cy, z: cz
  })
  assert.ok(cx > 0 && cy > 0 && cz > 0)
  const max = Math.max(cx, cy, cz)
  const min = Math.min(cx, cy, cz)
  assert.ok(max - min < 0.2, 'coupling should be roughly symmetric across agents')
})