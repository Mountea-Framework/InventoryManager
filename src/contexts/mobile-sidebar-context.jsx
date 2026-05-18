import React, { createContext, useContext, useRef, useCallback } from 'react';

const MobileSidebarContext = createContext({ toggle: () => {}, setToggle: () => {} });

export function MobileSidebarProvider({ children }) {
  const toggleRef = useRef(() => {});

  const setToggle = useCallback((fn) => {
    toggleRef.current = fn;
  }, []);

  const toggle = useCallback(() => {
    toggleRef.current();
  }, []);

  return (
    <MobileSidebarContext.Provider value={{ toggle, setToggle }}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  return useContext(MobileSidebarContext);
}
