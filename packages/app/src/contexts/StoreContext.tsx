import { createContext, useState, useEffect } from "react";
import { Workspace } from "../types";

export type State = {
  activeWorkspace: Workspace | null;
  user: any;
};

// Create a Context
export const StoreContext = createContext<{
  state: State;
  changeState: (newState: Partial<State>) => void;
}>({
  state: { activeWorkspace: null, user: null },
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  changeState: () => {},
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const loadUser = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/v1/users/self`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
      });
      if (response.ok) {
        const user = await response.json();
        changeState({ user });
        return user;
      } else {
        console.error("Failed to fetch user");
      }
    } catch (error) {
      console.error("Failed to fetch user", error);
    }
  }

  useEffect(() => {
    if (localStorage.getItem("jwt")) {
      loadUser()
        .then((user: any) => {
          if (!user) {
            localStorage.removeItem("jwt");
            localStorage.removeItem("activeWorkspace");
            window.location.pathname = "/login";
          }

          let activeWorkspaceId: number;
          if (!state.activeWorkspace) {
            // If we don't already have the active workspace in the state, we'll try to get it from the local storage. In the case it's not there, we'll set the workspace to the one named "Default".
            if (!localStorage.getItem("activeWorkspace")) {
              const defaultWorkspace = user.workspaces.find((workspace: Workspace) => workspace.name === "Default");
              localStorage.setItem("activeWorkspace", defaultWorkspace.id);
              changeState({ activeWorkspace: defaultWorkspace });
              return;
            }

            activeWorkspaceId = parseInt(localStorage.getItem("activeWorkspace") as string);
          } else {
            activeWorkspaceId = state.activeWorkspace.id;
          }

          if (activeWorkspaceId) {
            const activeWorkspace = user.workspaces.find((workspace: Workspace) => workspace.id === activeWorkspaceId);
            changeState({ activeWorkspace });
          }
        });
    }
  }, []);

  function getInitialState() {
    if (!localStorage.getItem("jwt")) {
      return {
        activeWorkspace: null,
        user: null,
      };
    }

    const user = JSON.parse(localStorage.getItem("user") as string);
    const activeWorkspaceId = localStorage.getItem("activeWorkspace");

    return {
      activeWorkspace: user.workspaces.find((workspace: Workspace) => workspace.id === parseInt(activeWorkspaceId as string)),
      user,
    };
  }

  const [state, setState] = useState<State>(
    getInitialState(),
  );

  function changeState(newState: Partial<State>) {
    setState({
      ...state,
      ...newState,
    });
  }

  return (
    <StoreContext.Provider value={{ state, changeState }}>
      {children}
    </StoreContext.Provider>
  );
}



