/* ============================================================
 * JifaWork · app.js —— 设备面板 / HA 连接 / 资讯 / 博主
 * 纯 DOM 逻辑，不依赖 Three.js；3D 渲染见 app3d.js
 * ============================================================ */
(function () {
  'use strict';
  const JW = window.JW || { devices: [], news: [], youtubers: [], ha: { url: '', token: '' }, proxy: '' };
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ============ 状态色 ============ */
  const ST = {
    on:   { label: '运行中', color: '#35d0ba' },
    off:  { label: '已关闭', color: '#46536b' },
    idle: { label: '待机',   color: '#ffb454' },
  };
  const KIND_COLOR = {
    climate: '#5b8cff', light: '#ffd166', fan: '#35d0ba', vacuum: '#7a5bff',
    lock: '#ffb454', sensor: '#35d0ba', humidifier: '#5bc8ff',
    switch: '#ff9f7a', cover: '#9d7aff', unknown: '#93a0b8',
  };

  /* ============ 设备面板 ============ */
  let selected = null;
  const devListEl = $('#devList');
  const devDetailEl = $('#devDetail');

  function roomName(key) {
    const r = (JW.rooms || []).find(r => r.key === key);
    return r ? r.name : key;
  }

  function renderDeviceList() {
    devListEl.innerHTML = JW.devices.map(d => `
      <button class="drow${selected === d.id ? ' active' : ''}" data-id="${esc(d.id)}">
        <span class="d-dot" style="background:${ST[d.status] ? ST[d.status].color : '#93a0b8'}"></span>
        <span class="d-name">${esc(d.name)}</span>
        <span class="d-room">${esc(roomName(d.room))}</span>
        <span class="d-val">${esc(d.val || '—')}</span>
      </button>`).join('');
    $$('.drow', devListEl).forEach(btn => btn.addEventListener('click', () => selectDevice(btn.dataset.id)));
  }

  function renderDeviceDetail(id) {
    const d = JW.devices.find(x => x.id === id);
    if (!d) return;
    const st = ST[d.status] || { label: d.status, color: '#93a0b8' };
    devDetailEl.innerHTML = `
      <div class="dd-head">
        <span class="dd-icon" style="background:${KIND_COLOR[d.kind] || '#93a0b8'}26;color:${KIND_COLOR[d.kind] || '#93a0b8'}">${esc(d.name[0])}</span>
        <div>
          <div class="dd-name">${esc(d.name)}</div>
          <div class="dd-sub">${esc(roomName(d.room))} · ${esc(d.kind)}</div>
        </div>
        <span class="dd-badge" style="color:${st.color};border-color:${st.color}55;background:${st.color}1a">${esc(st.label)}</span>
      </div>
      <div class="dd-val">${esc(d.val || '—')}</div>
      <div class="dd-meta">
        <div><span>实体</span><code>${esc(d.ha || '—')}</code></div>
        <div><span>状态</span><code>${esc(d.status)}</code></div>
      </div>`;
  }

  function selectDevice(id) {
    selected = id;
    renderDeviceList();
    renderDeviceDetail(id);
    try { if (window.JW3D && window.JW3D.select) window.JW3D.select(id); } catch (e) { console.warn('3D select 失败:', e); }
  }
  window.JW_SELECT = (id) => selectDevice(id); // 3D 点击回调

  /* ============ Home Assistant 连接 ============ */
  const haBtn = $('#haBtn'), haUrl = $('#haUrl'), haToken = $('#haToken'), haStatus = $('#haStatus');
  let haConnected = false;

  haUrl.value = localStorage.getItem('jw_ha_url') || JW.ha.url || '';
  haToken.value = localStorage.getItem('jw_ha_token') || JW.ha.token || '';

  function haMsg(txt, ok) {
    haStatus.textContent = txt;
    haStatus.className = 'ha-status' + (ok ? ' ok' : ' err');
  }

  function mapHAState(d, s) {
    const v = String(s.state);
    if (['on', 'open', 'openning', 'locked', 'home', 'playing'].includes(v)) { d.status = 'on'; d.val = '运行中'; }
    else if (['off', 'closed', 'unlocked', 'away', 'idle', 'paused', 'standby'].includes(v)) { d.status = 'off'; d.val = '已关闭'; }
    else { d.status = 'idle'; d.val = v; }
    const a = s.attributes || {};
    const bits = [];
    if (a.temperature != null) bits.push(a.temperature + '°C');
    if (a.current_temperature != null) bits.push('室温 ' + a.current_temperature + '°C');
    if (a.humidity != null) bits.push('湿度 ' + a.humidity + '%');
    if (a.brightness != null) bits.push('亮度 ' + Math.round(a.brightness / 255 * 100) + '%');
    if (a.battery_level != null) bits.push('电量 ' + a.battery_level + '%');
    if (a.aqi != null) bits.push('AQI ' + a.aqi);
    if (bits.length) d.val = bits.join(' · ');
  }

  haBtn.addEventListener('click', async () => {
    const url = haUrl.value.trim(), token = haToken.value.trim();
    if (!url || !token) { haMsg('请填写 HA 地址和令牌', false); return; }
    haBtn.disabled = true; haMsg('正在连接…');
    try {
      const r = await fetch(url.replace(/\/+$/, '') + '/api/states', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const states = await r.json();
      let hit = 0;
      states.forEach(s => {
        const d = JW.devices.find(x => x.ha === s.entity_id);
        if (d) { mapHAState(d, s); hit++; }
      });
      localStorage.setItem('jw_ha_url', url);
      localStorage.setItem('jw_ha_token', token);
      haConnected = true;
      haMsg(`已连接 · 同步 ${hit}/${JW.devices.length} 个设备`, true);
      renderDeviceList();
      if (selected) renderDeviceDetail(selected);
      if (window.JW3D && window.JW3D.sync) window.JW3D.sync();
    } catch (e) {
      haMsg('连接失败：' + e.message + '（HA 需开启 CORS）', false);
    } finally { haBtn.disabled = false; }
  });

  /* ============ RSS 抓取 ============ */
  async function fetchText(url, timeoutMs = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(JW.proxy + encodeURIComponent(url), { signal: ctrl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    } finally { clearTimeout(t); }
  }

  function parseRSS(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    const items = Array.from(doc.querySelectorAll('item')).slice(0, 10).map(it => ({
      title: (it.querySelector('title') || {}).textContent || '(无标题)',
      link: (it.querySelector('link') || {}).textContent || '',
      date: (it.querySelector('pubDate') || {}).textContent || '',
      desc: (it.querySelector('description') || {}).textContent || '',
    }));
    if (!items.length) {
      // Atom 兼容
      const es = Array.from(doc.querySelectorAll('entry')).slice(0, 10).map(e => ({
        title: (e.querySelector('title') || {}).textContent || '(无标题)',
        link: (e.querySelector('link') || {}).getAttribute('href') || '',
        date: (e.querySelector('published') || e.querySelector('updated') || {}).textContent || '',
        desc: '',
      }));
      return es;
    }
    return items;
  }

  function fmtDate(s) {
    if (!s) return '';
    const t = new Date(s);
    if (isNaN(t)) return '';
    const d = new Date();
    const sameY = t.getFullYear() === d.getFullYear();
    const base = sameY
      ? t.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
      : t.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    return base + ' ' + t.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  function stripHtml(s) { return (s || '').replace(/<[^>]*>/g, '').slice(0, 120); }

  /* 日期分组 + 时间格式化（按日期就近程度切换显示） */
  function fmtTimeOnly(s) {
    const t = new Date(s); if (isNaN(t)) return '';
    return t.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  function fmtDateShort(s) {
    const t = new Date(s); if (isNaN(t)) return '';
    const d = new Date();
    if (t.getFullYear() !== d.getFullYear()) return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate();
    return (t.getMonth() + 1) + '-' + (t.getDate() < 10 ? '0' : '') + t.getDate();
  }
  function dayKey(s) {
    const t = new Date(s); if (isNaN(t)) return 'z';
    return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate();
  }
  function dayLabel(s) {
    const t = new Date(s); if (isNaN(t)) return '更早';
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day0 = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const diff = Math.round((today0 - day0) / 86400000);
    if (diff <= 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff < 7) return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][t.getDay()];
    if (t.getFullYear() === now.getFullYear()) return (t.getMonth() + 1) + '-' + (t.getDate() < 10 ? '0' : '') + t.getDate();
    return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate();
  }
  function timeForMeta(s, label) {
    if (label === '今天' || label === '昨天') return fmtTimeOnly(s);
    if (/^周/.test(label)) return label + ' ' + fmtTimeOnly(s);
    return fmtDateShort(s);
  }
  /* 收藏（localStorage 持久化） */
  function getFavs() {
    try { return new Set(JSON.parse(localStorage.getItem('jw_news_fav') || '[]')); }
    catch (e) { return new Set(); }
  }
  function toggleFav(link) {
    const s = getFavs();
    s.has(link) ? s.delete(link) : s.add(link);
    try { localStorage.setItem('jw_news_fav', JSON.stringify([...s])); } catch (e) {}
  }

  /* ============ AI 动态 ============ */
  const tabsEl = $('#newsTabs'), listEl = $('#newsList');
  const newsByTab = {};
  JW.news.forEach(n => { (newsByTab[n.tab] = newsByTab[n.tab] || []).push(n); });
  const tabs = Object.keys(newsByTab);
  let activeTab = tabs[0];

  function renderTabs() {
    tabsEl.innerHTML = tabs.map(t => `<span class="chip${t === activeTab ? ' active' : ''}" data-t="${esc(t)}">${esc(t)}</span>`).join('');
    $$('.chip', tabsEl).forEach(c => c.addEventListener('click', () => { activeTab = c.dataset.t; renderTabs(); loadNews(activeTab); }));
  }

  function renderNews(items, failedSources) {
    if (!items.length && !failedSources.length) {
      listEl.innerHTML = `<div class="empty">暂无内容</div>`;
      return;
    }
    const favs = getFavs();
    // 按日期分组（items 已按时间倒序，分组顺序天然正确）
    const gmap = new Map();
    const groups = [];
    items.forEach(it => {
      const k = dayKey(it.date);
      if (!gmap.has(k)) {
        const g = { label: dayLabel(it.date), items: [] };
        gmap.set(k, g); groups.push(g);
      }
      gmap.get(k).items.push(it);
    });
    const newsHtml = groups.map(g => {
      const rows = g.items.map(it => {
        const on = favs.has(it.link);
        return `
        <a class="nrow" href="${esc(it.link)}" target="_blank" rel="noopener">
          <div class="n-top">
            <div class="n-title">${esc(it.title)}</div>
            <span class="n-star${on ? ' on' : ''}" role="button" tabindex="0" data-link="${esc(it.link)}" aria-label="收藏" aria-pressed="${on ? 'true' : 'false'}">${on ? '★' : '☆'}</span>
          </div>
          <div class="n-meta">
            <span class="n-src"><i></i>${esc(it.src)}</span>
            <span class="n-time">${esc(timeForMeta(it.date, g.label))}</span>
          </div>
          ${it.desc ? `<div class="n-desc">${esc(stripHtml(it.desc))}</div>` : ''}
        </a>`;
      }).join('');
      return `<div class="day-h"><span class="day-label">${esc(g.label)}</span><span class="day-count">${g.items.length}</span><span class="day-line"></span></div>${rows}`;
    }).join('');

    const fails = failedSources.map(f => `
      <a class="nrow fail" href="${esc(f.url)}" target="_blank" rel="noopener">
        <div class="n-top">
          <div class="n-title">${esc(f.label)} 抓取失败</div>
        </div>
        <div class="n-meta">
          <span class="n-src"><i></i>${esc(f.site)}</span>
          <span class="n-time">点击访问源站 →</span>
        </div>
      </a>`).join('');

    listEl.innerHTML = newsHtml + fails;
    // 收藏星标点击（避免跳转）
    listEl.querySelectorAll('.n-star').forEach(el => {
      const onToggle = (e) => {
        e.preventDefault(); e.stopPropagation();
        const link = el.dataset.link;
        if (!link) return;
        toggleFav(link);
        const on = el.classList.toggle('on');
        el.textContent = on ? '★' : '☆';
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
      };
      el.addEventListener('click', onToggle);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(e); });
    });
  }

  async function loadNews(tab) {
    const sources = newsByTab[tab] || [];
    listEl.innerHTML = `<div class="empty">正在抓取 ${sources.map(s => s.label).join(' / ')} 最新动态…</div>`;
    const results = await Promise.all(sources.map(async (src) => {
      try { return { src, items: parseRSS(await fetchText(src.url)) }; }
      catch (e) { return { src, items: null }; }
    }));
    const items = [], failed = [];
    results.forEach(r => {
      if (r.items === null || !r.items.length) { failed.push(r.src); return; }
      r.items.forEach(it => { it.src = r.src.label; items.push(it); });
    });
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    renderNews(items.slice(0, 12), failed);
  }

  /* ============ YouTube 博主 ============ */
  const ytEl = $('#ytList');

  function ytDate(s) {
    if (!s) return '';
    const t = new Date(s);
    if (isNaN(t)) return '';
    const d = new Date();
    const diff = d - t;
    if (diff < 3600e3) return Math.max(1, Math.round(diff / 60e3)) + ' 分钟前';
    if (diff < 86400e3) return Math.round(diff / 3600e3) + ' 小时前';
    if (diff < 7 * 86400e3) return Math.round(diff / 86400e3) + ' 天前';
    return t.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  }

  function renderYTCard(ch, videos) {
    const vids = videos.map(v => `
      <a class="vrow" href="${esc(v.link)}" target="_blank" rel="noopener">
        <img class="v-thumb" src="${esc(v.thumb)}" alt="" loading="lazy" onerror="this.style.display='none'">
        <div class="v-info">
          <div class="v-title">${esc(v.title)}</div>
          <div class="v-date">${esc(v.date)}</div>
        </div>
      </a>`).join('');
    return `
      <div class="ytcard">
        <div class="yt-head">
          <span class="yt-avatar">${esc((ch.name || '?')[0])}</span>
          <div class="yt-meta">
            <div class="yt-name">${esc(ch.name)}</div>
            <a class="yt-handle" href="https://www.youtube.com/${esc(ch.handle || '')}" target="_blank" rel="noopener">${esc(ch.handle || '')} ↗</a>
          </div>
        </div>
        <div class="yt-vids">${vids || '<div class="empty small">暂无视频（源站抓取失败，点击上方链接访问）</div>'}</div>
      </div>`;
  }

  async function loadYT() {
    ytEl.innerHTML = `<div class="empty">正在拉取关注博主的最新视频…</div>`;
    const cards = await Promise.all((JW.youtubers || []).map(async (ch) => {
      try {
        let id = ch.id;
        if (!id) {
          const html = await fetchText('https://www.youtube.com/' + (ch.handle || ''));
          const m = html.match(/"(?:browseId|channelId|externalId)":"(UC[\w-]{20,})"/) || html.match(/channel\/(UC[\w-]{20,})/);
          id = m ? m[1] : '';
        }
        if (!id) return renderYTCard(ch, []);
        const xml = await fetchText('https://www.youtube.com/feeds/videos.xml?channel_id=' + id);
        const doc = new DOMParser().parseFromString(xml, 'text/xml');
        const ns = 'http://search.yahoo.com/mrss/';
        const videos = Array.from(doc.querySelectorAll('entry')).slice(0, 3).map(e => {
          const thumb = e.getElementsByTagNameNS(ns, 'thumbnail')[0];
          return {
            title: (e.querySelector('title') || {}).textContent || '',
            link: (e.querySelector('link') || {}).getAttribute('href') || '',
            date: ytDate(((e.querySelector('published') || {}).textContent || '')),
            thumb: thumb ? thumb.getAttribute('url') : '',
          };
        });
        return renderYTCard(ch, videos);
      } catch (e) { return renderYTCard(ch, []); }
    }));
    ytEl.innerHTML = cards.join('');
  }

  /* ============ 初始化 ============ */
  function init() {
    renderDeviceList();
    if (JW.devices[0]) selectDevice(JW.devices[0].id);
    renderTabs();
    loadNews(activeTab);
    loadYT();
    // 3D 加载失败兜底提示
    setTimeout(() => {
      if (!window.JW3D && !$('#scene3d canvas')) {
        $('#sceneNote').textContent = '3D 场景加载失败（网络被墙？），设备面板仍可正常使用';
      }
    }, 6000);
  }
  document.addEventListener('DOMContentLoaded', init);
})();
