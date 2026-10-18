importScripts("config.js", "core.js");

const stateKey = "kioskCycleV2";
const alarmName = "kioskRecovery";
const settingsKey = "kioskSettingsV1";
let savedSettings = null;
let queue = Promise.resolve();
function serial(task) {
  const result = queue.then(async () => {
    savedSettings = (await chrome.storage.local.get(settingsKey))[settingsKey] || null;
    return task();
  });
  queue = result.catch((error) => console.warn("Kiosk operation failed:", error.message));
  return result;
}
function configuration() { return KioskCore.validateConfig(savedSettings?.config || globalThis.KIOSK_CONFIG); }
function isSettingsPage(sender) {
  return sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL("options.html");
}
async function handleSettings(message, sender) {
  if (!isSettingsPage(sender)) return { success: false, error: "Open the extension settings to make changes." };
  if (message.type === "getSettings") {
    return { success: true, config: configuration(), revision: savedSettings?.revision || null };
  }
  if (message.type === "saveSettings") {
    const config = KioskCore.validateConfig(message.config);
    if (message.revision !== (savedSettings?.revision || null)) {
      return { success: false, error: "Settings changed in another tab. Reload saved settings before saving again." };
    }
    // Stop with the old configuration before changing site indexes. Leave pages open.
    await stop(await readState());
    const next = { config, revision: crypto.randomUUID() };
    await chrome.storage.local.set({ [settingsKey]: next });
    savedSettings = next;
    return { success: true, ...next };
  }
  if (message.type === "startCycle") {
    if (message.revision !== (savedSettings?.revision || null)) {
      return { success: false, error: "Settings changed in another tab. Reload saved settings first." };
    }
    if (!Number.isInteger(message.windowId)) throw new Error("Open settings in a Chrome window to start.");
    await setupCycle(message.windowId);
    return { success: true };
  }
}
function emptyState() {
  return { windowId: null, entries: [], activeTabId: null, paused: false,
    nextSwitchAt: null, token: null, version: Date.now() };
}
async function readState() {
  const result = await chrome.storage.local.get(stateKey);
  return result[stateKey] || emptyState();
}
function describe(state, tabId) {
  const index = state.entries.findIndex((entry) => entry.tabId === tabId);
  return { managed: index >= 0, active: tabId === state.activeTabId,
    currentIndex: index, totalSites: state.entries.length,
    currentSite: index >= 0 ? configuration().sites[state.entries[index].siteIndex] : null,
    paused: state.paused, nextSwitchAt: state.nextSwitchAt,
    token: state.token, version: state.version };
}
async function commit(state, previousEntries = []) {
  state.version += 1;
  await chrome.storage.local.set({ [stateKey]: state });
  await chrome.alarms.clear(alarmName);
  if (state.nextSwitchAt !== null) {
    // Deliberately >=30 seconds even when unpacked, to match packaged behavior.
    await chrome.alarms.create(alarmName, { when: Math.max(Date.now() + 30000, state.nextSwitchAt) });
  }
  const ids = new Set([...previousEntries, ...state.entries].map((entry) => entry.tabId));
  await Promise.all([...ids].map((tabId) => chrome.tabs.sendMessage(tabId,
    { type: "cycleState", state: describe(state, tabId) }).catch(() => {})));
}
function resetDeadline(state) {
  state.token = crypto.randomUUID();
  state.nextSwitchAt = !state.paused && state.entries.length > 1
    ? Date.now() + configuration().rotationSeconds * 1000 : null;
}
async function activeTab(state) {
  if (!Number.isInteger(state.windowId)) return null;
  const tabs = await chrome.tabs.query({ windowId: state.windowId, active: true });
  return tabs[0] || null;
}
async function stop(state) {
  const previous = state.entries;
  const next = { ...emptyState(), version: state.version };
  await commit(next, previous);
}
async function refreshInactive(state) {
  const sites = configuration().sites;
  for (const entry of state.entries) {
    const interval = sites[entry.siteIndex]?.refreshEverySeconds * 1000;
    if (entry.tabId === state.activeTabId || !interval || Date.now() - entry.lastRefreshAt < interval) continue;
    try {
      await chrome.tabs.reload(entry.tabId);
      entry.lastRefreshAt = Date.now();
    } catch { /* Closed tabs are reconciled by onRemoved. */ }
  }
}
async function selectTab(state, tabId) {
  state.activeTabId = tabId;
  resetDeadline(state);
  // Persist before activation so its event cannot reset the interval twice.
  await commit(state);
  try {
    await chrome.tabs.update(tabId, { active: true });
    await refreshInactive(state);
    await chrome.storage.local.set({ [stateKey]: state });
  } catch {
    await removeTab(tabId);
  }
}
async function setupCycle(windowId) {
  const { sites } = configuration();
  const previous = await readState();
  if (previous.entries.length) await stop(previous);
  const existing = await chrome.tabs.query({ windowId });
  const state = { ...emptyState(), windowId, version: Math.max(Date.now(), previous.version + 2) };
  for (let siteIndex = 0; siteIndex < sites.length; siteIndex += 1) {
    const site = sites[siteIndex];
    let tab = existing.find((candidate) =>
      !state.entries.some((entry) => entry.tabId === candidate.id) && KioskCore.urlMatchesSite(candidate.url, site));
    if (!tab) tab = await chrome.tabs.create({ windowId, url: site.url, active: false });
    state.entries.push({ tabId: tab.id, siteIndex, lastRefreshAt: Date.now() });
  }
  state.activeTabId = state.entries[0].tabId;
  resetDeadline(state);
  await commit(state);
  // Reused tabs may predate extension installation. Content initialization is idempotent.
  await Promise.all(state.entries.map(({ tabId }) => chrome.scripting.executeScript({
    target: { tabId }, files: ["core.js", "content.js"]
  }).catch(() => {})));
  await chrome.tabs.update(state.activeTabId, { active: true });
}
async function rotate(state, offset = 1) {
  const current = await activeTab(state);
  const index = state.entries.findIndex((entry) => entry.tabId === current?.id);
  // Respect the user switching away from the rotation.
  if (index < 0) { state.paused = true; resetDeadline(state); await commit(state); return; }
  const next = (index + offset + state.entries.length) % state.entries.length;
  await selectTab(state, state.entries[next].tabId);
}
async function removeTab(tabId) {
  const state = await readState();
  if (!state.entries.some((entry) => entry.tabId === tabId)) return;
  state.entries = state.entries.filter((entry) => entry.tabId !== tabId);
  if (!state.entries.length) { await stop(state); return; }
  const active = await activeTab(state);
  state.activeTabId = state.entries.some((entry) => entry.tabId === active?.id) ? active.id : null;
  if (state.activeTabId === null) state.paused = true;
  resetDeadline(state);
  await commit(state);
}
async function handleMessage(message, sender) {
  if (["getSettings", "saveSettings", "startCycle"].includes(message.type)) return handleSettings(message, sender);
  const state = await readState();
  const tabId = sender.tab?.id;
  if (sender.frameId !== 0 || !Number.isInteger(tabId)) return { success: false };
  if (message.type === "getCycleState") return describe(state, tabId);
  const current = await activeTab(state);
  if (!state.entries.some((entry) => entry.tabId === tabId) || current?.id !== tabId) return { success: false };
  if (message.type === "rotationDue") {
    // Reject stale, early, duplicate and paused requests, including concurrent alarm events.
    if (state.paused || state.nextSwitchAt === null || message.token !== state.token ||
        Date.now() < state.nextSwitchAt || tabId !== state.activeTabId) return { success: false };
    await rotate(state);
  } else if (message.type === "activateRelativeTab") {
    if (![1, -1].includes(message.offset)) return { success: false };
    await rotate(state, message.offset);
  } else if (message.type === "setPaused") {
    state.paused = Boolean(message.paused);
    state.activeTabId = tabId;
    resetDeadline(state);
    await commit(state);
  } else return { success: false };
  return { success: true };
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!["getCycleState", "rotationDue", "activateRelativeTab", "setPaused", "getSettings", "saveSettings", "startCycle"].includes(message?.type)) return;
  serial(() => handleMessage(message, sender)).then(sendResponse, (error) => sendResponse({ success: false, error: error.message }));
  return true;
});
chrome.action.onClicked.addListener((tab) => {
  serial(async () => {
    const state = await readState();
    if (state.entries.length) await stop(state);
    else if (Number.isInteger(tab.windowId)) await setupCycle(tab.windowId);
    await chrome.action.setBadgeText({ text: "" });
    await chrome.action.setTitle({ title: "Start or stop kiosk rotation" });
  }).catch(async (error) => {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setTitle({ title: `Kiosk error: ${error.message}` });
  });
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== alarmName) return;
  serial(async () => {
    const state = await readState();
    if (!state.paused && state.nextSwitchAt !== null && Date.now() >= state.nextSwitchAt) await rotate(state);
  });
});
chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  serial(async () => {
    const state = await readState();
    if (windowId !== state.windowId || !state.entries.length) return;
    const active = await activeTab(state);
    if (active?.id !== tabId) return; // An older activation event.
    if (!state.entries.some((entry) => entry.tabId === tabId)) {
      state.paused = true;
      state.activeTabId = null;
    } else if (state.activeTabId === tabId) return;
    else state.activeTabId = tabId;
    resetDeadline(state);
    await refreshInactive(state);
    await commit(state);
  });
});
chrome.tabs.onRemoved.addListener((tabId) => { serial(() => removeTab(tabId)); });
chrome.windows.onRemoved.addListener((windowId) => {
  serial(async () => { const state = await readState(); if (state.windowId === windowId) await stop(state); });
});
// Tab IDs are session-specific. A browser restart intentionally requires Start.
chrome.runtime.onStartup.addListener(() => { serial(async () => stop(await readState())); });
chrome.runtime.onInstalled.addListener((details) => {
  serial(async () => {
    await stop(await readState());
    if (details?.reason === "install") await chrome.runtime.openOptionsPage();
  });
});
