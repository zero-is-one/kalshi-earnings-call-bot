import type { SearchSeriesEventsData, SeriesEvent } from "./types.ts";

export async function getEarningsCallEvents({ minVolume = 5000 } = {}): Promise<
  SeriesEvent[]
> {
  const response = await fetch(
    [
      "https://api.elections.kalshi.com/v1/search/series",
      "?order_by=trending",
      "&status=open",
      "&category=Mentions",
      "&page_size=100",
    ].join(""),
  );
  const status = response.status;

  if (status !== 200) {
    const errorText = await response.text();
    console.error(
      `Failed to fetch trending Mentions series. Status: ${status}, Message: ${errorText}`,
    );
    throw new Error("Failed to fetch trending Mentions series");
  }

  const searchPage: SearchSeriesEventsData = await response.json();
  const { current_page: events } = searchPage;

  return (
    events
      .filter((event) =>
        event.event_title.toLowerCase().includes("earnings call"),
      )
      // extract date from event_subtitle in the format 'On Nov 26, 2025'
      .map((event) => {
        const dateMatch = event.event_subtitle.match(/On (\w+ \d{1,2}, \d{4})/);
        const date = new Date(dateMatch ? dateMatch[1] : "");
        return { ...event, date };
      })
      // filter out events with invalid dates
      .filter((event) => !isNaN(event.date.getTime()))
      // EA event is bugged, exclude it
      //.filter((event) => !event.event_title.includes("What will EA say"))
      //Filter low volume events
      .filter((event) => event.total_volume >= minVolume)
      // sort by date ascending
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  );
}
