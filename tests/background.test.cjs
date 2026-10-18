const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '../extension');
function event() { const listeners = []; return { listeners, addListener: fn => listeners.push(fn) }; }
function fixture() {
  let now = 1000000, uuid = 0, nextId = 20;
  const data = {}, alarms = new Map(), reloads = [], messages = [];
  const tabs = [{ id: 1, windowId: 1, url: 'https://unrelated.example/', active: true }];
  const chrome = {
    runtime: { onMessage: event(), onStartup: event(), onInstalled: event() },
    action: { onClicked: event(), setBadgeText: async () => {}, setTitle: async () => {} },
    storage: { local: { get: async key => ({ [key]: structuredClone(data[key]) }),
      set: async value => Object.assign(data, structuredClone(value)) } },
    alarms: { onAlarm: event(), clear: async key => alarms.delete(key), create: async (key, value) => alarms.set(key, value) },
    scripting: { executeScript: async () => {} },
    windows: { onRemoved: event() },
    tabs: {
      onActivated: event(), onRemoved: event(),
      query: async query => tabs.filter(t => t.windowId === query.windowId && (!query.active || t.active)),
      create: async options => { const t = { ...options, id: nextId++ }; tabs.push(t); return t; },
      update: async (id, options) => {
        const t = tabs.find(t => t.id === id); if (!t) throw new Error('Missing tab');
        if (options.active) tabs.filter(x => x.windowId === t.windowId).forEach(x => x.active = false);
        Object.assign(t, options);
        if (options.active) chrome.tabs.onActivated.listeners.forEach(fn => fn({ tabId: id, windowId: t.windowId }));
        return t;
      },
      sendMessage: async (tabId, message) => messages.push({ tabId, message }),
      reload: async id => reloads.push(id)
    }
  };
  let ctx;
  function boot() {
    for (const api of [chrome.runtime, chrome.action, chrome.alarms, chrome.windows, chrome.tabs]) {
      for (const value of Object.values(api)) if (value?.listeners) value.listeners.length = 0;
    }
    ctx = vm.createContext({ chrome, URL, console, crypto: { randomUUID: () => `token-${++uuid}` },
      Date: { now: () => now }, importScripts: (...files) => files.forEach(file => vm.runInContext(fs.readFileSync(path.join(dir, file), 'utf8'), ctx)) });
    vm.runInContext(fs.readFileSync(path.join(dir, 'background.js'), 'utf8'), ctx);
    ctx.KIOSK_CONFIG = { rotationSeconds: 8, sites: [
      { url: 'https://a.example/', label: 'A', refreshEverySeconds: 0 },
      { url: 'https://b.example/', label: 'B', refreshEverySeconds: 0 },
      { url: 'https://c.example/', label: 'C', refreshEverySeconds: 1 }
    ] };
  }
  boot();
  async function flush() { for (let i = 0; i < 5; i++) await vm.runInContext('queue', ctx); }
  async function emit(source, value) { source.listeners.forEach(fn => fn(value)); await flush(); }
  function send(message, id, frameId = 0) {
    return new Promise(resolve => chrome.runtime.onMessage.listeners[0](message, { tab: { id }, frameId }, resolve));
  }
  return { chrome, data, alarms, tabs, reloads, messages, flush, send, boot,
    get ctx() { return ctx; }, get now() { return now; }, advance: ms => now += ms,
    state: () => structuredClone(data.kioskCycleV2),
    start: () => emit(chrome.action.onClicked, { id: 1, windowId: 1 }),
    alarm: () => emit(chrome.alarms.onAlarm, { name: 'kioskRecovery' }),
    remove: async id => { tabs.splice(tabs.findIndex(t => t.id === id), 1); await emit(chrome.tabs.onRemoved, id); }, emit };
}
test('start preserves existing page and returns a real countdown deadline', async () => {
  const f = fixture(); await f.start();
  assert.equal(f.tabs[0].url, 'https://unrelated.example/');
  const s = f.state(); const response = await f.send({ type: 'getCycleState' }, s.activeTabId);
  assert.equal(response.nextSwitchAt, f.now + 8000);
  assert.equal(response.currentSite.label, 'A');
  assert.equal(f.alarms.get('kioskRecovery').when, f.now + 30000);
});
test('visible-page message rotates at eight seconds, without waiting for alarm', async () => {
  const f = fixture(); await f.start(); const s = f.state(); f.advance(8000);
  assert.equal((await f.send({ type: 'rotationDue', token: s.token }, s.activeTabId)).success, true);
  await f.flush(); assert.equal(f.state().activeTabId, s.entries[1].tabId);
  assert.equal(f.state().nextSwitchAt, f.now + 8000);
});
test('concurrent duplicate messages and alarm produce one transition', async () => {
  const f = fixture(); await f.start(); const s = f.state(); f.advance(30000);
  await Promise.all([f.send({ type: 'rotationDue', token: s.token }, s.activeTabId),
    f.send({ type: 'rotationDue', token: s.token }, s.activeTabId), f.alarm()]);
  await f.flush(); assert.equal(f.state().activeTabId, s.entries[1].tabId);
});
test('early, stale, inactive and subframe requests cannot rotate', async () => {
  const f = fixture(); await f.start(); const s = f.state();
  assert.equal((await f.send({ type: 'rotationDue', token: s.token }, s.activeTabId)).success, false);
  f.advance(8000);
  for (const [token, id, frame] of [['old', s.activeTabId, 0], [s.token, s.entries[1].tabId, 0], [s.token, s.activeTabId, 1]]) {
    assert.equal((await f.send({ type: 'rotationDue', token }, id, frame)).success, false);
  }
  assert.equal(f.state().activeTabId, s.activeTabId);
});
test('recovery alarm advances when the page cannot send messages', async () => {
  const f = fixture(); await f.start(); const s = f.state(); f.advance(30000); await f.alarm();
  assert.equal(f.state().activeTabId, s.entries[1].tabId);
});
test('service worker restart retains deadline and validates incoming timer', async () => {
  const f = fixture(); await f.start(); const s = f.state(); f.boot(); f.advance(8000);
  await f.send({ type: 'rotationDue', token: s.token }, s.activeTabId); await f.flush();
  assert.equal(f.state().activeTabId, s.entries[1].tabId);
});
test('pause cancels timers and rejects an in-flight request; resume gets a fresh deadline', async () => {
  const f = fixture(); await f.start(); const s = f.state();
  await f.send({ type: 'setPaused', paused: true }, s.activeTabId);
  assert.equal(f.state().nextSwitchAt, null); assert.equal(f.alarms.size, 0);
  f.advance(30000); await f.send({ type: 'rotationDue', token: s.token }, s.activeTabId); await f.alarm();
  assert.equal(f.state().activeTabId, s.activeTabId);
  await f.send({ type: 'setPaused', paused: false }, s.activeTabId);
  assert.equal(f.state().nextSwitchAt, f.now + 8000);
});
test('removing a middle tab preserves the remaining site identity and refresh rule', async () => {
  const f = fixture(); await f.start(); const s = f.state(); await f.remove(s.entries[1].tabId);
  f.advance(8000); const after = f.state();
  await f.send({ type: 'rotationDue', token: after.token }, after.activeTabId); await f.flush();
  const c = await f.send({ type: 'getCycleState' }, s.entries[2].tabId);
  assert.equal(c.currentSite.label, 'C'); assert.equal(c.currentIndex, 1); assert.equal(c.totalSites, 2);
  f.advance(8000); const current = f.state();
  await f.send({ type: 'rotationDue', token: current.token }, current.activeTabId); await f.flush();
  assert.ok(f.reloads.includes(s.entries[2].tabId));
  assert.ok(!f.reloads.includes(s.entries[0].tabId));
});
test('single remaining tab has no rotation deadline', async () => {
  const f = fixture(); await f.start(); const s = f.state();
  await f.remove(s.entries[2].tabId); await f.remove(s.entries[1].tabId);
  assert.equal(f.state().nextSwitchAt, null); assert.equal(f.alarms.size, 0);
});
test('switching to unrelated tab pauses without stealing focus', async () => {
  const f = fixture(); await f.start(); await f.chrome.tabs.update(1, { active: true }); await f.flush();
  f.advance(30000); await f.alarm();
  assert.equal(f.tabs.find(t => t.active).id, 1); assert.equal(f.state().paused, true);
});
test('toolbar stop clears state and removes overlays without closing pages', async () => {
  const f = fixture(); await f.start(); const count = f.tabs.length; await f.start();
  assert.equal(f.state().entries.length, 0); assert.equal(f.alarms.size, 0); assert.equal(f.tabs.length, count);
  assert.ok(f.messages.slice(-3).every(m => !m.message.state.managed));
});
test('browser restart clears session-specific tab references', async () => {
  const f = fixture(); await f.start(); await f.emit(f.chrome.runtime.onStartup);
  assert.equal(f.state().entries.length, 0);
});
test('unmanaged tabs cannot pause a running kiosk', async () => {
  const f = fixture(); await f.start(); assert.equal((await f.send({ type: 'setPaused', paused: true }, 1)).success, false);
  assert.equal(f.state().paused, false);
});
test('exact URL matching rejects spoofed host and path/query collisions', () => {
  const f = fixture(), match = f.ctx.KioskCore.urlMatchesSite, site = { url: 'https://a.example/dashboard' };
  assert.equal(match('https://a.example/dashboard', site), true);
  for (const url of ['https://a.example.evil.test/dashboard', 'https://evil.test/?next=https://a.example/dashboard', 'https://a.example/dashboard-2']) assert.equal(match(url, site), false);
});
test('invalid interval, duplicate URL, credential URL and non-web protocol fail validation', () => {
  const f = fixture(); const validate = f.ctx.KioskCore.validateConfig;
  for (const config of [{ rotationSeconds: NaN, sites: [] }, { sites: [{ url: 'file:///secret' }] },
    { sites: [{ url: 'https://user:pass@example.com' }] }, { sites: [{ url: 'https://example.com' }, { url: 'https://example.com/' }] }]) assert.throws(() => validate(config));
});
test('typing and interactive controls keep their keyboard behavior, including shadow DOM', () => {
  const f = fixture(), ignore = f.ctx.KioskCore.shouldIgnoreKey;
  for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A']) assert.equal(ignore({ target: { tagName } }), true);
  assert.equal(ignore({ composedPath: () => [{ tagName: 'SPAN' }, { isContentEditable: true }] }), true);
  assert.equal(ignore({ ctrlKey: true }), true); assert.equal(ignore({ isComposing: true }), true);
  assert.equal(ignore({ target: { tagName: 'DIV' } }), false);
});

test('rapid stop and restart keep state versions increasing', async () => {
  const f = fixture(); await f.start();
  const s = f.state(); await f.send({ type: 'setPaused', paused: true }, s.activeTabId);
  await f.start(); const stopped = f.state().version;
  await f.start(); assert.ok(f.state().version > stopped);
});
