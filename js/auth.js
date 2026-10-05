/* =====================================================================
 * yekjw.top 全站登录组件（auth.js）
 * ---------------------------------------------------------------------
 * 由 post.ejs / login.ejs / layout.ejs 通过 <script src="/js/auth.js"> 引入。
 * 依赖后端 Cloudflare Worker（见 backend/worker.js）。
 *
 * 部署时把下面的 API_BASE 改成你的 Worker 自定义域名，
 * 或在引入之前定义 window.YEKJW_API_BASE 覆盖。
 * =================================================================== */
(function () {
  var API_BASE = window.YEKJW_API_BASE || 'https://api.yekjw.top';
  var TOKEN_KEY = 'yekjw_token'; // localStorage 里保存的登录凭证 key

  function token() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* 无痕模式等场景忽略 */ }
  }

  // 统一请求封装：自动带 token，自动处理 401 清理
  function api(path, options) {
    options = options || {};
    options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    var t = token();
    if (t) options.headers['Authorization'] = 'Bearer ' + t;
    return fetch(API_BASE + path, options).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401) setToken(''); // token 失效自动登出
        data._status = res.status;
        return data;
      });
    });
  }

  var YekjwAuth = {
    API_BASE: API_BASE,
    token: token,
    setToken: setToken,
    isLoggedIn: function () { return !!token(); },

    /* 登录：成功后 token 自动存入 localStorage */
    login: function (username, password) {
      return api('/api/login', { method: 'POST', body: JSON.stringify({ username: username, password: password }) })
        .then(function (data) {
          if (data.token) setToken(data.token);
          return data;
        });
    },

    logout: function () {
      setToken('');
      window.location.href = '/';
    },

    /* 当前用户信息；未登录返回 null */
    me: function () {
      if (!token()) return Promise.resolve(null);
      return api('/api/me').then(function (data) {
        return data.user || null;
      });
    },

    /* 下载：传入文章 path（即 Hexo 的 page.path / permalink） */
    download: function (postPath) {
      return api('/api/download', { method: 'POST', body: JSON.stringify({ path: postPath }) });
    }
  };

  window.YekjwAuth = YekjwAuth;

  /* 顶栏登录按钮 → 登录后显示用户名和剩余次数 */
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.header-buttons .login-btn, a.login-btn');
    if (!btn) return;
    YekjwAuth.me().then(function (user) {
      if (user) {
        btn.textContent = '👤 ' + user.username + '（剩' + user.remaining + '次）';
        btn.href = '/login/';
        btn.title = '点击查看账户信息 / 退出登录';
      }
    });
  });
})();
