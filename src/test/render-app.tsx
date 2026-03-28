import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { AppProvider } from "@/contexts/AppContext";

export function renderWithAppProviders(ui: ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>);
}
