import React, { createContext, useContext, useState } from "react";

type ScannerContextValue = {
  shouldOpenScanner: boolean;
  requestOpenScanner: () => void;
  consumeOpenScanner: () => void;
};

const ScannerContext = createContext<ScannerContextValue | null>(null);

export function ScannerProvider({ children }: { children: React.ReactNode }) {
  const [shouldOpenScanner, setShouldOpenScanner] = useState(false);

  const requestOpenScanner = () => setShouldOpenScanner(true);
  const consumeOpenScanner = () => setShouldOpenScanner(false);

  return (
    <ScannerContext.Provider
      value={{ shouldOpenScanner, requestOpenScanner, consumeOpenScanner }}
    >
      {children}
    </ScannerContext.Provider>
  );
}

export function useScanner() {
  const ctx = useContext(ScannerContext);
  if (!ctx) {
    throw new Error("useScanner must be used within ScannerProvider");
  }
  return ctx;
}