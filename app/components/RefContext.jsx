import React, { useState, useCallback } from "react";

export const RefContext = React.createContext();

export const RefProvider = ({ children }) => {
  const [refs, setRefs] = useState({});
  const [activeRef, setActiveRef] = useState(null);

  const addRef = useCallback((name, ref) => {
    setRefs((prevRefs) => ({
      ...prevRefs,
      [name]: ref,
    }));
  }, []);

  const resetRefs = useCallback(() => {
    setRefs({});
    setActiveRef(null);
  }, []);

  const setActiveByName = useCallback(
    (name) => {
      if (refs[name]) {
        setActiveRef(refs[name]);
      }
    },
    [refs]
  );

  const setActive = useCallback((ref) => {
    setActiveRef(ref);
  }, []);

  return (
    <RefContext.Provider
      value={{ refs, addRef, resetRefs, activeRef, setActive, setActiveByName }}
    >
      {children}
    </RefContext.Provider>
  );
};
