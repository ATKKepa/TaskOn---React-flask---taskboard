import type { List, Todo } from './types';

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    try {
      const data = raw ? JSON.parse(raw) : {};
      throw new Error((data && (data.error || data.message)) || `${res.status} ${res.statusText}`);
    } catch {
      throw new Error(raw || `${res.status} ${res.statusText}`);
    }
  }

  if (res.status === 204) {
    return undefined as unknown as T; // DELETE No Content
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  } else {
    const txt = await res.text();
    return (txt ? (JSON.parse(txt) as T) : (undefined as unknown as T));
  }
}

export const api = {
  list: () => request<Todo[]>('/api/todos'),
  create: (title: string) =>
    request<Todo>('/api/todos', { method: 'POST', body: JSON.stringify({ title }) }),
  update: (id: number, data: Partial<Pick<Todo, 'title' | 'done' | 'list_id'>>) =>
    request<Todo>(`/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/api/todos/${id}`, { method: 'DELETE' }),

lists: {
  all: () => request<List[]>('/api/lists'),
  create: (name: string, color: string) =>
    request<List>('/api/lists', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    }),
  update: (id: number, data: Partial<Pick<List, 'name' | 'position' | 'color'>>) =>
    request<List>(`/api/lists/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/api/lists/${id}`, { method: 'DELETE' }),
},



  todosByList: {
    all: (listId: number) => request<Todo[]>(`/api/lists/${listId}/todos`),
    create: (listId: number, title: string) =>
      request<Todo>(`/api/lists/${listId}/todos`, {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),
  },
};
