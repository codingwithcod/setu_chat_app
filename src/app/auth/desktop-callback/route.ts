import { NextResponse } from "next/server";

/**
 * Desktop OAuth Callback
 *
 * Receives the OAuth code from Supabase and redirects it to the
 * Tauri desktop app via the setu:// deep link. The code exchange
 * happens client-side in the Tauri webview (where the PKCE verifier lives).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return new NextResponse(
      renderPage("error"),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const deepLinkUrl = `setu://auth/callback?code=${encodeURIComponent(code)}`;

  return new NextResponse(
    renderPage("success", deepLinkUrl),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function renderPage(state: "success" | "error", deepLinkUrl?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Setu - ${state === "success" ? "Authentication Successful" : "Authentication Failed"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #0a0a0a;
      color: #ffffff;
    }
    .container { text-align: center; padding: 2rem; max-width: 420px; }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #7c3aed;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.5rem;
    }
    .checkmark {
      width: 48px; height: 48px;
      border-radius: 50%;
      background: #22c55e;
      display: none;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      animation: scaleIn 0.3s ease-out;
    }
    .checkmark svg { width: 24px; height: 24px; }
    .error-icon {
      width: 48px; height: 48px;
      border-radius: 50%;
      background: #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .error-icon svg { width: 24px; height: 24px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }
    h2 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p { color: #888; font-size: 0.875rem; line-height: 1.5; }
    .close-msg {
      display: none;
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background: rgba(124, 58, 237, 0.1);
      border: 1px solid rgba(124, 58, 237, 0.2);
      border-radius: 8px;
      color: #a78bfa;
      font-size: 0.8rem;
    }
    a { color: #7c3aed; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .fallback { margin-top: 1rem; font-size: 0.75rem; }
  </style>
</head>
<body>
  <div class="container">
    ${state === "error" ? `
      <div class="error-icon">
        <svg fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </div>
      <h2>Authentication Failed</h2>
      <p>No authorization code was received. Please go back to the Setu app and try again.</p>
    ` : `
      <div class="spinner" id="spinner"></div>
      <div class="checkmark" id="checkmark">
        <svg fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <h2 id="title">Authentication Successful!</h2>
      <p id="subtitle">Redirecting you back to the Setu desktop app...</p>
      <div class="close-msg" id="close-msg">
        ✅ You're all set! You can safely close this browser tab.
      </div>
      <p class="fallback" id="fallback">
        If the app doesn't open automatically,
        <a href="${deepLinkUrl}">click here</a>.
      </p>
      <script>
        // Redirect to deep link
        setTimeout(function() {
          window.location.href = "${deepLinkUrl}";
        }, 500);

        // After a short delay, show the "you can close this tab" message
        setTimeout(function() {
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('checkmark').style.display = 'flex';
          document.getElementById('title').textContent = 'You\\'re signed in!';
          document.getElementById('subtitle').textContent = 'The Setu desktop app should now be logged in.';
          document.getElementById('close-msg').style.display = 'block';
          document.getElementById('fallback').style.display = 'none';
        }, 3000);
      </script>
    `}
  </div>
</body>
</html>`;
}
