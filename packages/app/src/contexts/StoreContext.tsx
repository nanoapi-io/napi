import { createContext, useState, useEffect } from "react";

export type State = {
  activeWorkspace: string | null;
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
      } else {
        console.error("Failed to fetch user");
      }
    } catch (error) {
      console.error("Failed to fetch user", error);
    }
  }

  useEffect(() => {
    if (localStorage.getItem("jwt")) {
      loadUser();

      const activeWorkspace = localStorage.getItem("activeWorkspace");
      if (activeWorkspace) {
        changeState({ activeWorkspace });
      }
    }
  }, []);

  function getInitialState() {
    return {
      activeWorkspace: null,
      user: null,
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



