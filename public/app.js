// GreenChat: demo chat app. No backend, state lives in localStorage.
(function () {
  const STORE_KEY = 'greenchat.v1';
  const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // ---------- demo data ----------
  const ME = { id: 'me', name: 'You', color: '#00a884' };
  const CONTACTS = [
    { id: 'ada', name: 'Ada Okafor', color: '#e67e22', bot: true, intro: ['hey! did u see the new mockups?', 'tell me what u think when u get a sec'] },
    { id: 'tunde', name: 'Tunde', color: '#8e44ad', bot: true, intro: ['bro the deploy is live 🚀'] },
    { id: 'mum', name: 'Mum', color: '#c0392b', bot: true, intro: ['have u eaten?'] },
    { id: 'design', name: 'Design Team', color: '#2980b9', bot: true, intro: ['standup in 10 mins'] },
  ];
  const BOT_REPLIES = {
    ada: ['yesss that layout is clean 🔥', 'can we make the header a bit bolder?', 'ok send me the final file when ready', 'lol i love it'],
    tunde: ['nice, i will test it on my phone', 'it feels smooth 👌', 'let’s ship it'],
    mum: ['ok dear 🙏', 'call me later', 'eat well oo'],
    design: ['noted 👍', 'can someone check the spacing?', 'ok'],
  };
  const SEED_MESSAGES = {
    ada: [
      { from: 'them', text: 'hey! did u see the new mockups?', t: -95 },
      { from: 'me', text: 'not yet, sending the link now', t: -90, status: 'read' },
      { from: 'them', text: 'tell me what u think when u get a sec', t: -88 },
    ],
    tunde: [{ from: 'them', text: 'bro the deploy is live 🚀', t: -240 }],
    mum: [{ from: 'them', text: 'have u eaten?', t: -1440 }],
    design: [{ from: 'them', text: 'standup in 10 mins', t: -30 }],
  };

  // ---------- state ----------
  let state = load();
  let activeId = null;
  let typingTimer = null;
  let replyTimers = [];

  function freshState() {
    const chats = {};
    CONTACTS.forEach((c) => {
      chats[c.id] = {
        messages: (SEED_MESSAGES[c.id] || []).map((m, i) => ({
          id: c.id + i,
          from: m.from,
          text: m.text,
          time: Date.now() + m.t * 60000,
          status: m.status || 'read',
          reactions: {},
        })),
        unread: 0,
      };
    });
    return { chats, theme: 'light' };
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return freshState();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const initials = (name) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  function dayLabel(ts) {
    const d = new Date(ts), now = new Date();
    const sameDay = (a, b) => a.toDateString() === b.toDateString();
    if (sameDay(d, now)) return 'Today';
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (sameDay(d, y)) return 'Yesterday';
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function lastMsg(chat) { return chat.messages[chat.messages.length - 1]; }

  function avatarEl(contact, size) {
    const a = el('div', 'avatar', initials(contact.name));
    a.style.background = contact.color;
    if (size) { a.style.width = size + 'px'; a.style.height = size + 'px'; }
    return a;
  }

  // ---------- theme ----------
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.body.setAttribute('data-theme', state.theme);
    $('themeIcon').textContent = state.theme === 'dark' ? '☀️' : '🌙';
    document.querySelector('meta[name="theme-color"]').content = state.theme === 'dark' ? '#202c33' : '#008069';
  }
  $('themeBtn').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(); save();
  });

  // ---------- chat list ----------
  function renderList() {
    const q = $('searchInput').value.trim().toLowerCase();
    const list = $('chatList');
    list.innerHTML = '';
    const items = CONTACTS
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .map((c) => ({ c, chat: state.chats[c.id], last: lastMsg(state.chats[c.id]) }))
      .sort((a, b) => (b.last ? b.last.time : 0) - (a.last ? a.last.time : 0));

    items.forEach(({ c, chat, last }) => {
      const li = el('li', 'chat-item');
      li.appendChild(avatarEl(c, 48));
      const meta = el('div', 'meta');
      const r1 = el('div', 'row1');
      r1.appendChild(el('span', 'cname', c.name));
      r1.appendChild(el('span', 'time' + (chat.unread ? ' unread' : ''), last ? fmtTime(last.time) : ''));
      const r2 = el('div', 'row2');
      let prev = last ? (last.from === 'me' ? '✓ ' : '') + last.text : 'tap to start chatting';
      r2.appendChild(el('span', 'preview', prev));
      if (chat.unread) r2.appendChild(el('span', 'badge', String(chat.unread)));
      meta.appendChild(r1); meta.appendChild(r2);
      li.appendChild(meta);
      li.addEventListener('click', () => openChat(c.id));
      list.appendChild(li);
    });
  }
  $('searchInput').addEventListener('input', renderList);

  // ---------- chat view ----------
  function openChat(id) {
    activeId = id;
    const chat = state.chats[id];
    const c = CONTACTS.find((x) => x.id === id);
    chat.unread = 0; save();
    $('listScreen').hidden = true;
    $('chatScreen').hidden = false;
    $('chatAvatar').replaceWith(avatarEl(c, 38)); // swap in fresh avatar
    const av = $('chatScreen').querySelector('.chat-header .avatar');
    av.id = 'chatAvatar';
    $('chatName').textContent = c.name;
    $('chatStatus').textContent = c.bot ? 'online' : '';
    renderMessages();
    setTimeout(() => $('msgInput').focus({ preventScroll: true }), 50);
    // mark incoming as read after a short moment
    chat.messages.forEach((m) => { if (m.from === 'them') m.read = true; });
    save();
  }
  function closeChat() {
    activeId = null;
    replyTimers.forEach(clearTimeout); replyTimers = [];
    clearTimeout(typingTimer);
    $('chatScreen').hidden = true;
    $('listScreen').hidden = false;
    renderList();
  }
  $('backBtn').addEventListener('click', closeChat);

  function renderMessages() {
    const box = $('messages');
    const chat = state.chats[activeId];
    box.innerHTML = '';
    let lastDay = null, prevFrom = null;
    chat.messages.forEach((m) => {
      const day = dayLabel(m.time);
      if (day !== lastDay) { box.appendChild(el('div', 'day-sep', day)); lastDay = day; prevFrom = null; }
      box.appendChild(messageRow(m, prevFrom !== m.from));
      prevFrom = m.from;
    });
    box.scrollTop = box.scrollHeight;
  }

  function ticksFor(status) {
    if (status === 'sent') return { t: '✓', cls: '' };
    if (status === 'delivered') return { t: '✓✓', cls: '' };
    return { t: '✓✓', cls: 'read' };
  }

  function messageRow(m, first) {
    const out = m.from === 'me';
    const row = el('div', 'row ' + (out ? 'out' : 'in') + (first ? ' gap' : ''));
    const b = el('div', 'bubble' + (out ? ' out' : '') + (first ? ' tail-first' : ''));
    b.appendChild(document.createTextNode(m.text));
    const meta = el('span', 'meta-line');
    meta.appendChild(el('span', '', fmtTime(m.time)));
    if (out) {
      const tk = ticksFor(m.status);
      meta.appendChild(el('span', 'ticks ' + tk.cls, tk.t));
    }
    b.appendChild(meta);
    const rx = Object.values(m.reactions || {});
    if (rx.length) {
      const counts = {};
      rx.forEach((e) => (counts[e] = (counts[e] || 0) + 1));
      b.appendChild(el('span', 'reactions', Object.entries(counts).map(([e, n]) => n > 1 ? e + n : e).join(' ')));
    }
    // long-press / double-click to react
    let pressTimer;
    const open = (x, y) => showReactionBar(m, x, y);
    b.addEventListener('dblclick', (e) => open(e.clientX, e.clientY));
    b.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      pressTimer = setTimeout(() => open(t.clientX, t.clientY), 450);
    }, { passive: true });
    ['touchend', 'touchmove'].forEach((ev) => b.addEventListener(ev, () => clearTimeout(pressTimer), { passive: true }));
    row.appendChild(b);
    return row;
  }

  let openBar = null;
  function closeReactionBar() { if (openBar) { openBar.remove(); openBar = null; } }
  function showReactionBar(m, x, y) {
    closeReactionBar();
    const bar = el('div', 'reaction-bar');
    REACTIONS.forEach((emoji) => {
      const btn = el('button', '', emoji);
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        m.reactions = m.reactions || {};
        m.reactions['me'] = emoji;
        closeReactionBar(); save(); renderMessages();
      });
      bar.appendChild(btn);
    });
    document.body.appendChild(bar);
    const w = bar.offsetWidth;
    bar.style.left = Math.min(window.innerWidth - w / 2 - 8, Math.max(w / 2 + 8, x)) + 'px';
    bar.style.top = Math.max(60, y - 56) + 'px';
    openBar = bar;
  }
  document.addEventListener('click', closeReactionBar);

  // ---------- sending ----------
  $('composer').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('msgInput').value.trim();
    if (!text || !activeId) return;
    $('msgInput').value = '';
    const id = activeId;
    const msg = { id: uid(), from: 'me', text, time: Date.now(), status: 'sent', reactions: {} };
    state.chats[id].messages.push(msg);
    save();
    renderMessages();
    // tick progression: sent -> delivered -> read
    setTimeout(() => { msg.status = 'delivered'; save(); if (activeId === id) renderMessages(); }, 600);
    const readAfter = 1600 + Math.random() * 1200;
    setTimeout(() => {
      if (activeId === id) { msg.status = 'read'; save(); renderMessages(); }
      else { msg.status = 'read'; save(); }
    }, readAfter);
    scheduleBotReply(id);
  });

  // ---------- demo bot replies ----------
  function scheduleBotReply(id) {
    const contact = CONTACTS.find((c) => c.id === id);
    if (!contact || !contact.bot) return;
    const replies = BOT_REPLIES[id];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    const wait = 1200 + Math.random() * 1200;
    const t1 = setTimeout(() => {
      if (activeId === id) { $('chatStatus').textContent = 'typing…'; showTyping(id); }
    }, wait);
    const t2 = setTimeout(() => {
      clearTyping();
      const msg = { id: uid(), from: 'them', text: reply, time: Date.now(), reactions: {}, read: activeId === id };
      state.chats[id].messages.push(msg);
      if (activeId === id) {
        $('chatStatus').textContent = 'online';
        renderMessages();
      } else {
        state.chats[id].unread += 1;
      }
      save();
      if (activeId !== id) renderList();
    }, wait + 1500);
    replyTimers.push(t1, t2);
  }
  function showTyping(id) {
    clearTyping();
    const box = $('messages');
    const wrap = el('div', 'row in gap typing-row');
    const b = el('div', 'typing');
    b.append(el('span'), el('span'), el('span'));
    wrap.appendChild(b);
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  }
  function clearTyping() {
    document.querySelectorAll('.typing-row').forEach((n) => n.remove());
  }

  // Occasionally a bot reacts to one of your messages (simulated).
  setInterval(() => {
    if (!activeId) return;
    const chat = state.chats[activeId];
    const mine = chat.messages.filter((m) => m.from === 'me' && !m.reactions.them);
    if (!mine.length || Math.random() > 0.35) return;
    const m = mine[mine.length - 1];
    m.reactions.them = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
    save(); renderMessages();
  }, 9000);

  // ---------- boot ----------
  function init() {
    applyTheme();
    // give every chat a fresh incoming ping so the list shows unread badges
    if (!localStorage.getItem(STORE_KEY)) {
      state.chats.ada.unread = 2;
      state.chats.tunde.unread = 1;
      state.chats.design.unread = 1;
    }
    renderList();
    save();
    // simulate new arrivals in background chats
    setInterval(() => {
      const others = CONTACTS.filter((c) => c.id !== activeId);
      const c = others[Math.floor(Math.random() * others.length)];
      if (!c || Math.random() > 0.25) return;
      const replies = BOT_REPLIES[c.id];
      state.chats[c.id].messages.push({ id: uid(), from: 'them', text: replies[Math.floor(Math.random() * replies.length)], time: Date.now(), reactions: {} });
      state.chats[c.id].unread += 1;
      save(); renderList();
    }, 45000);
  }
  init();
})();
