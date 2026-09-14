"use client";

import { useEffect } from "react";

export function AutoPrintOnLoad() {
  useEffect(() => {
    let printed = false;

    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      window.print();
    };

    const timer = window.setTimeout(triggerPrint, 500);
    window.addEventListener("load", triggerPrint, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", triggerPrint);
    };
  }, []);

  return null;
}
