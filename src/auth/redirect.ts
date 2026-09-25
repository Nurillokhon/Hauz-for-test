/**
 * Where to send someone after sign-in, taken from the `redirect` query param.
 *
 * The brief says to follow that param. Followed blindly it is an open redirect:
 * a link to /sign-in?redirect=https://evil.example would sign someone in on our
 * site and hand them to another. Only paths on this site are accepted.
 */

const ORIGIN = 'http://hauz.invalid'

export function safeRedirect(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return fallback
  }

  // Parse the way a browser would. That catches `//evil.example`,
  // `/\evil.example` and tricks with tabs or newlines, which browsers strip.
  let url: URL
  try {
    url = new URL(value, ORIGIN)
  } catch {
    return fallback
  }

  if (url.origin !== ORIGIN) {
    return fallback
  }

  return `${url.pathname}${url.search}${url.hash}`
}
