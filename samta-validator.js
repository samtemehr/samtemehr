(function () {
  'use strict';

  const EP = {
    list:   'https://ezam.balagh.ir/_api/V02/SamtaEzam/graphql',
    update: 'https://ezam.balagh.ir/_api/V02/Samta/graphql'
  };

  const LIST_QUERY = `query($pageIndex: Int, $pageSize: Int) {
  baseRegion(pageIndex: $pageIndex, pageSize: $pageSize) {
    data {
      id regionName regionAddress enumCStatusBaseRegion lat notFind
      refcountryDivision { mLevel name }
      refBasetypePointBaseRegion { title }
    }
    pageIndex pageSize count status
  }
}`;

  const UPDATE_MUTATION = `mutation($id: String!, $enumCStatusBaseRegion: String!) {
  updateIsActiveBaseRegion(input: { id: $id, enumCStatusBaseRegion: $enumCStatusBaseRegion }) {
    data { outDto { id } }
    status
    message { messageStr code }
  }
}`;

  /* ─── State ─────────────────────────────────────────────────── */
  const S = {
    token:            null,
    page:             1,
    pgSize:           50,
    total:            0,
    records:          [],
    stats:            { active: 0, inactive: 0 },
    busy:             false,
    capturedListBody: null,
    started:          false
  };

  /* ─── Helpers ────────────────────────────────────────────────── */
  function rmEl(id) { document.getElementById(id)?.remove(); }

  function showSpinner(msg) {
    rmEl('__sv_spin');
    const d = document.createElement('div');
    d.id = '__sv_spin';
    d.style.cssText =
      'position:fixed;top:18px;right:18px;z-index:9999999;background:#4f46e5;color:#fff;' +
      'padding:11px 18px;border-radius:10px;font-family:Tahoma;font-size:14px;direction:rtl;' +
      'box-shadow:0 4px 20px rgba(0,0,0,.4);max-width:320px;line-height:1.5;';
    d.textContent = msg;
    document.body.appendChild(d);
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g,
      c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function getOstan(divs) {
    return divs?.find(d => d.mLevel === 'OSTAN')?.name || '';
  }

  /* ─── Token discovery ────────────────────────────────────────── */
  function findTokenInStorage() {
    function isJWT(v) {
      return typeof v === 'string' && v.startsWith('eyJ') && v.split('.').length === 3;
    }
    function searchObj(obj) {
      if (!obj || typeof obj !== 'object') return null;
      for (const v of Object.values(obj)) {
        if (isJWT(v)) return v;
        const found = searchObj(v);
        if (found) return found;
      }
      return null;
    }
    // Cookie
    const c = (document.cookie.match(/SmtSbrEzam=([^;]*)/) || [])[1];
    if (c) return c;
    // localStorage / sessionStorage
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i++) {
        const raw = store.getItem(store.key(i));
        if (isJWT(raw)) return raw;
        try { const j = searchObj(JSON.parse(raw)); if (j) return j; } catch(_) {}
      }
    }
    return null;
  }

  /* ─── Intercept fetch ────────────────────────────────────────── */
  const _fetch = window.fetch.bind(window);
  window.fetch = async function (url, opts) {
    // Grab token from outgoing Authorization header
    if (!S.token && opts?.headers) {
      const h = opts.headers;
      const auth = typeof h.get === 'function'
        ? h.get('Authorization')
        : (h['Authorization'] || h['authorization'] || '');
      if (auth && auth.startsWith('Bearer ')) {
        S.token = auth.slice(7);
        if (!S.started) { S.started = true; rmEl('__sv_spin'); loadAndRender(1); }
      }
    }
    const res = await _fetch(url, opts);
    // Capture list query body
    if (typeof url === 'string' && url.includes('SamtaEzam/graphql') && opts?.body && !S.capturedListBody) {
      try {
        const json = await res.clone().json();
        if (json?.data?.baseRegion) S.capturedListBody = JSON.parse(opts.body);
      } catch(_) {}
    }
    return res;
  };

  /* ─── API ────────────────────────────────────────────────────── */
  async function gql(url, body) {
    const res = await _fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + S.token,
        'Accept':        'application/json, text/plain, */*'
      },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  async function fetchPage(page) {
    let body;
    if (S.capturedListBody) {
      body = JSON.parse(JSON.stringify(S.capturedListBody));
      if (body.variables) {
        for (const k of Object.keys(body.variables)) {
          const kl = k.toLowerCase();
          if (kl.includes('index') || kl === 'page' || kl === 'pagenumber') body.variables[k] = page;
          if (kl.includes('size') || kl.includes('limit') || kl.includes('perpage')) body.variables[k] = S.pgSize;
        }
      }
    } else {
      body = { query: LIST_QUERY, variables: { pageIndex: page, pageSize: S.pgSize } };
    }
    const json = await gql(EP.list, body);
    console.log('[SV] fetchPage response:', JSON.stringify(json).slice(0, 600));
    if (json?.errors?.length) throw new Error(json.errors.map(e => e.message).join(' | '));
    return json?.data?.baseRegion ?? null;
  }

  async function updateStatus(id, status) {
    const json = await gql(EP.update, {
      query:     UPDATE_MUTATION,
      variables: { id, enumCStatusBaseRegion: status }
    });
    const ok = json?.data?.updateIsActiveBaseRegion?.status === 'OK';
    if (!ok) console.error('[SV] update failed', json);
    return ok;
  }

  /* ─── CSS ────────────────────────────────────────────────────── */
  const CSS = `
#__sv_ov{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9999998;display:flex;align-items:center;justify-content:center}
#__sv_box{background:#fff;border-radius:14px;width:96%;max-width:980px;height:92vh;display:flex;flex-direction:column;overflow:hidden;direction:rtl;font-family:Tahoma,sans-serif}
#__sv_hd{background:#4f46e5;color:#fff;padding:13px 18px;display:flex;align-items:center;gap:12px}
#__sv_hd h2{margin:0;font-size:17px;flex:1}
.sv-stat{font-size:12px;opacity:.88;line-height:1.7;text-align:left}
#__sv_ctrl{padding:9px 13px;background:#f0f0ff;border-bottom:1px solid #ddd;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.sv-bar{width:100%;height:7px;background:#d1d5db;border-radius:4px;margin-top:5px}
.sv-bar-fill{height:100%;background:#22c55e;border-radius:4px;transition:width .4s}
#__sv_lst{flex:1;overflow-y:auto;padding:10px 12px}
.sv-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:7px;background:#fafafa}
.sv-row.sv-a{background:#f0fff4;border-color:#86efac}
.sv-row.sv-n{background:#fff5f5;border-color:#fca5a5}
.sv-inf{flex:1;min-width:0}
.sv-nm{font-weight:700;font-size:14px;color:#111}
.sv-ad{font-size:12px;color:#555;margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.sv-mt{font-size:11px;color:#888;margin-top:3px}
.sv-bdg{display:inline-block;font-size:11px;padding:2px 8px;border-radius:10px;margin-top:4px}
.sv-ba{background:#dcfce7;color:#166534}
.sv-bn{background:#fee2e2;color:#991b1b}
.sv-bc{background:#fef9c3;color:#854d0e}
.sv-acts{display:flex;gap:6px;flex-shrink:0}
.sv-btn{border:none;cursor:pointer;padding:6px 13px;border-radius:6px;font-size:13px;font-family:Tahoma;transition:opacity .2s}
.sv-btn:hover{opacity:.85}
.sv-btn:disabled{opacity:.35;cursor:default}
.sv-ok{background:#22c55e;color:#fff}
.sv-no{background:#ef4444;color:#fff}
.sv-nav{background:#4f46e5;color:#fff;padding:7px 16px}
.sv-bok{background:#16a34a;color:#fff;padding:7px 16px}
.sv-bno{background:#dc2626;color:#fff;padding:7px 16px}
#__sv_ft{padding:9px 13px;background:#f0f0ff;border-top:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.sv-cls{background:#6b7280;color:#fff;border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-family:Tahoma}
`;

  /* ─── Status map ─────────────────────────────────────────────── */
  const STAT = {
    BASEREGIONACTIVE:    { lbl: '✅ فعال',         cls: 'sv-a', badge: 'sv-ba' },
    BASEREGIONNONACTIVE: { lbl: '❌ غیرفعال',      cls: 'sv-n', badge: 'sv-bn' },
    BASEREGIONCHEKING:   { lbl: '⏳ در حال بررسی', cls: '',     badge: 'sv-bc' }
  };

  /* ─── Render ─────────────────────────────────────────────────── */
  function renderPanel() {
    rmEl('__sv_ov');
    const totalPages = Math.ceil(S.total / S.pgSize);
    const done = S.stats.active + S.stats.inactive;
    const pct  = S.total ? Math.round(done / S.total * 100) : 0;

    const ov = document.createElement('div');
    ov.id = '__sv_ov';
    ov.innerHTML = `
<style>${CSS}</style>
<div id="__sv_box">
  <div id="__sv_hd">
    <h2>🔍 بررسی نقاط تبلیغی</h2>
    <div class="sv-stat">
      صفحه ${S.page} از ${totalPages} &nbsp;|&nbsp; کل: ${S.total.toLocaleString('fa-IR')} نقطه<br>
      ✅ ${S.stats.active} فعال &nbsp; ❌ ${S.stats.inactive} غیرفعال &nbsp;— ${pct}٪ بررسی‌شده
    </div>
  </div>
  <div id="__sv_ctrl">
    <button class="sv-btn sv-bok" id="__sv_bok">✅ فعال کردن همه این صفحه</button>
    <button class="sv-btn sv-bno" id="__sv_bno">❌ غیرفعال کردن همه این صفحه</button>
    <span style="font-size:12px;color:#555;margin-right:auto">نمایش ${S.records.length} نقطه</span>
    <div class="sv-bar"><div class="sv-bar-fill" id="__sv_bar" style="width:${pct}%"></div></div>
  </div>
  <div id="__sv_lst">${S.records.map(rowHTML).join('')}</div>
  <div id="__sv_ft">
    <button class="sv-btn sv-nav" id="__sv_prev" ${S.page <= 1 ? 'disabled' : ''}>« صفحه قبل</button>
    <span style="font-size:13px;color:#444">صفحه ${S.page} از ${totalPages} &nbsp;|&nbsp; پیشرفت: ${pct}٪</span>
    <button class="sv-btn sv-nav" id="__sv_next" ${S.page >= totalPages ? 'disabled' : ''}>صفحه بعد »</button>
    <button class="sv-cls" id="__sv_cls">✕ بستن</button>
  </div>
</div>`;
    document.body.appendChild(ov);

    document.getElementById('__sv_prev').onclick = () => navigate(-1);
    document.getElementById('__sv_next').onclick = () => navigate(+1);
    document.getElementById('__sv_cls').onclick  = closePanel;
    document.getElementById('__sv_bok').onclick  = () => batchSet('BASEREGIONACTIVE');
    document.getElementById('__sv_bno').onclick  = () => batchSet('BASEREGIONNONACTIVE');
  }

  function rowHTML(r) {
    const info  = STAT[r.enumCStatusBaseRegion] || { lbl: r.enumCStatusBaseRegion, cls: '', badge: '' };
    const ostan = getOstan(r.refcountryDivision);
    const type  = r.refBasetypePointBaseRegion?.title || '';
    return `
<div class="sv-row ${info.cls}" id="__svr_${r.id}">
  <div class="sv-inf">
    <div class="sv-nm">${esc(r.regionName)}</div>
    <div class="sv-ad">${esc(r.regionAddress)}</div>
    <div class="sv-mt">${ostan ? '📍 ' + esc(ostan) + '  ' : ''}${type ? '🏛 ' + esc(type) : ''}${r.lat ? '' : '  ⚠️ بدون مختصات'}</div>
    <span class="sv-bdg ${info.badge}" id="__svb_${r.id}">${info.lbl}</span>
  </div>
  <div class="sv-acts">
    <button class="sv-btn sv-ok" onclick="__sv.set('${r.id}','BASEREGIONACTIVE',this)">✅ فعال</button>
    <button class="sv-btn sv-no" onclick="__sv.set('${r.id}','BASEREGIONNONACTIVE',this)">❌ غیرفعال</button>
  </div>
</div>`;
  }

  /* ─── Row update ─────────────────────────────────────────────── */
  function applyRowChange(id, status) {
    const info = STAT[status];
    const row  = document.getElementById('__svr_' + id);
    const bdg  = document.getElementById('__svb_' + id);
    if (row) row.className = 'sv-row ' + info.cls;
    if (bdg) { bdg.className = 'sv-bdg ' + info.badge; bdg.textContent = info.lbl; }
    const rec = S.records.find(r => r.id === id);
    if (rec) rec.enumCStatusBaseRegion = status;
    if (status === 'BASEREGIONACTIVE') S.stats.active++;
    else S.stats.inactive++;
    const pct = S.total ? Math.round((S.stats.active + S.stats.inactive) / S.total * 100) : 0;
    const bar = document.getElementById('__sv_bar');
    if (bar) bar.style.width = pct + '%';
  }

  /* ─── Global onclick handler ─────────────────────────────────── */
  window.__sv = {
    set: async function (id, status) {
      if (S.busy) return;
      const row = document.getElementById('__svr_' + id);
      row?.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const ok = await updateStatus(id, status);
      if (ok) {
        applyRowChange(id, status);
      } else {
        row?.querySelectorAll('button').forEach(b => { b.disabled = false; });
        alert('❌ خطا در ثبت! لطفاً دوباره تلاش کنید.');
      }
    }
  };

  /* ─── Batch actions ──────────────────────────────────────────── */
  async function batchSet(status) {
    if (S.busy) return;
    const lbl  = status === 'BASEREGIONACTIVE' ? 'فعال' : 'غیرفعال';
    const todo = S.records.filter(r => r.enumCStatusBaseRegion !== status);
    if (!todo.length) { alert('همه نقاط این صفحه قبلاً ' + lbl + ' هستند.'); return; }
    if (!confirm(todo.length + ' نقطه "' + lbl + '" می‌شوند. ادامه می‌دهید؟')) return;

    S.busy = true;
    document.getElementById('__sv_bok').disabled = true;
    document.getElementById('__sv_bno').disabled = true;

    for (const r of todo) {
      const row = document.getElementById('__svr_' + r.id);
      row?.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const ok = await updateStatus(r.id, status);
      if (ok) applyRowChange(r.id, status);
      else row?.querySelectorAll('button').forEach(b => { b.disabled = false; });
      await sleep(500);
    }

    S.busy = false;
    document.getElementById('__sv_bok').disabled = false;
    document.getElementById('__sv_bno').disabled = false;
  }

  async function navigate(dir) {
    if (S.busy) return;
    await loadAndRender(S.page + dir);
  }

  function closePanel() {
    rmEl('__sv_ov');
    window.fetch = _fetch;
    delete window.__sv;
  }

  /* ─── Load + render ──────────────────────────────────────────── */
  async function loadAndRender(page) {
    showSpinner('⏳ در حال بارگذاری صفحه ' + page + '...');
    try {
      const data = await fetchPage(page);
      rmEl('__sv_spin');
      if (!data) { alert('❌ خطا در دریافت داده از سرور.'); return; }
      S.total   = data.count;
      S.page    = data.pageIndex;
      S.records = data.data || [];
      renderPanel();
    } catch (e) {
      rmEl('__sv_spin');
      alert('❌ خطا: ' + e.message);
    }
  }

  /* ─── Boot ───────────────────────────────────────────────────── */
  S.token = findTokenInStorage();

  if (S.token) {
    S.started = true;
    showSpinner('⏳ در حال اتصال به سرور...');
    loadAndRender(1);
  } else {
    // Token not in storage — wait for the page to make its next API call
    showSpinner('⏳ در حال یافتن توکن...\nلطفاً چند ثانیه صبر کنید یا صفحه‌بندی را تغییر دهید');
    setTimeout(function () {
      if (!S.token) {
        rmEl('__sv_spin');
        const t = prompt(
          'توکن به‌طور خودکار پیدا نشد.\n\n' +
          'لطفاً:\n' +
          '1. DevTools → Network را باز کنید\n' +
          '2. روی هر درخواست graphql کلیک کنید\n' +
          '3. تب Headers → Authorization را کپی کنید\n' +
          '   (فقط مقدار بعد از "Bearer " را paste کنید)\n\n' +
          'توکن را اینجا paste کنید:'
        );
        if (t && t.trim()) {
          S.token = t.replace(/^Bearer\s+/i, '').trim();
          S.started = true;
          loadAndRender(1);
        } else {
          alert('❌ بدون توکن امکان ادامه وجود ندارد.');
        }
      }
    }, 4000);
  }

})();
