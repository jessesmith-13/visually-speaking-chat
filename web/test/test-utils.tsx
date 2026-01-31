import { ReactElement } from "react";
import {
  render,
  RenderOptions,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// Custom render function that includes common providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Re-export commonly used testing utilities
export { screen, waitFor, within };
export { customRender as render };
