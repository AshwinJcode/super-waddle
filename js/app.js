(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

  // Each content block has a "type". Add a new type here to support a new kind of content.
  const BLOCKS = {
    heading: b => `<h3>${inline(b.text)}</h3>`,
    text:    b => `<p>${inline(b.text)}</p>`,
    command: b => `<pre><code>${esc(b.text)}</code></pre>`,
    note:    b => `<div class="note">${inline(b.text)}</div>`
  };

  let sections = [], topics = [], current = 0;
  const hashOf = t => `#${t.section.id}/${t.id}`;

  async function getJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} (${r.status})`);
    return r.json();
  }

  async function load() {
    const manifest = await getJSON('data/manifest.json');
    sections = await Promise.all(manifest.sections.map(async s => ({ ...s, topics: (await getJSON(s.file)).topics })));
    topics = sections.flatMap(s => s.topics.map((t, index) => ({ ...t, section: s, index })));
  }

  function buildNav() {
    $('nav').innerHTML = sections.map(s => `
      <details>
        <summary>${esc(s.title)}<small>${s.topics.length} topics</small></summary>
        ${topics.filter(t => t.section === s).map(t =>
          `<a href="${hashOf(t)}"><b>${String(t.index + 1).padStart(2, '0')}</b>${esc(t.title)}</a>`).join('')}
      </details>`).join('');
  }

  function setFooter(btn, t, label) {
    btn.disabled = !t;
    btn.innerHTML = `<small>${label}</small><strong>${t ? esc(t.title) : ''}</strong>`;
    btn.onclick = () => { if (t) location.hash = hashOf(t); };
  }

  function render() {
    const t = topics[current];
    $('section-label').textContent = t.section.title;
    $('topic-title').textContent = t.title;
    $('topic-sub').textContent = t.summary || '';
    $('code-block').hidden = !t.code;
    if (t.code) {
      $('filename').textContent = t.code.filename || '';
      $('code-content').textContent = t.code.text;
    }
    $('explain').innerHTML = (t.blocks || []).map(b => (BLOCKS[b.type] || BLOCKS.text)(b)).join('');
    document.title = `${t.title} — Java Notes`;

    document.querySelectorAll('nav a').forEach(a => {
      const on = a.getAttribute('href') === hashOf(t);
      if (on) { a.setAttribute('aria-current', 'page'); a.closest('details').open = true; }
      else a.removeAttribute('aria-current');
    });
    setFooter($('prev-btn'), topics[current - 1], '← Previous');
    setFooter($('next-btn'), topics[current + 1], 'Next →');
    window.scrollTo(0, 0);
  }

  function route() {
    const i = topics.findIndex(t => hashOf(t) === decodeURIComponent(location.hash));
    current = i >= 0 ? i : 0;
    render();
  }

  $('copyBtn').onclick = async e => {
    const b = e.currentTarget, old = b.textContent;
    try { await navigator.clipboard.writeText(topics[current].code.text); b.textContent = 'Copied'; }
    catch { b.textContent = 'Copy failed'; }
    setTimeout(() => (b.textContent = old), 1200);
  };
  $('menuBtn').onclick = () => $('nav').classList.toggle('open');
  $('nav').addEventListener('click', e => { if (e.target.closest('a')) $('nav').classList.remove('open'); });
  addEventListener('hashchange', route);

  load().then(() => { buildNav(); route(); }).catch(err => {
    $('main').innerHTML = `<div class="error"><strong>Couldn't load the notes.</strong>
      <p>${esc(err.message)}. Open the site through a web server (VS Code "Live Server" or your hosting), not by double-clicking index.html.</p></div>`;
  });
})();