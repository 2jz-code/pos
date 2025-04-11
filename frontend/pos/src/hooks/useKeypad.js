import { useState } from "react";

export const useKeypad = () => {
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [keypadProps, setKeypadProps] = useState({
    value: "",
    onChange: () => {},
    title: "Enter Value",
    maxLength: 10,
    decimal: false
  });

  const openKeypad = (props) => {
    setKeypadProps({
      ...keypadProps,
      ...props,
      onClose: () => setIsKeypadOpen(false)
    });
    setIsKeypadOpen(true);
  };

  return {
    isKeypadOpen,
    keypadProps,
    openKeypad,
    closeKeypad: () => setIsKeypadOpen(false)
  };
};