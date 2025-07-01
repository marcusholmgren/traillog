import { useState } from "react";

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
}

export function useAlert() {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    title: "",
    message: "",
  });

  const showAlert = ({
    title,
    message,
    onConfirm,
  }: Omit<AlertState, "isOpen">) => {
    setAlertState({ isOpen: true, title, message, onConfirm });
  };

  const hideAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  return {
    alert: { ...alertState, hide: hideAlert },
    showAlert,
  };
}
