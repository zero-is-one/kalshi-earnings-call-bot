export async function getEarningsCallTranscript({
  year,
  quarter,
  ticker,
}: {
  year: number;
  quarter: number;
  ticker: string;
}): Promise<string> {
  const res = await fetch(
    `https://discountingcashflows.com/company/${ticker}/transcripts/${year}/${quarter}/?org.htmx.cache-buster=transcriptsContent`,
    {
      method: "GET",
      headers: {
        "HX-Request": "true",
        Accept: "text/html",
      },
    }
  );

  const html = await res.text();
  //remove all svg tags from html, remove all text areas
  //remove all htmls tags
  const clean = html
    .replace(/<textarea[^>]*>[\s\S]*?<\/textarea>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/Download PDF|AI Insights/g, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  return clean;
}
