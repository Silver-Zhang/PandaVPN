(function () {
  'use strict';

  const panda = window.panda || { invoke: mockInvoke };
  const state = {
    dashboard: null,
    delays: new Map(),
    filter: '',
    toastTimer: null
  };

  function $(selector) {
    return document.querySelector(selector);
  }

  function $$(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function modeKey(mode) {
    const value = String(mode || '').toLowerCase();
    if (value === 'global') {
      return 'global';
    }
    if (value === 'direct') {
      return 'direct';
    }
    return 'rule';
  }

  function modeText(mode) {
    const key = modeKey(mode);
    if (key === 'global') {
      return '全局代理';
    }
    if (key === 'direct') {
      return '直连模式';
    }
    return '智能代理';
  }

  function shortPath(value) {
    const text = String(value || '');
    if (text.length <= 48) {
      return text || '-';
    }
    return `${text.slice(0, 20)}...${text.slice(-24)}`;
  }

  function formatDate(value) {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  }

  function setText(selector, value) {
    const node = $(selector);
    if (node) {
      node.textContent = value == null || value === '' ? '-' : String(value);
    }
  }

  function setBadge(selector, text, tone) {
    const node = $(selector);
    if (!node) {
      return;
    }
    node.textContent = text;
    node.className = 'badge';
    if (tone === 'muted') {
      node.classList.add('badge-muted');
    }
    if (tone === 'warn') {
      node.classList.add('badge-warn');
    }
    if (tone === 'danger') {
      node.classList.add('badge-danger');
    }
  }

  function toast(message) {
    const node = $('#toast');
    if (!node) {
      return;
    }
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => node.classList.remove('show'), 2800);
  }

  function setLoading(enabled) {
    $('#app').classList.toggle('is-loading', Boolean(enabled));
  }

  function getRows() {
    const rows = state.dashboard && state.dashboard.proxies ? state.dashboard.proxies.rows || [] : [];
    const query = state.filter.trim().toLowerCase();
    if (!query) {
      return rows;
    }
    return rows.filter(row => row.name.toLowerCase().includes(query));
  }

  function renderNodes() {
    const list = $('#nodeList');
    if (!list) {
      return;
    }
    const dashboard = state.dashboard || {};
    const rows = getRows();
    if (!rows.length) {
      list.innerHTML = '<div class="node-empty">没有可显示的节点</div>';
      return;
    }
    list.innerHTML = rows
      .map(row => {
        const delay = state.delays.get(row.name);
        const delayClass = delay == null ? '' : delay >= 0 && delay < 800 ? 'good' : 'bad';
        const delayText = delay == null ? '-' : delay >= 0 ? `${delay} ms` : '失败';
        const selected = row.name === dashboard.proxies.current || row.selected;
        return `
          <div class="node-row${selected ? ' selected' : ''}" data-node="${escapeHtml(row.name)}">
            <div class="node-name" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</div>
            <div class="node-type">${escapeHtml(row.type || '-')}</div>
            <div class="node-delay ${delayClass}">${delayText}</div>
            <button class="button button-small switch-node" type="button" data-node="${escapeHtml(row.name)}">${selected ? '已选择' : '切换'}</button>
          </div>
        `;
      })
      .join('');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderDashboard(dashboard) {
    state.dashboard = dashboard;
    const config = dashboard.config || {};
    const core = dashboard.core || {};
    const settings = dashboard.settings || {};
    const proxies = dashboard.proxies || {};
    const account = dashboard.account || {};
    const profile = account.profile || {};
    const auth = account.auth || {};
    const mode = modeKey(config.mode);

    setText('#coreState', core.running ? '核心运行中' : '核心未运行');
    setText('#currentProxy', proxies.current || '未选择');
    setText('#httpPort', config.httpPort || '-');
    setText('#socksPort', config.socksPort || '-');
    setText('#proxyCount', proxies.count || 0);
    setText('#profileSource', profile.name || profile.sourceType || settings.currentProfile || '-');
    setText('#profileCount', profile.proxyCount == null ? proxies.count || '-' : profile.proxyCount);
    setText('#profileUpdated', formatDate(profile.importedAt));
    setText('#dataDir', shortPath(config.dataDir));
    setText('#configFile', shortPath(config.activeConfigFile));
    setText('#controlApi', core.control || '-');
    setText('#coreLog', core.logTail ? core.logTail.trim() : '暂无日志');
    setBadge('#modeBadge', config.modeLabel || modeText(mode), core.running ? undefined : 'warn');
    setBadge('#accountState', auth && auth.username ? auth.username : '未登录', auth && auth.username ? undefined : 'muted');

    $('#systemProxy').checked = Boolean(settings.systemProxy);
    $$('.mode-button').forEach(button => {
      button.classList.toggle('active', button.dataset.mode === mode);
    });

    const usernameInput = $('#username');
    if (usernameInput && document.activeElement !== usernameInput && !usernameInput.value && auth && auth.username) {
      usernameInput.value = auth.username;
    }

    renderNodes();
  }

  async function loadDashboard(quiet) {
    try {
      const dashboard = await panda.invoke('dashboard');
      renderDashboard(dashboard);
      if (!quiet) {
        toast('状态已刷新');
      }
    } catch (error) {
      toast(error.message || String(error));
    }
  }

  async function callAction(action, payload, successMessage) {
    setLoading(true);
    try {
      const result = await panda.invoke(action, payload || {});
      if (result && result.dashboard) {
        renderDashboard(result.dashboard);
      } else if (result && result.appName) {
        renderDashboard(result);
      } else {
        await loadDashboard(true);
      }
      if (successMessage) {
        toast(successMessage);
      }
      return result;
    } catch (error) {
      toast(error.message || String(error));
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function runUrlTest(url) {
    setBadge('#testState', '测试中', 'warn');
    setText('#testOutput', `Testing ${url}`);
    try {
      const result = await panda.invoke('test-url', { url });
      setBadge('#testState', result.ok ? '通过' : '失败', result.ok ? undefined : 'danger');
      setText(
        '#testOutput',
        [
          `url=${result.url}`,
          `ok=${result.ok}`,
          `http=${result.httpCode}`,
          `remote_ip=${result.remoteIp || '-'}`,
          `time=${result.timeTotal || '-'}s`,
          `proxy=${result.proxy}`,
          result.stderr ? `stderr=${result.stderr}` : ''
        ]
          .filter(Boolean)
          .join('\n')
      );
    } catch (error) {
      setBadge('#testState', '失败', 'danger');
      setText('#testOutput', error.message || String(error));
    }
  }

  async function runLanTest() {
    setBadge('#testState', '测试中', 'warn');
    setText('#testOutput', 'Testing 192.168.9.27:22');
    try {
      const result = await panda.invoke('test-tcp', { host: '192.168.9.27', port: 22 });
      setBadge('#testState', result.ok ? '通过' : '失败', result.ok ? undefined : 'danger');
      setText(
        '#testOutput',
        [
          `host=${result.host}`,
          `port=${result.port}`,
          `ok=${result.ok}`,
          `elapsed=${result.elapsedMs}ms`,
          result.error ? `error=${result.error}` : ''
        ]
          .filter(Boolean)
          .join('\n')
      );
    } catch (error) {
      setBadge('#testState', '失败', 'danger');
      setText('#testOutput', error.message || String(error));
    }
  }

  function bindEvents() {
    $('#refreshDashboard').addEventListener('click', () => loadDashboard(false));
    $('#startCore').addEventListener('click', () => callAction('start-core', {}, '核心已启动'));
    $('#stopCore').addEventListener('click', () => callAction('stop-core', {}, '核心已停止'));
    $('#openConfig').addEventListener('click', () => callAction('open-config-dir', {}, '已打开配置目录'));
    $('#openLogs').addEventListener('click', () => callAction('open-logs-dir', {}, '已打开日志目录'));
    $('#systemProxy').addEventListener('change', event => {
      callAction('set-system-proxy', { enabled: event.target.checked }, event.target.checked ? '系统代理已启用' : '系统代理已关闭').catch(() => {
        event.target.checked = !event.target.checked;
      });
    });

    $$('.mode-button').forEach(button => {
      button.addEventListener('click', () => callAction('set-mode', { mode: button.dataset.mode }, `已切换到${modeText(button.dataset.mode)}`));
    });

    $('#nodeSearch').addEventListener('input', event => {
      state.filter = event.target.value;
      renderNodes();
    });

    $('#nodeList').addEventListener('click', event => {
      const button = event.target.closest('.switch-node');
      if (!button || !state.dashboard) {
        return;
      }
      callAction(
        'switch-proxy',
        {
          selector: state.dashboard.proxies.selector || 'Proxy',
          proxy: button.dataset.node
        },
        '节点已切换'
      );
    });

    $('#delayAll').addEventListener('click', async () => {
      const names = getRows()
        .slice(0, 60)
        .map(row => row.name);
      if (!names.length) {
        toast('没有可测试的节点');
        return;
      }
      setLoading(true);
      try {
        const results = await panda.invoke('check-delays', { names });
        results.forEach(item => state.delays.set(item.name, item.delay));
        renderNodes();
        toast('延迟测试完成');
      } catch (error) {
        toast(error.message || String(error));
      } finally {
        setLoading(false);
      }
    });

    $('#importForm').addEventListener('submit', event => {
      event.preventDefault();
      const source = $('#subscriptionSource').value.trim();
      callAction('import-source', { source }, '订阅已导入').then(() => {
        $('#subscriptionSource').value = '';
      });
    });

    $('#importFile').addEventListener('click', () => callAction('import-file', {}, '文件已导入'));

    $('#loginForm').addEventListener('submit', event => {
      event.preventDefault();
      callAction(
        'login',
        {
          base: $('#apiBase').value.trim(),
          username: $('#username').value.trim(),
          password: $('#password').value
        },
        '账号已登录，节点已更新'
      ).then(() => {
        $('#password').value = '';
      });
    });

    $('#refreshUser').addEventListener('click', () => {
      callAction('refresh-user', { base: $('#apiBase').value.trim() }, '账号订阅已刷新');
    });

    $$('[data-test-url]').forEach(button => {
      button.addEventListener('click', () => runUrlTest(button.dataset.testUrl));
    });
    $('#testLan').addEventListener('click', runLanTest);
    $('#customTestForm').addEventListener('submit', event => {
      event.preventDefault();
      runUrlTest($('#customTestUrl').value.trim());
    });
  }

  function mockDashboard() {
    return {
      appName: '熊猫上网 Linux',
      core: {
        running: true,
        binary: '/usr/local/bin/mihomo',
        control: 'http://127.0.0.1:4788',
        logTail: '[info] dashboard preview mode\n[info] proxy selector ready'
      },
      config: {
        dataDir: '/home/silver/.config/xiongmao-vpn-linux',
        activeConfigFile: '/home/silver/.config/xiongmao-vpn-linux/clash-configs/config.yaml',
        httpPort: 4780,
        socksPort: 4781,
        mode: 'Rule',
        modeLabel: '智能代理'
      },
      settings: {
        systemProxy: false,
        currentSelector: 'Proxy',
        currentProxy: '香港 01'
      },
      account: {
        auth: { username: 'preview@example.com', hasCookie: true },
        profile: { name: 'account subscription', proxyCount: 31, importedAt: new Date().toISOString() }
      },
      subscriptions: [],
      proxies: {
        selector: 'Proxy',
        current: '香港 01',
        count: 5,
        rows: [
          { name: '香港 01', type: 'Vmess', selected: true },
          { name: '日本 02', type: 'SSR', selected: false },
          { name: '新加坡 03', type: 'Vmess', selected: false },
          { name: '美国 04', type: 'Vmess', selected: false },
          { name: '台湾 05', type: 'SSR', selected: false }
        ]
      }
    };
  }

  async function mockInvoke(action, payload) {
    if (!state.dashboard) {
      state.dashboard = mockDashboard();
    }
    if (action === 'set-mode') {
      state.dashboard.config.mode = payload.mode;
      state.dashboard.config.modeLabel = modeText(payload.mode);
      return state.dashboard;
    }
    if (action === 'switch-proxy') {
      state.dashboard.proxies.current = payload.proxy;
      state.dashboard.settings.currentProxy = payload.proxy;
      state.dashboard.proxies.rows.forEach(row => {
        row.selected = row.name === payload.proxy;
      });
      return state.dashboard;
    }
    if (action === 'check-delays') {
      return (payload.names || []).map((name, index) => ({ name, delay: 96 + index * 47 }));
    }
    if (action === 'test-url') {
      return {
        ok: true,
        url: payload.url,
        httpCode: 200,
        remoteIp: '142.250.72.36',
        timeTotal: '0.218',
        proxy: 'http://127.0.0.1:4780'
      };
    }
    if (action === 'test-tcp') {
      return { ok: true, host: payload.host, port: payload.port, elapsedMs: 18 };
    }
    return state.dashboard;
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    loadDashboard(true);
    setInterval(() => loadDashboard(true), 10000);
  });
})();
