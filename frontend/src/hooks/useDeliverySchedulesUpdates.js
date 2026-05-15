import { useEffect } from "react";

const EVENT_NAME = "deliverySchedulesUpdated";

export function emitDeliverySchedulesUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function useDeliverySchedulesUpdates(onUpdate) {
  useEffect(() => {
    if (typeof window === "undefined" || typeof onUpdate !== "function") return undefined;

    const handler = () => onUpdate();

    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [onUpdate]);
}