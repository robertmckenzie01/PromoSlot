/* PromoSlot API client — same-origin, cookie-based sessions. */
(function () {
  // Double-submit CSRF: the backend sets a readable (non-httpOnly) ps_csrf
  // cookie on first visit; every mutating request must echo its value back
  // in a header so a forged cross-site request (which can't read our
  // cookies) gets rejected. See backend/csrf.py for the full explanation.
  function csrfCookie() {
    const m = document.cookie.match(/(?:^|;\s*)ps_csrf=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  async function req(method, path, body, isForm) {
    const opts = { method, credentials: "include", headers: {} };
    if (method !== "GET" && method !== "HEAD") {
      const csrf = csrfCookie();
      if (csrf) opts.headers["X-CSRF-Token"] = csrf;
    }
    if (body !== undefined && body !== null) {
      if (isForm) {
        opts.body = body; // FormData; browser sets multipart headers
      } else {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(body);
      }
    }
    const res = await fetch(path, opts);
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
    if (!res.ok) {
      let msg = "HTTP " + res.status;
      if (data && data.detail) {
        msg = Array.isArray(data.detail)
          ? data.detail.map(d => d.msg || d).join(", ")
          : data.detail;
      }
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  window.PSApi = {
    get: (p) => req("GET", p),
    post: (p, b) => req("POST", p, b),
    postForm: (p, fd) => req("POST", p, fd, true),
    patch: (p, b) => req("PATCH", p, b),
    del: (p) => req("DELETE", p),

    // auth
    me: () => req("GET", "/auth/me"),
    signup: (b) => req("POST", "/auth/signup", b),
    login: (b) => req("POST", "/auth/login", b),
    logout: () => req("POST", "/auth/logout"),
    linkProfile: (b) => req("POST", "/auth/link-profile", b),
    switchAccount: () => req("POST", "/auth/switch-account"),
  };
})();
