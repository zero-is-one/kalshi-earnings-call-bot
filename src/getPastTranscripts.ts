import { getEarningsCallTranscript } from "./getEarningsCallTranscript.ts";
import { getEarningsCallQuarters } from "./getEarningsCallQuarters.ts";
import { delay } from "./utils.ts";

export const getPastTranscripts = async (
  stockTicker: string,
  count: number = 3,
) => {
  const quarters = await getEarningsCallQuarters({
    ticker: stockTicker!,
  });

  console.log(`Quarters for ${stockTicker}:`, quarters);

  if (quarters.length < count) {
    console.log(
      `No quarters found for ticker: ${stockTicker}, skipping transcript fetch.`,
    );
  }

  const transcripts = [];
  for (const quarter of quarters.slice(0, count)) {
    console.log(
      `Getting transcript for ${stockTicker} - ${quarter.year} Q${quarter.quarter}`,
    );
    try {
      const transcript = await getEarningsCallTranscript({
        ticker: stockTicker!,
        year: quarter.year,
        quarter: quarter.quarter,
      });
      transcripts.push({ quarter, transcript });
      console.log(
        `Retreived Transcript of length ${transcript.length} characters.`,
      );
    } catch (e) {
      console.error(
        `Error fetching transcript for ${stockTicker} - ${quarter.year} Q${quarter.quarter}:`,
        e,
      );
    }
    await delay(2000);
  }

  if (transcripts.length < count) {
    console.log(
      `No transcripts found for stock ticker: ${stockTicker}, skipping further processing.`,
    );

    throw new Error(
      `Not enough transcripts found for stock ticker: ${stockTicker}`,
    );
  }

  return transcripts;
};
