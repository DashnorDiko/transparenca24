import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TenderDataProvider, useTenderData } from "../TenderDataProvider";

const mockTenders = {
  scrapedAt: "2025-01-15T00:00:00Z",
  source: "https://openprocurement.al",
  totalCount: 2,
  tenders: [
    {
      id: "t1",
      title: "Road repair",
      authority: "Bashkia Tirane",
      contractor: "SHPK Test",
      contractType: "Punë Publike",
      estimatedValue: 5000000,
      winnerValue: 4500000,
      status: "Lidhur Kontrata",
      procedureType: "Procedurë e Hapur",
      announcementDate: "2025-01-10",
      detailUrl: "https://example.com",
      category: "Infrastrukturë",
    },
    {
      id: "t2",
      title: "School renovation",
      authority: "Bashkia Durres",
      contractor: "",
      contractType: "Punë Publike",
      estimatedValue: 3000000,
      winnerValue: null,
      status: "Shpallur Procedura",
      procedureType: "Procedurë e Hapur",
      announcementDate: "2025-01-12",
      detailUrl: "",
      category: "Arsim",
    },
  ],
};

function TestConsumer() {
  const { tenders, loading, error, stats } = useTenderData();
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return (
    <div>
      <span data-testid="count">{tenders.length}</span>
      <span data-testid="authorities">{stats.uniqueAuthorities}</span>
      <span data-testid="winner-count">{stats.withWinnerCount}</span>
    </div>
  );
}

describe("TenderDataProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("provides tender data to consumers after fetch", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTenders),
    });

    render(
      <TenderDataProvider>
        <TestConsumer />
      </TenderDataProvider>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("2");
    });

    expect(screen.getByTestId("authorities")).toHaveTextContent("2");
    expect(screen.getByTestId("winner-count")).toHaveTextContent("1");
  });

  it("handles fetch errors gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(
      <TenderDataProvider>
        <TestConsumer />
      </TenderDataProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });
});
