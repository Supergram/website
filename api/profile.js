const DEFAULT_API_BASE_URL = "https://dev-api.supergram.in";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.supergram&hl=en_IN";
const PACKAGE_NAME = "com.supergram";
const PUBLIC_SHARE_ORIGIN = "https://www.himmin.com";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJsString(value) {
  return JSON.stringify(String(value ?? ""))
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function cleanIdentifier(value) {
  return String(value ?? "").trim().slice(0, 160);
}

function getOrigin(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim() || "https";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "himmin.com")
    .split(",")[0]
    .trim();

  return `${proto}://${host}`;
}

function getRequestUrl(req) {
  const origin = getOrigin(req);
  return new URL(req.url || "/profile", origin);
}

function normalizeApiBaseUrl(value) {
  const raw = String(value || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, "");

  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString().replace(/\/+$/, "");
    }
  } catch (_) {
    // Fall through to the safe default.
  }

  return DEFAULT_API_BASE_URL;
}

function safeHttpUrl(value) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(String(value));
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch (_) {
    return "";
  }

  return "";
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function displayHandle(profile, identifier) {
  const handle = firstString(profile.handle, profile.username, identifier);
  if (!handle) {
    return "";
  }

  return handle.startsWith("@") ? handle : `@${handle}`;
}

function buildProfileIntentUrl(encodedIdentifier) {
  const pathAndQuery = encodedIdentifier
    ? `otherUser?u=${encodedIdentifier}`
    : "otherUser";

  return `intent://${pathAndQuery}#Intent;scheme=supergram;package=${PACKAGE_NAME};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`;
}

