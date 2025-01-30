export type Project = {
  id: number;
  name: string;
  updatedAt: string;
  createdAt: string;
  language: string;
}

export type Workspace = {
  id: string;
  name: string;
  description?: string;
  users: any[];
  projects: Project[];
  settings: any;
  updatedAt: string;
  createdAt: string;
}

export type User = {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  username?: string;
  workspaces: Workspace[];
  oauths: UserOauth[];
  createdAt: string;
  updatedAt: string;
}

export type UserOauth = {
  id: string;
  provider: string;
  userId: string;
  email: string;
  metadata: any;
  accessToken: string;
  refreshToken: string;
  createdAt: string;
  updatedAt: string;
}