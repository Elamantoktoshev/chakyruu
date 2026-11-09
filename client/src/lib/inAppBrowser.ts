/**
 * In-app browsers where Google refuses to sign people in ("disallowed_useragent"):
 * Instagram, Facebook / Messenger, TikTok, Line. WhatsApp and Telegram open a real browser view.
 */
const GOOGLE_BLOCKED_WEBVIEW = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|TikTok|musical_ly|BytedanceWebview/i;

export function isGoogleBlockedBrowser(userAgent: string): boolean {
  return GOOGLE_BLOCKED_WEBVIEW.test(userAgent);
}
