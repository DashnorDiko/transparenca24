export interface ScrapedTender {
  id: string;
  title: string;
  authority: string;
  contractor: string;
  contractType: string;
  estimatedValue: number;
  winnerValue: number | null;
  status: string;
  procedureType: string;
  announcementDate: string;
  detailUrl: string;
  category: string;
}

export interface TenderDataFile {
  scrapedAt: string;
  source: string;
  totalCount: number;
  tenders: ScrapedTender[];
}
