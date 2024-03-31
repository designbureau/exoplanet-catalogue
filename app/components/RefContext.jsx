import React, { useState, useCallback } from "react";

export const RefContext = React.createContext();

export const RefProvider = ({ children }) => {
  const [refs, setRefs] = useState({});

  const addRef = useCallback((name, ref) => {
    setRefs((prevRefs) => ({
      ...prevRefs,
      [name]: ref,
    }));
  }, []);

  const resetRefs = useCallback(() => {
    setRefs({});
  }, []);

  return (
    <RefContext.Provider value={{ refs, addRef, resetRefs }}>
      {children}
    </RefContext.Provider>
  );
};