async function fetchProfile(identifier) {
  if (!identifier) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  const apiBaseUrl = normalizeApiBaseUrl(process.env.PROFILE_SHARE_API_BASE_URL);
  const url = `${apiBaseUrl}/v1/share/profiles/${encodeURIComponent(identifier)}`;

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json();
    if (body && typeof body === "object" && body.data && typeof body.data === "object") {
      return body.data;
    }

    return body;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildProfileView(profile, identifier, origin, requestUrl) {
  const handle = displayHandle(profile || {}, identifier);
  const name = firstString(profile?.displayName, profile?.name, handle, identifier, "Himmin profile");
  const bio = firstString(profile?.bio, profile?.description);
  const title = identifier ? `${name} on Himmin` : "Open this Himmin profile";
  const description = bio || (handle ? `View ${handle} on Himmin.` : "Continue to this profile in the Himmin app.");
  const fallbackImage = `${PUBLIC_SHARE_ORIGIN}/src/images/new_logo.jpeg`;
  const avatarUrl = profile?.hasAvatar ? safeHttpUrl(profile.avatarUrl) : "";
  const imageUrl = avatarUrl || fallbackImage;
  const encodedIdentifier = encodeURIComponent(identifier || "");
  const canonicalPath = identifier ? `/profile?u=${encodedIdentifier}` : "/profile";
  const canonicalUrl = `${PUBLIC_SHARE_ORIGIN}${canonicalPath}`;

  return {
    title,
    description,
    imageUrl,
    canonicalUrl,
    currentUrl: canonicalUrl,
    name,
    handle,
    bio,
    encodedIdentifier,
    appLinkUrl: canonicalUrl,
    intentUrl: buildProfileIntentUrl(encodedIdentifier),
  };
}

function renderProfileHtml(view) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(view.title)}</title>
    <meta name="description" content="${escapeHtml(view.description)}" />

    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="canonical" href="${escapeHtml(view.canonicalUrl)}" />

    <meta property="og:title" content="${escapeHtml(view.title)}" />
    <meta property="og:description" content="${escapeHtml(view.description)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${escapeHtml(view.currentUrl)}" />
    <meta property="og:image" content="${escapeHtml(view.imageUrl)}" />
    <meta property="og:image:alt" content="${escapeHtml(view.name)}" />
    <meta property="og:site_name" content="Himmin" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(view.title)}" />
    <meta name="twitter:description" content="${escapeHtml(view.description)}" />
    <meta name="twitter:image" content="${escapeHtml(view.imageUrl)}" />

    <style>
      *, *::before, *::after { box-sizing: border-box; }
      :root {
        --bg: #050505;
        --surface: #121214;
        --surface-strong: #18181b;
        --line: rgba(255, 255, 255, 0.12);
        --text: #f7f7f8;
        --muted: #b8bac2;
        --muted-strong: #d8d9de;
        --red: #bf0a30;
        --red-dark: #930722;
      }
      html { min-height: 100%; }
      body {
        min-height: 100vh;
        margin: 0;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--text);
        background:
          linear-gradient(180deg, rgba(191, 10, 48, 0.12) 0%, rgba(5, 5, 5, 0) 36%),
          var(--bg);
      }
      a { color: inherit; text-decoration: none; }
      .page { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
      .topbar { width: min(1120px, calc(100% - 40px)); margin: 0 auto; padding: 22px 0; }
      .brand-link { display: inline-flex; align-items: center; gap: 12px; font-size: 1.05rem; font-weight: 800; }
      .brand-link img { width: 40px; height: 40px; border-radius: 16px; object-fit: cover; box-shadow: 0 0 0 2px rgba(191, 10, 48, 0.34); }
      .content {
        width: min(1120px, calc(100% - 40px));
        margin: 0 auto;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 52px;
        align-items: center;
        padding: 54px 0 84px;
      }
      .copy { max-width: 620px; }
      .eyebrow { margin: 0 0 18px; color: var(--red); font-size: 0.86rem; font-weight: 800; text-transform: uppercase; }
      h1 { margin: 0; font-size: 2.9rem; line-height: 1.08; letter-spacing: 0; }
      .summary { margin: 22px 0 0; color: var(--muted); font-size: 1.08rem; line-height: 1.75; max-width: 560px; }
      .actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 34px; }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 50px;
        padding: 13px 22px;
        border-radius: 999px;
        font-weight: 800;
        transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
      }
      .button-primary { background: var(--red); color: #fff; border: 1px solid var(--red); box-shadow: 0 18px 45px rgba(191, 10, 48, 0.28); }
      .button-secondary { color: var(--muted-strong); border: 1px solid var(--line); background: rgba(255, 255, 255, 0.04); }
      .button:hover { transform: translateY(-2px); }
      .button-primary:hover { background: var(--red-dark); border-color: var(--red-dark); }
      .button-secondary:hover { border-color: rgba(255, 255, 255, 0.24); }
      .status { margin: 18px 0 0; color: var(--muted); font-size: 0.94rem; line-height: 1.6; }
      .profile-panel {
        border: 1px solid var(--line);
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)), var(--surface);
        padding: 26px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
      }
      .profile-media {
        aspect-ratio: 1;
        border-radius: 8px;
        display: grid;
        place-items: center;
        overflow: hidden;
        background: radial-gradient(circle at 30% 22%, rgba(191, 10, 48, 0.32), rgba(191, 10, 48, 0) 38%), var(--surface-strong);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .profile-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .profile-label { margin: 20px 0 0; color: var(--muted); font-size: 0.9rem; font-weight: 700; text-transform: uppercase; }
      .profile-value { margin: 6px 0 0; font-size: 1.28rem; font-weight: 800; line-height: 1.35; overflow-wrap: anywhere; }
      .profile-handle { margin: 6px 0 0; color: var(--muted); font-size: 1rem; overflow-wrap: anywhere; }
      @media (max-width: 820px) {
        .content { grid-template-columns: 1fr; gap: 34px; padding-top: 34px; }
        h1 { font-size: 2.25rem; }
        .summary { font-size: 1rem; }
        .profile-panel { order: -1; max-width: 360px; }
      }
      @media (max-width: 520px) {
        .topbar, .content { width: min(100% - 28px, 1120px); }
        .actions { flex-direction: column; }
        .button { width: 100%; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="topbar">
        <a class="brand-link" href="/" aria-label="Himmin home">
          <img src="/src/images/logo.png" alt="" />
          <span>Himmin</span>
        </a>
      </header>

      <section class="content" aria-labelledby="page-title">
        <div class="copy">
          <p class="eyebrow">Profile link</p>
          <h1 id="page-title">${escapeHtml(view.title)}</h1>
          <p class="summary">${escapeHtml(view.description)}</p>

          <div class="actions">
            <a class="button button-primary" id="open-app" href="${escapeHtml(view.appLinkUrl)}">Open in Himmin</a>
            <a class="button button-secondary" href="${escapeHtml(PLAY_STORE_URL)}" target="_blank" rel="noopener noreferrer">Get the app</a>
          </div>

          <p class="status">If Himmin is installed, this profile link can open directly in the app.</p>
        </div>

        <aside class="profile-panel" aria-label="Shared Himmin profile">
          <div class="profile-media">
            <img src="${escapeHtml(view.imageUrl)}" alt="${escapeHtml(view.name)}" />
          </div>
          <p class="profile-label">Shared profile</p>
          <p class="profile-value">${escapeHtml(view.name)}</p>
          ${view.handle ? `<p class="profile-handle">${escapeHtml(view.handle)}</p>` : ""}
        </aside>
      </section>
    </main>

    <script>
      (function () {
        var playStoreUrl = ${safeJsString(PLAY_STORE_URL)};
        var intentUrl = ${safeJsString(view.intentUrl)};
        var isAndroid = /Android/i.test(navigator.userAgent);
        var openButton = document.getElementById("open-app");

        if (openButton) {
          openButton.href = isAndroid ? intentUrl : playStoreUrl;
        }

        if (isAndroid) {
          window.setTimeout(function () {
            if (!document.hidden) {
              window.location.href = intentUrl || playStoreUrl;
            }
          }, 650);
        }
      })();
    </script>
  </body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const requestUrl = getRequestUrl(req);
  const identifier = cleanIdentifier(requestUrl.searchParams.get("u"));
  const profile = await fetchProfile(identifier);
  const view = buildProfileView(profile, identifier, getOrigin(req), requestUrl);
  const html = renderProfileHtml(view);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");
  res.statusCode = 200;

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  res.end(html);
};
