/* PromoSlot API client — same-origin, cookie-based sessions. */
(function () {
  async function req(method, path, body, isForm) {
    const opts = { method, credentials: "include", headers: {} };
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
