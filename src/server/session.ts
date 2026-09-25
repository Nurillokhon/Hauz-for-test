import '@tanstack/react-start/server-only'

import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'

/**
 * The Appwrite session secret lives in one cookie that browser JavaScript
 * cannot read (`httpOnly`). Only server code sees it, and only server code
 * uses it to build a session client.
 */

const SESSION_COOKIE = 'hauz_session'

export function readSessionSecret(): string | undefined {
  return getCookie(SESSION_COOKIE) || undefined
}

export function writeSessionSecret(secret: string, expiresAt: Date) {
  setCookie(SESSION_COOKIE, secret, {
    httpOnly: true,
    // Browsers drop `Secure` cookies on plain http, which is what dev runs on.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export function clearSessionSecret() {
  deleteCookie(SESSION_COOKIE, { path: '/' })
}
