import { request, endpoints } from './client.js';

export async function login(userId, password) {
  return request('POST', endpoints.login(), { user_id: userId, password });
}

export async function loginAsGuest() {
  return request('POST', endpoints.guest());
}

export async function getSession() {
  try {
    return await request('GET', endpoints.session());
  } catch {
    return null;
  }
}

export async function logout() {
  return request('POST', endpoints.logout());
}

export async function getLoginUsers() {
  return request('GET', endpoints.users());
}
