import { api } from './api';

/** `returnTo` is a path on this site, e.g. `/ask/my-poll`. */
export function signInWithGoogle(returnTo?: string) {
  window.location.assign(api.auth.googleUrl(returnTo));
  return true;
}
