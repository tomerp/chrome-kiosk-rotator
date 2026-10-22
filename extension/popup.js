(() => {
  const $ = (id) => document.getElementById(id);
  let state = null, busy = false, readVersion = 0;
  async function request(message) {
    const response = await chrome.runtime.sendMessage(message);
    if (!response?.success) throw new Error(response?.error || 'Could not reach the extension. Reopen this popup and try again.');
    return response;
  }
  function render() {
    const running = Boolean(state?.running);
    const paused = Boolean(state?.paused);
    $('status').textContent = !state ? 'Loading…' : running ? (paused ? 'Paused' : 'Rotating') : 'Ready to start';
    $('light').className = `light ${running ? paused ? 'paused' : 'running' : ''}`;
    $('detail').textContent = !state ? 'Getting your display ready.' : running
      ? state.currentLabel ? `${paused ? 'Paused on' : 'Showing'} ${state.currentLabel}` : 'Return to your display with Resume.'
      : 'Start your saved pages in this window.';
    const count = running ? state.totalSites : state?.config.sites.length;
    $('pages').textContent = `${count ?? '—'} ${count === 1 ? 'page' : 'pages'}`;
    $('timing').textContent = `${state?.config.rotationSeconds ?? '—'} seconds`;
    $('overlay').textContent = state?.config.showOverlay === false ? 'Overlay hidden' : 'Overlay on';
    $('access').hidden = !state?.missingOrigins.length;
    $('start').hidden = running;
    $('pause').hidden = !running;
    $('pause').textContent = paused ? 'Resume' : 'Pause';
    $('start').disabled = busy || !state;
    $('pause').disabled = busy || !state;
    $('stop').disabled = busy || !running;
  }
  async function refresh() {
    const version = ++readVersion;
    try {
      const result = await request({ type: 'getControlState' });
      if (version === readVersion) { state = result; render(); }
    } catch (error) { $('message').textContent = error.message; }
  }
  async function run(action) {
    if (busy || !state) return;
    const snapshot = state;
    busy = true; render(); $('message').textContent = '';
    try {
      if (action === 'start' || action === 'resume') {
        // Invoke directly in the click gesture. Do not await a background request first.
        const granted = await chrome.permissions.request({ origins: KioskCore.permissionOrigins(snapshot.config) });
        if (!granted) throw new Error('Site access was not granted. Allow access to start or resume.');
      }
      if (action === 'start') {
        const currentWindow = await chrome.windows.getCurrent();
        await request({ type: 'startCycle', revision: snapshot.revision, windowId: currentWindow.id });
      } else {
        await request({ type: 'controlCycle', action, revision: snapshot.revision });
      }
      await refresh();
    } catch (error) { $('message').textContent = error.message; await refresh(); }
    finally { busy = false; render(); }
  }
  $('start').addEventListener('click', () => run('start'));
  $('pause').addEventListener('click', () => run(state?.paused ? 'resume' : 'pause'));
  $('stop').addEventListener('click', () => run('stop'));
  $('settings').addEventListener('click', async () => {
    try { await chrome.runtime.openOptionsPage(); window.close(); }
    catch (error) { $('message').textContent = error.message; }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.kioskCycleV2 || changes.kioskSettingsV1)) refresh();
  });
  chrome.permissions.onRemoved.addListener(refresh);
  chrome.permissions.onAdded.addListener(refresh);
  refresh();
})();
