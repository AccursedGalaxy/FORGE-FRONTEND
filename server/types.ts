export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  members: string[];
  dueDate: string;
  tag: string;
  progress: number;
  tasks: { todo: number; inProgress: number; review: number; done: number };
  claudeEnabled: boolean;
  projectPath: string;
}

export interface Card {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  assignee: string;
  tags: string[];
  due: string;
  description: string;
  claudeSessionId: string | null;
  claudeStatus: string | null;
  claudeNotes: string;
}

export interface Column {
  id: string;
  title: string;
  cards: Card[];
}

export interface Board {
  columns: Column[];
}
