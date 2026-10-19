/* Nix app: dashboard + piece lookup (read-only). */
const API_URL = 'PASTE-WEB-APP-LINK';   // the https://script.google.com/.../exec link

(function () {
  const LS_KEY = 'nixKey', LS_DATA = 'nixData';
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
    del: k => { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const $ = s => document.querySelector(s);
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
  const get = (o, name) => { const k = Object.keys(o).find(x => x.toLowerCase() === name.toLowerCase()); return k ? o[k] : ''; };
  let DATA = null;

  const css = `
.lk-bar{display:flex;gap:8px}
.lk-bar input,.lk-bar select,.lk-login input{font:inherit;color:var(--ink);background:var(--tile);border:1px solid var(--line);border-radius:14px;padding:13px 14px;min-width:0}
.lk-bar input{flex:1}.lk-bar select{max-width:40%}
.lk-meta{display:flex;justify-content:space-between;gap:8px;color:var(--mute);font-size:.8rem;margin:0 4px 10px}
.lk-meta button{background:none;border:0;color:var(--ice);font:inherit;padding:2px 6px}
.lk-row{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;text-align:left;font:inherit;color:inherit;background:var(--tile);border:1px solid var(--line);border-radius:16px;padding:13px 14px;margin-bottom:8px;min-height:60px}
.lk-row:active{transform:scale(.99)}.lk-row b{display:block}.lk-row small{color:var(--mute)}
.pill{font-size:.75rem;padding:3px 10px;border-radius:99px;border:1px solid var(--line);white-space:nowrap;display:inline-block}
.lk-login p{color:var(--mute);margin:6px 4px 10px}.lk-login input{width:100%;margin-bottom:10px}
.lk-go{width:100%;font:inherit;font-weight:600;border:0;border-radius:14px;padding:13px;background:var(--ink);color:var(--bg)}
.lk-kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.lk-kpi{background:var(--tile);border:1px solid var(--line);border-radius:18px;padding:14px}
.lk-kpi small{display:block;color:var(--mute);font-size:.78rem}
.lk-kpi b{display:block;font-size:1.35rem;margin-top:6px;overflow-wrap:anywhere}
.lk-bar2{display:grid;grid-template-columns:minmax(90px,1.2fr) 2fr 28px;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:.9rem}
.lk-bar2:last-child{border:0}.lk-bar2 i{display:block;height:8px;border-radius:9px;background:var(--bg)}
.lk-bar2 em{display:block;height:100%;border-radius:9px;background:var(--ice)}.lk-bar2 b{text-align:right}
.lk-det{position:fixed;inset:0;z-index:20;background:var(--bg);color:var(--ink);overflow:auto;-webkit-overflow-scrolling:touch}
.lk-body{max-width:560px;margin:0 auto;padding:calc(env(safe-area-inset-top,0px) + 14px) 18px calc(env(safe-area-inset-bottom,0px) + 30px)}
.lk-back{background:none;border:0;color:var(--ice);font:inherit;font-size:1.05rem;padding:8px 0}
.lk-det h3{font:400 1.9rem/1.15 Georgia,"Times New Roman",serif;margin:6px 0 8px}
.lk-det .nm{color:var(--mute);margin:0 0 8px}
.lk-det img{width:100%;max-height:340px;object-fit:cover;border-radius:18px;margin:14px 0 4px}
.lk-card{background:var(--tile);border:1px solid var(--line);border-radius:18px;padding:4px 16px;margin:10px 0}
.lk-f{display:flex;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid var(--line)}
.lk-f:last-child{border:0}.lk-f span{color:var(--mute)}
.lk-f b{font-weight:500;text-align:right;overflow-wrap:anywhere}.lk-f a{color:var(--ice)}
.lk-h{font-weight:600;margin:22px 4px 0}.lk-note{margin:8px 4px;white-space:pre-wrap;color:var(--mute)}`;
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));

  // ---- page parts ----
  const wrap = el('section');
  wrap.innerHTML = '<div class="lk-meta"><span id="lk-info"></span><span><button id="lk-ref">Refresh</button><button id="lk-out">Sign out</button></span></div>' +
    '<div id="lk-login"></div><div id="lk-dash"></div>' +
    '<div id="lk-find" hidden><h2>Find a piece</h2><div class="lk-bar"><input id="lk-q" type="search" placeholder="SKU, name, metal, certificate" autocomplete="off" enterkeyhint="search"><select id="lk-st"></select></div><div id="lk-res" style="margin-top:10px"></div></div>';
  const list = document.getElementById('list');
  list.parentNode.insertBefore(wrap, list);
  const det = el('div', 'lk-det'); det.id = 'lk-det'; det.hidden = true; document.body.appendChild(det);
  const res = $('#lk-res'), info = $('#lk-info'), loginBox = $('#lk-login'), dashBox = $('#lk-dash'), find = $('#lk-find');
  const stamp = () => new Date(DATA.fetched || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ---- dashboard ----
  function renderDash(d) {
    dashBox.innerHTML = '';
    if (!d) return;
    dashBox.appendChild(el('h2', '', 'Dashboard'));
    const g = el('div', 'lk-kpis');
    d.cards.forEach(c => { const k = el('div', 'lk-kpi'); k.appendChild(el('small', '', c.label)); k.appendChild(el('b', '', c.value)); g.appendChild(k); });
    dashBox.appendChild(g);
    const rows = d.status.filter(s => !(/^Other/.test(s.label) && s.value === 0));
    const max = Math.max(1, ...rows.map(s => s.value));
    dashBox.appendChild(el('div', 'lk-h', 'Pieces by status'));
    const card = el('div', 'lk-card');
    rows.forEach(s => {
      const r = el('div', 'lk-bar2'), tr = el('i'), fl = el('em');
      fl.style.width = (s.value / max * 100) + '%'; tr.appendChild(fl);
      r.appendChild(el('span', '', s.label)); r.appendChild(tr); r.appendChild(el('b', '', String(s.value)));
      card.appendChild(r);
    });
    dashBox.appendChild(card);
    if (d.rate) dashBox.appendChild(el('p', 'lk-note', 'INR conversion uses CAD to INR ' + d.rate + '.'));
  }

  // ---- piece list ----
  function render() {
    const terms = $('#lk-q').value.trim().toLowerCase().split(/\s+/).filter(Boolean), st = $('#lk-st').value;
    let rows = DATA.pieces.slice().reverse().filter(p => (!st || get(p, 'Status') === st) && terms.every(t => p._h.includes(t)));
    const total = rows.length, filtered = terms.length || st, limit = filtered ? 50 : 20;
    rows = rows.slice(0, limit);
    res.innerHTML = '';
    if (!rows.length) res.appendChild(el('p', 'lk-note', 'No piece matches. Try a shorter search.'));
    rows.forEach(p => {
      const b = el('button', 'lk-row'), left = el('span');
      left.appendChild(el('b', '', p._sku));
      const sub = get(p, 'Design / Name') || get(p, 'Item Type');
      if (sub) left.appendChild(el('small', '', sub));
      b.appendChild(left);
      const s = get(p, 'Status'); if (s) b.appendChild(el('span', 'pill', s));
      b.onclick = () => openDetail(p);
      res.appendChild(b);
    });
    info.textContent = (filtered ? total + ' found' + (total > limit ? ', showing ' + limit : '') : 'Latest ' + rows.length + ' of ' + DATA.pieces.length) + '. Updated ' + stamp();
  }

  // ---- piece detail ----
  function fields(obj, skip) {
    const card = el('div', 'lk-card');
    Object.keys(obj).forEach(k => {
      if (k[0] === '_' || skip.indexOf(k.toLowerCase()) > -1) return;
      const row = el('div', 'lk-f'), b = el('b'), v = obj[k];
      row.appendChild(el('span', '', k));
      if (/^https?:\/\//.test(v)) { const a = el('a', '', 'Open link'); a.href = v; a.target = '_blank'; a.rel = 'noopener'; b.appendChild(a); }
      else b.textContent = v;
      row.appendChild(b); card.appendChild(row);
    });
    return card.children.length ? card : null;
  }

  function openDetail(p) {
    det.innerHTML = '';
    const body = el('div', 'lk-body'); det.appendChild(body);
    const back = el('button', 'lk-back', '‹ Back'); back.onclick = () => history.back(); body.appendChild(back);
    body.appendChild(el('h3', '', p._sku));
    const nm = get(p, 'Design / Name'); if (nm) body.appendChild(el('p', 'nm', nm));
    const st = get(p, 'Status'); if (st) body.appendChild(el('span', 'pill', st));
    const pk = Object.keys(p).find(k => /photo/i.test(k) && /^https?:/.test(p[k]));
    if (pk) {
      const id = (p[pk].match(/[-\w]{25,}/) || [])[0];
      if (id) { const im = el('img'); im.alt = 'Photo of ' + p._sku; im.src = 'https://drive.google.com/thumbnail?id=' + id + '&sz=w800'; im.onerror = () => im.remove(); body.appendChild(im); }
    }
    const main = fields(p, ['sku', 'status', 'design / name', 'notes']); if (main) body.appendChild(main);
    const dia = DATA.diamonds[p._sku] || [];
    body.appendChild(el('div', 'lk-h', 'Diamonds (' + dia.length + ')'));
    if (!dia.length) body.appendChild(el('p', 'lk-note', 'No diamond details entered yet.'));
    dia.forEach(d => {
      const role = get(d, 'Diamond Role') || 'Diamond', shape = get(d, 'Shape');
      body.appendChild(el('div', 'lk-note', role + (shape ? ', ' + shape : '')));
      const c = fields(d, ['diamond role']); if (c) body.appendChild(c);
    });
    const note = get(p, 'Notes'); if (note) { body.appendChild(el('div', 'lk-h', 'Notes')); body.appendChild(el('p', 'lk-note', note)); }
    det.hidden = false; det.scrollTop = 0; document.body.style.overflow = 'hidden';
    history.pushState({ lk: 1 }, '');
  }
  function closeDetail() { det.hidden = true; document.body.style.overflow = ''; }
  window.addEventListener('popstate', closeDetail);

  // ---- data ----
  function setData(d) {
    DATA = d; loginBox.innerHTML = '';
    renderDash(d.dash);
    list.style.display = d.role === 'dash' ? 'none' : '';   // dashboard-only users do not see the form tiles
    if (d.role === 'full' && d.pieces) {
      d.pieces.forEach(p => {
        const dv = (d.diamonds[p._sku] || []).map(x => Object.values(x).join(' ')).join(' ');
        p._h = (Object.values(p).join(' ') + ' ' + dv).toLowerCase();
      });
      const sts = [...new Set(d.pieces.map(p => get(p, 'Status')).filter(Boolean))].sort();
      const sel = $('#lk-st'), cur = sel.value; sel.innerHTML = '';
      sel.appendChild(Object.assign(el('option'), { value: '', textContent: 'All statuses' }));
      sts.forEach(s => sel.appendChild(Object.assign(el('option'), { value: s, textContent: s })));
      sel.value = sts.indexOf(cur) > -1 ? cur : '';
      find.hidden = false; render();
    } else { find.hidden = true; info.textContent = 'Updated ' + stamp(); }
  }

  function showLogin(msg) {
    find.hidden = true; dashBox.innerHTML = ''; info.textContent = ''; list.style.display = '';
    loginBox.innerHTML = '';
    const box = el('div', 'lk-login');
    box.appendChild(el('p', '', msg || 'Enter your access code to see the dashboard and piece details.'));
    const inp = el('input'); inp.type = 'password'; inp.placeholder = 'Access code'; box.appendChild(inp);
    const go = el('button', 'lk-go', 'Connect');
    go.onclick = () => { const v = inp.value.trim(); if (v) { store.set(LS_KEY, v); load(); } };
    box.appendChild(go); loginBox.appendChild(box);
  }

  async function load() {
    if (!/^https?:/.test(API_URL)) { loginBox.innerHTML = ''; loginBox.appendChild(el('p', 'lk-note', 'Not connected yet. Paste the web app link at the top of lookup.js.')); return; }
    const key = store.get(LS_KEY);
    if (!key) return showLogin();
    if (!DATA) { try { const c = store.get(LS_DATA); if (c) setData(JSON.parse(c)); } catch (e) {} }
    info.textContent = 'Updating…';
    try {
      const r = await fetch(API_URL + '?key=' + encodeURIComponent(key));
      const j = await r.json();
      if (!j.ok) {
        if (/^Wrong/.test(j.error)) { store.del(LS_KEY); store.del(LS_DATA); DATA = null; return showLogin(j.error); }
        info.textContent = j.error; return;
      }
      j.data.fetched = Date.now();
      store.set(LS_DATA, JSON.stringify(j.data));
      setData(j.data);
    } catch (e) {
      if (DATA) { info.textContent += ' (offline copy)'; } else info.textContent = 'Could not load. Check your internet.';
    }
  }

  $('#lk-q').addEventListener('input', () => DATA && DATA.pieces && render());
  $('#lk-st').addEventListener('change', () => DATA && DATA.pieces && render());
  $('#lk-ref').onclick = load;
  $('#lk-out').onclick = () => { store.del(LS_KEY); store.del(LS_DATA); DATA = null; showLogin(); };
  load();
})();
