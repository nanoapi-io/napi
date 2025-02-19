export type Project = {
  id: number;
  name: string;
  updatedAt: string;
  createdAt: string;
  language: string;
  errors?: number;
  warnings?: number;
}

export type Workspace = {
  id: number;
  name: string;
  description?: string;
  users: any[];
  projects: Project[];
  settings: any;
  updatedAt: string;
  createdAt: string;
}

export type User = {
  id: number;
  name?: string;
  email: string;
  avatar?: string;
  username?: string;
  workspaces: Workspace[];
  oauths: UserOauth[];
  userWorkspaceRole?: UserWorkspaceRole[]
  createdAt: string;
  updatedAt: string;
}

export type UserOauth = {
  id: number;
  provider: string;
  userId: string;
  email: string;
  metadata: any;
  accessToken: string;
  refreshToken: string;
  createdAt: string;
  updatedAt: string;
}

export type UserWorkspaceRole = {
  id: number;
  role: "user" | "admin";
  isOwner: boolean;
  user?: User;
  workspace?: Workspace;
  createdAt: string;
  updatedAt: string;
}

export type Invite = {
  id: number;
  claimed: boolean;
  email: string;
  uuid: string;
  role: "user" // Always defaults to user. Must be set via the UI
  workspaceId: number;
  workspace?: Workspace;
  createdAt: string;
  updatedAt: string;
} 