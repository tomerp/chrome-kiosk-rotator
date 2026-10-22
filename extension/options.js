(() => {
  const $ = (id) => document.getElementById(id);
  const form = $('settings-form'), editor = $('editor'), list = $('page-list');
  let currentConfig = null;
  let sites = [], revision = null, baseline = '', dirty = false, busy = false, loaded = false;
  function report(text, error = false) {
    $('message').textContent = text;
    $('message').classList.toggle('error', error);
  }
  async function request(message) {
    if (!globalThis.chrome?.runtime?.id) throw new Error('Open this page from the installed Chrome Kiosk Rotator extension.');
    const response = await chrome.runtime.sendMessage(message);
    if (!response?.success) throw new Error(response?.error || 'The extension did not respond. Reload this page and try again.');
    return response;
  }
  function unitFor(seconds) {
    if (seconds > 0 && seconds % 3600 === 0) return 3600;
    if (seconds > 0 && seconds % 60 === 0) return 60;
    return 1;
  }
  function draftFrom(config) {
    return config.sites.map((site) => {
      const unit = unitFor(site.refreshEverySeconds);
      return { ...site, refreshValue: String(site.refreshEverySeconds / unit), refreshUnit: String(unit) };
    });
  }
  function snapshot() {
    return JSON.stringify({ rotation: $('rotation').value, showOverlay: $('show-overlay').checked, sites });
  }
  function updateDirty() {
    dirty = loaded && snapshot() !== baseline;
    $('save-state').textContent = !loaded ? 'Loading settings…' : dirty ? 'Unsaved changes' : 'All changes saved';
    $('save').disabled = busy || !dirty;
    $('start').disabled = busy || dirty || !sites.length;
    $('page-count').textContent = sites.length;
    $('empty').hidden = sites.length > 0;
  }
  function setBusy(value) {
    busy = value;
    editor.disabled = value || !loaded;
    updateDirty();
  }
  function render(focus = null) {
    list.replaceChildren();
    sites.forEach((site, index) => {
      const row = $('page-template').content.firstElementChild.cloneNode(true);
      const number = index + 1;
      const title = () => site.label || `Page ${number}`;
      row.querySelector('.page-number').textContent = String(number).padStart(2, '0');
      row.querySelector('.page-title').textContent = title();
      const name = row.querySelector('[data-field="label"]');
      const url = row.querySelector('[data-field="url"]');
      const refresh = row.querySelector('[data-field="refresh"]');
      const unit = row.querySelector('[data-field="unit"]');
      name.value = site.label || ''; url.value = site.url || '';
      refresh.value = site.refreshValue; unit.value = site.refreshUnit;
      name.setAttribute('aria-label', `Page ${number} name`);
      url.setAttribute('aria-label', `Page ${number} URL`);
      refresh.id = `refresh-${number}`;
      refresh.setAttribute('aria-label', `Page ${number} refresh interval`);
      row.querySelector('.refresh-label').htmlFor = refresh.id;
      unit.setAttribute('aria-label', `Page ${number} refresh unit`);
      for (const [input, property] of [[name, 'label'], [url, 'url'], [refresh, 'refreshValue'], [unit, 'refreshUnit']]) {
        input.addEventListener('input', () => {
          site[property] = input.value;
          row.querySelector('.page-title').textContent = title();
          updateDirty(); report('');
        });
      }
      const up = row.querySelector('.move-up'), down = row.querySelector('.move-down');
      up.disabled = index === 0; down.disabled = index === sites.length - 1;
      up.setAttribute('aria-label', `Move page ${number} up`);
      down.setAttribute('aria-label', `Move page ${number} down`);
      const move = (offset) => {
        const next = index + offset;
        [sites[index], sites[next]] = [sites[next], sites[index]];
        render({ index: next, field: 'label' }); updateDirty();
        report(`${title()} moved to position ${next + 1}.`);
      };
      up.addEventListener('click', () => move(-1));
      down.addEventListener('click', () => move(1));
      const remove = row.querySelector('.remove');
      remove.setAttribute('aria-label', `Remove page ${number}`);
      remove.addEventListener('click', () => {
        sites.splice(index, 1); render({ index: Math.min(index, sites.length - 1), field: 'label' });
        updateDirty(); report('Page removed. Save settings to apply.');
        if (!sites.length) $('add-page').focus();
      });
      list.append(row);
    });
    if (focus?.index >= 0) list.children[focus.index]?.querySelector(`[data-field="${focus.field}"]`)?.focus();
  }
  async function load() {
    setBusy(true); report(''); $('fatal').hidden = true;
    try {
      const result = await request({ type: 'getSettings' });
      currentConfig = result.config;
      $('show-overlay').checked = result.config.showOverlay;
      sites = draftFrom(result.config); revision = result.revision;
      $('rotation').value = result.config.rotationSeconds;
      render(); baseline = snapshot(); loaded = true;
    } catch (error) {
      report(error.message, true);
      $('fatal').hidden = false;
    } finally { setBusy(false); }
  }
  $('show-overlay').addEventListener('change', () => { updateDirty(); report(''); });
  $('rotation').addEventListener('input', () => { updateDirty(); report(''); });
  $('add-page').addEventListener('click', () => {
    sites.push({ url: '', label: '', refreshValue: '0', refreshUnit: '1' });
    render({ index: sites.length - 1, field: 'url' }); updateDirty(); report('');
  });
  $('reload').addEventListener('click', () => {
    if (!dirty || window.confirm('Discard unsaved changes and reload saved settings?')) load();
  });
  $('retry').addEventListener('click', load);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !loaded || !dirty || !form.reportValidity()) return;
    let config;
    try {
      config = KioskCore.validateConfig({ rotationSeconds: $('rotation').value, showOverlay: $('show-overlay').checked, sites: sites.map((site) => {
        const { refreshValue, refreshUnit, ...saved } = site;
        return { ...saved, refreshEverySeconds: refreshValue === '' ? '' : Number(refreshValue) * Number(refreshUnit) };
      }) });
    } catch (error) { report(error.message, true); $('message').focus(); return; }
    setBusy(true); report('Saving…');
    try {
      // The permission prompt must be invoked directly in this user gesture, before other awaits.
      const granted = await chrome.permissions.request({ origins: KioskCore.permissionOrigins(config) });
      if (!granted) throw new Error('Site access was not granted. Your changes are still here; allow access to save them.');
      const result = await request({ type: 'saveSettings', config, revision });
      currentConfig = result.config;
      revision = result.revision; sites = draftFrom(result.config);
      $('rotation').value = result.config.rotationSeconds;
      render(); baseline = snapshot();
      report('Settings saved. Select Start display when you’re ready.');
    } catch (error) { report(error.message, true); }
    finally { setBusy(false); }
  });
  $('start').addEventListener('click', async () => {
    if (dirty || busy) return;
    setBusy(true); report('Starting display…');
    try {
      const granted = await chrome.permissions.request({ origins: KioskCore.permissionOrigins(currentConfig) });
      if (!granted) throw new Error('Site access was not granted. Allow access to start your display.');
      const window = await chrome.windows.getCurrent();
      await request({ type: 'startCycle', revision, windowId: window.id });
      report('Display started. Use the toolbar icon to stop, or Space on a display page to pause.');
    } catch (error) { report(error.message, true); }
    finally { setBusy(false); }
  });
  window.addEventListener('beforeunload', (event) => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });
  load();
})();
