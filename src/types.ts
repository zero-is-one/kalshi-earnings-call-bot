type SeriesEvent = {
  series_ticker: string;
  series_title: string;
  event_ticker: string;
  event_subtitle: string;
  event_title: string;
  category: string;
  product_metadata: Record<string, unknown>;
  product_metadata_derived: Record<string, unknown>;
  total_series_volume: number;
  total_volume: number;
  total_market_count: number;
  active_market_count: number;
  markets: unknown[];
  is_trending: boolean;
  is_new: boolean;
  is_closing: boolean;
  is_price_delta: boolean;
  search_score: number;
  fee_type: string;
  fee_multiplier: number;
};

type SearchSeriesEventsData = {
  total_results_count: number;
  current_page: SeriesEvent[];
  next_cursor: string;
};

type EarningsInfo = {
  companyName?: string | null;
  earningsCallDate?: string | null;
  error?: string | null;
  eventTicker?: string;
  stockTicker?: string | null;
};

type EventRecord = {
  apiEvent: SeriesEvent;
  earningsMeta: EarningsInfo;
};

type JsonDatabase = {
  events: EventRecord[];
};
