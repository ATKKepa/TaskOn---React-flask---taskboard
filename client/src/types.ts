export type Todo = {
  id: number;
  title: string;
  done: 0 | 1 | boolean;
  created_at: string;
  list_id?: number;
};

export type List = {
  id: number;
  name: string;
  position: number;
  color?: string;
  created_at: string;
};
