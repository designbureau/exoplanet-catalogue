import React, { useState, useCallback } from "react";

export const RefContext = React.createContext();

export const RefProvider = ({ children }) => {
  const [refs, setRefs] = useState({});
  const [activeRef, setActiveRef] = useState(null);
  const [activeMenuItem, setActiveMenuItem] = useState(null);

  const addRef = useCallback((name, type, ref) => {
    const uniqueKey = `${type}-${name}`;
    setRefs((prevRefs) => ({
      ...prevRefs,
      [uniqueKey]: ref,
    }));
    if (ref.current && !ref.current.metadata) {
      Object.assign(ref.current, { metadata: { name, type, uniqueKey } });
    }
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
        setActiveMenuItem(uniqueKey);
      }
    },
    [refs]
  );

  const setActive = useCallback((ref) => {
    if (ref.current && ref.current.metadata) {
      setActiveRef(ref);
      setActiveMenuItem(ref.current.metadata.uniqueKey);
    }
  }, []);

  return (
    <RefContext.Provider
      value={{
        refs,
        addRef,
        resetRefs,
        activeRef,
        setActive,
        setActiveByName,
        activeMenuItem,
      }}
    >
      {children}
    </RefContext.Provider>
  );
};
