import { api } from './api';

export function signInWithGoogle() {
  window.location.assign(api.auth.googleUrl());
  return true;
}
