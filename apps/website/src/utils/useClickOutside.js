import { useEffect } from "react";

const useClickOutside = (refs, handler, active = true) => {
  useEffect(() => {
    if (!active) return;

    const listener = (event) => {
      const isInside = refs.some(
        (ref) => ref.current && ref.current.contains(event.target),
      );

      if (!isInside) {
        handler();
      }
    };

    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [refs, handler, active]);
};

export default useClickOutside;
