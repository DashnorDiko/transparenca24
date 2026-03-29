import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "../Header";

const mockSetLocale = vi.fn();
const mockToggle = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "dark" as const, setTheme: vi.fn(), toggle: mockToggle }),
}));

vi.mock("@/components/LanguageProvider", () => ({
  useLanguage: () => ({ locale: "en" as const, setLocale: mockSetLocale }),
}));

describe("Header", () => {
  it("renders the brand name", () => {
    render(<Header />);
    expect(screen.getByText("Transparenca24")).toBeInTheDocument();
  });

  it("renders navigation items", () => {
    render(<Header />);
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Tenders")).toBeInTheDocument();
    expect(screen.getByText("Authorities")).toBeInTheDocument();
  });

  it("marks the active nav item with aria-current", () => {
    render(<Header />);
    const dashboardLinks = screen.getAllByText("Analytics");
    const activeLink = dashboardLinks.find(
      (el) => el.getAttribute("aria-current") === "page",
    );
    expect(activeLink).toBeDefined();
  });

  it("switches language when SQ button is clicked", () => {
    render(<Header />);
    fireEvent.click(screen.getByText("SQ"));
    expect(mockSetLocale).toHaveBeenCalledWith("sq");
  });

  it("toggles theme when theme button is clicked", () => {
    render(<Header />);
    const themeButton = screen.getByLabelText("Light mode");
    fireEvent.click(themeButton);
    expect(mockToggle).toHaveBeenCalled();
  });

  it("has a skip navigation link", () => {
    render(<Header />);
    expect(screen.getByText("Skip to main content")).toBeInTheDocument();
  });

  it("uses radiogroup role for language toggle", () => {
    render(<Header />);
    const radioGroup = screen.getByRole("radiogroup");
    expect(radioGroup).toBeInTheDocument();
  });
});
