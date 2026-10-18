const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function page(initial = {}) {
  const timers = new Map(), intervals = new Map(), events = {}, messages = [], nodes = new Map();
  let timerId = 0;
  const state = { managed: true, active: true, paused: false, currentIndex: 0, totalSites: 2,
    currentSite: { label: 'Test' }, nextSwitchAt: 9000, token: 'first', version: 1, ...initial };
  const document = { visibilityState: 'visible',
    addEventListener: (key, fn) => events[key] = fn,
    removeEventListener: key => delete events[key],
    getElementById: id => nodes.get(id),
    documentElement: { appendChild: host => nodes.set(host.id, host) },
    createElement: () => ({ style: {}, remove() { nodes.delete(this.id); },
      attachShadow() { const fields = { status: {}, countdown: {} }; this.shadowRoot = { getElementById: id => fields[id] }; return this.shadowRoot; } }) };
  let messageHandler;
  const chrome = { runtime: {
    onMessage: { addListener: fn => messageHandler = fn, removeListener: () => messageHandler = null },
    sendMessage: (message, callback) => { messages.push(message); callback(message.type === 'getCycleState' ? { ...state } : { success: true }); }
  } };
  const context = vm.createContext({ chrome, document, URL, Date: { now: () => 1000 },
    setTimeout: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; }, clearTimeout: id => timers.delete(id),
    setInterval: (fn, delay) => { intervals.set(++timerId, { fn, delay }); return timerId; }, clearInterval: id => intervals.delete(id),
    addEventListener: (key, fn) => events[key] = fn,
    removeEventListener: key => delete events[key] });
  vm.runInContext('window = globalThis; window.top = window;', context);
  for (const file of ['core.js', 'content.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../extension', file), 'utf8'), context);
  return { timers, intervals, events, messages, nodes, state, context, document,
    push: update => { Object.assign(state, update); messageHandler({ type: 'cycleState', state: { ...state } }); } };
}
test('content schedules an eight-second timer carrying the current token', () => {
  const p = page(); const timer = [...p.timers.values()][0];
  assert.equal(timer.delay, 8000); timer.fn();
  assert.ok(p.messages.some(m => m.type === 'rotationDue' && m.token === 'first'));
});
test('hidden or inactive pages cannot trigger rotation', () => {
  const p = page(); p.document.visibilityState = 'hidden'; p.events.visibilitychange(); assert.equal(p.timers.size, 0);
  p.push({ active: false, version: 2 }); assert.equal(p.timers.size, 0);
});
test('pause and stop clear timers, and stop removes the overlay', () => {
  const p = page(); p.push({ paused: true, version: 2 }); assert.equal(p.timers.size, 0);
  p.push({ managed: false, version: 3 }); assert.equal(p.nodes.size, 0); assert.equal(p.intervals.size, 0);
});
test('unmanaged page has no overlay, timer or intercepted shortcut', () => {
  const p = page({ managed: false }); assert.equal(p.nodes.size, 0); assert.equal(p.timers.size, 0);
  let blocked = false; p.events.keydown({ code: 'Space', preventDefault: () => blocked = true }); assert.equal(blocked, false);
});
test('stale response cannot replace a newer schedule', () => {
  const p = page(); p.push({ version: 3, token: 'new', nextSwitchAt: 6000 });
  p.push({ version: 2, token: 'old', nextSwitchAt: 2000 });
  assert.equal([...p.timers.values()][0].delay, 5000);
});
test('navigation into and out of back-forward cache restores the timer', () => {
  const p = page(); p.events.pagehide({ persisted: true }); assert.equal(p.timers.size, 0);
  p.events.pageshow({ persisted: true }); assert.equal(p.timers.size, 1);
});
test('reinjection reuses listeners and overlay instead of duplicating timers', () => {
  const p = page(); vm.runInContext(fs.readFileSync(path.join(__dirname, '../extension/content.js'), 'utf8'), p.context);
  assert.equal(p.timers.size, 1); assert.equal(p.nodes.size, 1);
});
