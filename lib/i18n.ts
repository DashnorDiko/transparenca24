export type Locale = "sq" | "en";

export type TranslationKeys = {
  searchPlaceholder: string;
  heroTitle: string;
  heroSubtitle: string;
  openDashboard: string;
  viewTenders: string;
  totalTenders: string;
  totalTendersSubtitle: string;
  uniqueAuthorities: string;
  uniqueAuthoritiesSubtitle: string;
  withWinner: string;
  withWinnerSubtitle: string;
  recentTenders: string;
  recentTendersSubtitle: string;
  topAuthorities: string;
  topAuthoritiesSubtitle: string;
  exploreAll: string;
  dashboard: string;
  dashboardSubtitle: string;
  filters: string;
  category: string;
  all: string;
  tendersByCategory: string;
  tendersByCategorySubtitle: string;
  topAuthoritiesChart: string;
  topAuthoritiesChartSubtitle: string;
  statusDistribution: string;
  statusDistributionSubtitle: string;
  tenderSummary: string;
  close: string;
  institution: string;
  amount: string;
  date: string;
  status: string;
  actions: string;
  tenders: string;
  tendersSubtitle: string;
  tendersSearch: string;
  tenderAuthority: string;
  tenderContractor: string;
  tenderValue: string;
  tenderProcedure: string;
  tenderViewDetail: string;
  tendersDataSource: string;
  tendersTotal: string;
  tendersWithWinner: string;
  tendersTotalValue: string;
  navTenders: string;
  navDashboard: string;
  navAuthorities: string;
  authorities: string;
  authoritiesSubtitle: string;
  authTenderCount: string;
  authTotalValue: string;
  authViewTenders: string;
  footer: string;
  loading: string;
  noData: string;
};

export const t: Record<Locale, TranslationKeys> = {
  sq: {
    searchPlaceholder: "Kërko tendera, autoritete...",
    heroTitle: "Transparencë në Prokurimet Publike",
    heroSubtitle:
      "Të dhëna reale nga Open Procurement Albania. Shikoni tendera, autoritete prokurues dhe analiza buxhetore për çdo qytetar.",
    openDashboard: "Hap Analizat",
    viewTenders: "Shiko Tenderat",
    totalTenders: "Gjithsej Tendera",
    totalTendersSubtitle: "Të dhëna reale nga openprocurement.al",
    uniqueAuthorities: "Autoritete Prokurues",
    uniqueAuthoritiesSubtitle: "Institucione të ndryshme",
    withWinner: "Me Fitues",
    withWinnerSubtitle: "Tendera me kontratë të lidhur",
    recentTenders: "Tenderat e Fundit",
    recentTendersSubtitle: "Tendera të reja nga portali i prokurimit",
    topAuthorities: "Autoritetet Kryesore",
    topAuthoritiesSubtitle: "Sipas numrit të tenderave",
    exploreAll: "Shiko të gjitha",
    dashboard: "Analiza",
    dashboardSubtitle: "Analizo tenderat publike sipas kategorisë, statusit dhe autoritetit",
    filters: "Filtra",
    category: "Kategoria",
    all: "Të gjitha",
    tendersByCategory: "Tendera sipas kategorisë",
    tendersByCategorySubtitle: "Numri i tenderave për çdo kategori",
    topAuthoritiesChart: "Top 10 autoritete",
    topAuthoritiesChartSubtitle: "Autoritetet me më shumë tendera",
    statusDistribution: "Shpërndarja sipas statusit",
    statusDistributionSubtitle: "Sa tendera janë në çdo status",
    tenderSummary: "Përmbledhje e tenderave",
    close: "Mbyll",
    institution: "Titulli",
    amount: "Vlera",
    date: "Data",
    status: "Statusi",
    actions: "Veprime",
    tenders: "Tendera Publike",
    tendersSubtitle: "Të dhëna reale nga Open Procurement Albania (openprocurement.al)",
    tendersSearch: "Kërko tendera...",
    tenderAuthority: "Autoriteti Prokurues",
    tenderContractor: "Operatori Ekonomik",
    tenderValue: "Vlera e Fondit",
    tenderProcedure: "Lloji i Procedurës",
    tenderViewDetail: "Shiko në portal",
    tendersDataSource: "Burimi i të dhënave: Open Procurement Albania",
    tendersTotal: "Gjithsej tendera",
    tendersWithWinner: "Me fitues",
    tendersTotalValue: "Vlera totale",
    navTenders: "Tendera",
    navDashboard: "Analiza",
    navAuthorities: "Autoritetet",
    authorities: "Autoritetet Prokurues",
    authoritiesSubtitle: "Tendera të grupuara sipas autoritetit prokurues",
    authTenderCount: "tendera",
    authTotalValue: "Vlera totale",
    authViewTenders: "Shiko tenderat",
    footer: "Të dhëna nga Open Procurement Albania. Platformë transparence nga LLogaria AL.",
    loading: "Duke ngarkuar...",
    noData: "Nuk ka të dhëna.",
  },
  en: {
    searchPlaceholder: "Search tenders, authorities...",
    heroTitle: "Public Procurement Transparency",
    heroSubtitle:
      "Real data from Open Procurement Albania. Browse tenders, procuring authorities and budget analytics for every citizen.",
    openDashboard: "Open Analytics",
    viewTenders: "View Tenders",
    totalTenders: "Total Tenders",
    totalTendersSubtitle: "Real data from openprocurement.al",
    uniqueAuthorities: "Procuring Authorities",
    uniqueAuthoritiesSubtitle: "Distinct institutions",
    withWinner: "With Winner",
    withWinnerSubtitle: "Tenders with signed contract",
    recentTenders: "Recent Tenders",
    recentTendersSubtitle: "Latest tenders from the procurement portal",
    topAuthorities: "Top Authorities",
    topAuthoritiesSubtitle: "By number of tenders",
    exploreAll: "Explore all",
    dashboard: "Analytics",
    dashboardSubtitle: "Analyse public tenders by category, status and authority",
    filters: "Filters",
    category: "Category",
    all: "All",
    tendersByCategory: "Tenders by category",
    tendersByCategorySubtitle: "Number of tenders per category",
    topAuthoritiesChart: "Top 10 authorities",
    topAuthoritiesChartSubtitle: "Authorities with the most tenders",
    statusDistribution: "Status distribution",
    statusDistributionSubtitle: "How many tenders are in each status",
    tenderSummary: "Tender summary",
    close: "Close",
    institution: "Title",
    amount: "Value",
    date: "Date",
    status: "Status",
    actions: "Actions",
    tenders: "Public Tenders",
    tendersSubtitle: "Real data from Open Procurement Albania (openprocurement.al)",
    tendersSearch: "Search tenders...",
    tenderAuthority: "Procuring Authority",
    tenderContractor: "Economic Operator",
    tenderValue: "Fund Value",
    tenderProcedure: "Procedure Type",
    tenderViewDetail: "View on portal",
    tendersDataSource: "Data source: Open Procurement Albania",
    tendersTotal: "Total tenders",
    tendersWithWinner: "With winner",
    tendersTotalValue: "Total value",
    navTenders: "Tenders",
    navDashboard: "Analytics",
    navAuthorities: "Authorities",
    authorities: "Procuring Authorities",
    authoritiesSubtitle: "Tenders grouped by procuring authority",
    authTenderCount: "tenders",
    authTotalValue: "Total value",
    authViewTenders: "View tenders",
    footer: "Data from Open Procurement Albania. Transparency platform by LLogaria AL.",
    loading: "Loading...",
    noData: "No data available.",
  },
};
