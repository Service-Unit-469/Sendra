import { useCallback, useState } from "react";

export function useModalState(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((state) => !state);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
