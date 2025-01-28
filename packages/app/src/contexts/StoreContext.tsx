import { createContext, useState } from "react";

export type State = {
  activeWorkspace: string | null;
};

// Create a Context
export const StoreContext = createContext<{
  state: State;
  changeState: (newState: State) => void;
}>({
  state: { activeWorkspace: null },
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  changeState: () => {},
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  function getInitialState() {
    return {
      activeWorkspace: null,
    };
  }

  const [state, setState] = useState<State>(
    getInitialState(),
  );

  function changeState(newState: State) {
    setState(newState);
  }

  return (
    <StoreContext.Provider value={{ state, changeState }}>
      {children}
    </StoreContext.Provider>
  );
}



