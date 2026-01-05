export async function getEarningsCallQuarters({
  ticker,
}: {
  ticker: string;
}): Promise<FiscalDate[]> {
  const res = await fetch(
    `https://discountingcashflows.com/company/${ticker}/transcripts/`,
    {
      method: "GET",
      headers: {
        "HX-Request": "true",
        Accept: "text/html",
      },
    }
  );

  const html = await res.text();

  if (html.includes("Page Not Found")) {
    throw new Error("Quarters Not Found");
  }

  //remove all svg tags from html, remove all text areas
  //remove all htmls tags
  const clean = html
    .replace(/<textarea[^>]*>[\s\S]*?<\/textarea>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/Download PDF|AI Insights/g, "")
    .replace(/\n\s*\n/g, "\n")
    .trim()
    .split("Select Transcript")[1]
    .split("FY 2020")[0];

  return parseFiscalDates(clean);
}

type FiscalDate = {
  year: number;
  quarter: number;
  month: string;
  day: number;
};

function parseFiscalDates(text: string): FiscalDate[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const results: FiscalDate[] = [];
  let currentYear: number | null = null;

  for (const line of lines) {
    // Match "FY 2025"
    const yearMatch = line.match(/^FY\s+(\d{4})$/);
    if (yearMatch) {
      currentYear = Number(yearMatch[1]);
      continue;
    }

    if (!currentYear) continue;

    // Match "Q4Oct 30"
    const quarterMatch = line.match(/^(Q\d)([A-Za-z]{3})\s+(\d{2})$/);
    if (!quarterMatch) continue;

    const [, quarter, month, day] = quarterMatch;

    results.push({
      year: currentYear,
      quarter: Number(quarter.replace("Q", "")),
      month,
      day: Number(day),
    });
  }

  return results;
}
