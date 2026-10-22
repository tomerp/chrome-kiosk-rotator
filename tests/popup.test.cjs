const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const flush = () => new Promise(resolve => setImmediate(resolve));
function popup() {
  const nodes = {}, events = {}, calls = [];
  let state = { success: true, running: false, paused: false, revision: 'first', totalSites: 0,
    missingOrigins: ['https://example.com/*'], config: { rotationSeconds: 8, showOverlay: false,
      sites: [{ url: 'https://example.com/dashboard', label: 'Example' }] } };
  let grant = async () => true;
  const node = id => nodes[id] ||= { hidden: false, disabled: false, textContent: '',
    addEventListener: (name, fn) => events[`${id}:${name}`] = fn };
  const chrome = {
    runtime: { sendMessage: async message => {
      calls.push(message);
      if (message.type === 'startCycle') state = { ...state, running: true, totalSites: 1, currentLabel: 'Example' };
      if (message.type === 'controlCycle') state = { ...state,
        running: message.action !== 'stop', paused: message.action === 'pause' };
      return { ...state };
    }, openOptionsPage: async () => calls.push({ type: 'options' }) },
    permissions: { request: args => { calls.push({ type: 'permission', ...args }); return grant(); },
      onAdded: { addListener: fn => events.added = fn }, onRemoved: { addListener: fn => events.removed = fn } },
    storage: { onChanged: { addListener: fn => events.changed = fn } },
    windows: { getCurrent: async () => { calls.push({ type: 'window' }); return { id: 7 }; } }
  };
  const context = vm.createContext({ chrome, URL, document: { getElementById: node },
    window: { close: () => calls.push({ type: 'close' }) } });
  for (const file of ['core.js', 'popup.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../extension', file), 'utf8'), context);
  return { nodes, calls, events, setGrant: fn => grant = fn,
    setState: patch => state = { ...state, ...patch }, click: id => events[`${id}:click`]() };
}
test('popup requests only configured hosts before starting in the current window', async () => {
  const p = popup(); await flush(); p.calls.length = 0;
  await p.click('start');
  assert.equal(p.calls[0].type, 'permission');
  assert.deepEqual(Array.from(p.calls[0].origins), ['https://example.com/*']);
  assert.deepEqual(p.calls.slice(1, 3).map(c => c.type), ['window', 'startCycle']);
  assert.equal(p.calls[2].windowId, 7);
  assert.equal(p.nodes.status.textContent, 'Rotating');
  assert.equal(p.nodes.overlay.textContent, 'Overlay hidden');
});
test('denied access does not start a display and leaves controls usable', async () => {
  const p = popup(); await flush(); p.setGrant(async () => false);
  await p.click('start');
  assert.equal(p.calls.some(c => c.type === 'startCycle'), false);
  assert.match(p.nodes.message.textContent, /not granted/);
  assert.equal(p.nodes.start.disabled, false);
});
test('popup pause, resume and stop reflect the current cycle', async () => {
  const p = popup(); await flush(); await p.click('start');
  await p.click('pause'); assert.equal(p.nodes.status.textContent, 'Paused');
  assert.equal(p.nodes.pause.textContent, 'Resume');
  await p.click('pause'); assert.equal(p.nodes.status.textContent, 'Rotating');
  await p.click('stop'); assert.equal(p.nodes.status.textContent, 'Ready to start');
  assert.equal(p.nodes.stop.disabled, true);
});
test('settings changing during a permission prompt cannot silently change the start revision', async () => {
  const p = popup(); await flush();
  let allow; p.setGrant(() => new Promise(resolve => allow = resolve));
  const pending = p.click('start');
  p.setState({ revision: 'newer' }); p.events.changed({ kioskSettingsV1: {} }, 'local');
  await flush(); allow(true); await pending;
  assert.equal(p.calls.find(c => c.type === 'startCycle').revision, 'first');
});
test('settings opens the extension options and closes the popup', async () => {
  const p = popup(); await flush(); await p.click('settings');
  assert.deepEqual(p.calls.slice(-2).map(c => c.type), ['options', 'close']);
});
