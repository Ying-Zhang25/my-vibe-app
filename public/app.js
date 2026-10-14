/* 个人作品集 + 留言板 · 前端交互（原生 JS，无外部依赖） */
(function () {
  'use strict';

  var worksEl = document.getElementById('works');
  var msgEl = document.getElementById('messages');
  var emptyEl = document.getElementById('empty');
  var countEl = document.getElementById('count');
  var formEl = document.getElementById('form');
  var nameEl = document.getElementById('name');
  var contentEl = document.getElementById('content');
  var lenEl = document.getElementById('len');
  var errEl = document.getElementById('error');
  var submitEl = document.getElementById('submit');

  var MAX = 200;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showError(msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
  }
  function clearError() {
    errEl.hidden = true;
    errEl.textContent = '';
  }

  /* ---------- 作品 ---------- */
  function renderWorks(works) {
    worksEl.innerHTML = works
      .map(function (w) {
        return (
          '<article class="card">' +
          '<h3>' + esc(w.title) + '</h3>' +
          '<p>' + esc(w.desc) + '</p>' +
          '<span class="tag">' + esc(w.tag) + '</span>' +
          '</article>'
        );
      })
      .join('');
  }

  /* ---------- 留言 ---------- */
  function msgHtml(m) {
    return (
      '<li class="msg">' +
      '<div class="msg-head">' +
      '<span class="msg-name">' + esc(m.name) + '</span>' +
      '<span class="msg-time">' + esc(m.created_at) + '</span>' +
      '</div>' +
      '<div class="msg-body">' + esc(m.content) + '</div>' +
      '</li>'
    );
  }

  function paint(messages) {
    countEl.textContent = messages.length + ' 条';
    if (!messages.length) {
      msgEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    msgEl.innerHTML = messages.map(msgHtml).join('');
  }

  function loadMessages() {
    return fetch('/api/messages')
      .then(function (r) { return r.json(); })
      .then(function (d) { paint(d.messages || []); })
      .catch(function () { showError('留言加载失败，请刷新重试'); });
  }

  /* ---------- 字数统计 ---------- */
  contentEl.addEventListener('input', function () {
    var n = contentEl.value.length;
    lenEl.textContent = n;
    lenEl.parentElement.classList.toggle('over', n > MAX);
  });

  /* ---------- 提交 ---------- */
  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    var content = contentEl.value.trim();
    if (!content) {
      showError('留言内容不能为空');
      return;
    }
    if (content.length > MAX) {
      showError('留言不能超过 ' + MAX + ' 字');
      return;
    }

    submitEl.disabled = true;
    submitEl.textContent = '发布中……';

    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameEl.value.trim(), content: content })
    })
      .then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok) throw new Error(d.error || '发布失败');
          return d;
        });
      })
      .then(function () {
        contentEl.value = '';
        lenEl.textContent = '0';
        lenEl.parentElement.classList.remove('over');
        return loadMessages(); /* 重新拉取，新留言出现在最前 */
      })
      .catch(function (err) { showError(err.message || '网络异常，请稍后重试'); })
      .finally(function () {
        submitEl.disabled = false;
        submitEl.textContent = '发布留言';
      });
  });

  /* ---------- 初始化 ---------- */
  fetch('/api/works')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.site) document.getElementById('site-name').textContent = d.site;
      document.title = (d.site || '我的作品集') + ' · 留言板';
      renderWorks(d.works || []);
    })
    .catch(function () { worksEl.innerHTML = '<p class="loading">作品加载失败</p>'; });

  loadMessages();
})();
