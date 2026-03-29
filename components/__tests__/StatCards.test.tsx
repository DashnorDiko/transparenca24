import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCards } from "../StatCards";

vi.mock("@/components/TenderDataProvider", () => ({
  useTenderData: () => ({
    stats: {
      totalCount: 42,
      totalEstimatedValue: 1_000_000,
      withWinnerCount: 10,
      uniqueAuthorities: 5,
      categoryBreakdown: [],
      statusBreakdown: [],
      authorityBreakdown: [],
    },
    loading: false,
    error: null,
  }),
}));

vi.mock("@/components/LanguageProvider", () => ({
  useLanguage: () => ({ locale: "en" as const, setLocale: vi.fn() }),
}));

describe("StatCards", () => {
  it("renders the correct stat values", () => {
    render(<StatCards />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("renders all card labels", () => {
    render(<StatCards />);
    expect(screen.getByText("Total Tenders")).toBeInTheDocument();
    expect(screen.getByText("Procuring Authorities")).toBeInTheDocument();
    expect(screen.getByText("With Winner")).toBeInTheDocument();
  });
});
