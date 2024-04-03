import React, { useState, useCallback } from "react";

export const RefContext = React.createContext();

export const RefProvider = ({ children }) => {
  const [refs, setRefs] = useState({});
  const [activeRef, setActiveRef] = useState(null);

  const addRef = useCallback((name, type, ref) => {
    const uniqueKey = `${type}-${name}`;
    setRefs((prevRefs) => ({
      ...prevRefs,
      [uniqueKey]: ref,
    }));
  }, []);

  const resetRefs = useCallback(() => {
    setRefs({});
    setActiveRef(null);
  }, []);

  const setActiveByName = useCallback(
    (name, type) => {
      const uniqueKey = `${type}-${name}`;
      if (refs[uniqueKey]) {
        setActiveRef(refs[uniqueKey]);
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
