import type { Todo } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (res.status === 204) return undefined as T;

  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    if (ct.includes('application/json')) {
      try { const j = await res.json(); msg = (j as any).error ?? msg; } catch {}
    } else {
      try { const txt = await res.text(); if (txt) msg = txt; } catch {}
    }
    throw new Error(msg);
  }
  if (!ct.includes('application/json')) {
    const txt = await res.text();
    throw new Error(`Unexpected response (not JSON): ${txt.slice(0, 80)}…`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  list: () => request<Todo[]>('/api/todos'),
  create: (title: string) =>
    request<Todo>('/api/todos', { method: 'POST', body: JSON.stringify({ title }) }),
  update: (id: number, data: Partial<Pick<Todo, 'title' | 'done'>>) =>
    request<Todo>(`/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: number) =>
    request<void>(`/api/todos/${id}`, { method: 'DELETE' }),
};
