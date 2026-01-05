import * as fs from "fs";
import { openJson } from "reactive-json-file";
import { getEarningsCallMeta } from "./getEarningsCallMeta.ts";
import { getEarningsCallEvents } from "./getEarningsCallEvents.ts";
import { getEarningsCallTranscript } from "./getEarningsCallTranscript.ts";
import { getEarningsCallQuarters } from "./getEarningsCallQuarters.ts";
import { getPromptResponse } from "./getPromptResponse.ts";
import kalshiConfig from "../kalshi-config.json" with { type: "json" };
import { KalshiApi } from "../kalshi-api/index.ts";
import { delay } from "./utils.ts";

export const kalshiAPI = KalshiApi(kalshiConfig);

const earningsMetaDb = openJson<EarningsInfo[]>("./data/earningsMetaDb.json");
const eventHistoryDb = openJson<string[]>("./data/eventHistoryDb.json");

console.log("Starting Kalshi Earnings Call Bot");

async function main() {
  console.log("Searching for upcoming earnings calls...");

  const earningCallEvents = await getEarningsCallEvents({
    minVolume: 5000,
  });

  console.log(`Found ${earningCallEvents.length} upcoming earnings calls.`);
  for (const event of earningCallEvents) {
    console.log(`- ${event.event_title} (Volume: ${event.total_volume})`);
  }

  console.log("Gathering earnings call info via AI...");
  for (const event of earningCallEvents) {
    const earningsMeta = earningsMetaDb.find(
      (e) => e.eventTicker === event.event_ticker
    );

    console.log(`Getting meta for event: ${event.event_title}`);

    if (earningsMeta && earningsMeta.earningsCallDate) {
      console.log(`-> Already processed, skipping.`);
      continue;
    }

    try {
      const info = await getEarningsCallMeta(event);
      // remove any existing entry for this event ticker
      const existingIndex = earningsMetaDb.findIndex(
        (e) => e.eventTicker === event.event_ticker
      );
      if (existingIndex !== -1) {
        earningsMetaDb.splice(existingIndex, 1);
      }
      earningsMetaDb.push(info);
      console.log(
        `Retreived -> ${info.companyName} (${info.stockTicker}) will have call on ${
          info.earningsCallDate || info.error
        }`
      );
    } catch (e) {
      console.error("Error getting earnings call meta:", e);
    }

    await delay(1000);
  }

  const activeEarningsMeta = earningsMetaDb
    // Filter for earnings calls that are in the future and not already processed
    .filter((e) =>
      earningCallEvents.some((ev) => ev.event_ticker === e.eventTicker)
    )

    .sort((a, b) => {
      const dateA = a.earningsCallDate ? new Date(a.earningsCallDate) : null;
      const dateB = b.earningsCallDate ? new Date(b.earningsCallDate) : null;

      if (dateA && dateB) {
        return dateA.getTime() - dateB.getTime();
      } else if (dateA) {
        return -1;
      } else if (dateB) {
        return 1;
      } else {
        return 0;
      }
    });

  console.log("Active earnings call meta:", activeEarningsMeta);

  // Filter for earnings calls happening today
  const todaysEarningCalls = activeEarningsMeta.filter(
    (e) => e.earningsCallDate === new Date().toISOString().split("T")[0]
  );

  console.log(
    `Found ${todaysEarningCalls.length} earnings calls happening today:`
  );
  for (const call of todaysEarningCalls) {
    console.log(`- ${call.companyName} (${call.stockTicker})`);
  }

  for (const { stockTicker, eventTicker } of todaysEarningCalls) {
    eventHistoryDb.push(eventTicker || "");

    console.log(`Getting quarters for ticker: ${stockTicker}`);
    // create folder for the ticker if it doesn't exist
    const folderPath = `./data/${eventTicker}`;
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    const event = await fetch(
      `https://api.elections.kalshi.com/trade-api/v2/events/${eventTicker}`
    );

    // save to file for debugging
    const eventData = await event.json();
    fs.writeFileSync(
      `${folderPath}/${stockTicker}_event.json`,
      JSON.stringify(eventData, null, 2)
    );

    const quarters = await getEarningsCallQuarters({
      ticker: stockTicker!,
    });

    console.log(`Quarters for ${stockTicker}:`, quarters);

    if (quarters.length < 3) {
      console.log(
        `No quarters found for ticker: ${stockTicker}, skipping transcript fetch.`
      );
    }

    const transcripts = [];
    for (const quarter of quarters.slice(0, 3)) {
      console.log(
        `Getting transcript for ${stockTicker} - ${quarter.year} Q${quarter.quarter}`
      );
      try {
        const transcript = await getEarningsCallTranscript({
          ticker: stockTicker!,
          year: quarter.year,
          quarter: quarter.quarter,
        });
        transcripts.push({ quarter, transcript });
        console.log(
          `Retreived Transcript of length ${transcript.length} characters.`
        );

        fs.writeFileSync(
          `${folderPath}/${stockTicker}_${quarter.year}_Q${quarter.quarter}.txt`,
          transcript
        );
      } catch (e) {
        console.error(
          `Error fetching transcript for ${stockTicker} - ${quarter.year} Q${quarter.quarter}:`,
          e
        );
      }
      await delay(2000);
    }

    if (transcripts.length < 3) {
      console.log(
        `No transcripts found for stock ticker: ${stockTicker}, skipping further processing.`
      );
      continue;
    }

    const promptText = fs.readFileSync("./prompt.md", "utf-8");

    const fullPromptText = promptText
      .replace(
        "[PAST_TRANSCRIPTS]",
        transcripts
          .map(
            (t) =>
              `Quarter: ${t.quarter.year} Q${t.quarter.quarter}\nTranscript:\n${t.transcript}`
          )
          .join("\n\n")
      )
      .replace("[KALSHI_EVENT_JSON]", JSON.stringify(eventData, null, 2))
      .replace("[COMPANY]", stockTicker!)
      .replace("[AMOUNT_TO_SPEND]", "$10");

    // save the prompt to a file for debugging
    fs.writeFileSync(`${folderPath}/prompt.md`, fullPromptText);

    console.log(
      `Generated prompt for ${stockTicker}, length: ${fullPromptText.length} characters.`
    );

    console.log(`Getting prompt for ${stockTicker}...`);
    const orders = await getPromptResponse(
      fullPromptText,
      `${folderPath}/prompt_response.txt`
    );

    // save the response to a file for debugging

    console.log("Done processing for, Orders:", orders);

    if (!Array.isArray(orders) || orders.length === 0) {
      console.log(`No orders generated, skipping.`, orders);
      continue;
    }

    for (const order of orders) {
      if (!order.marketTicker || !order.side || !order.contractCount) {
        console.log(`Invalid order data, skipping.`, order);
        continue;
      }

      console.log(`Placing order:`, order);
      try {
        const response = await kalshiAPI.order({
          ticker: order.marketTicker,
          side: order.side as "yes" | "no",
          action: "buy",
          count: Number(order.contractCount),
          type: "market",
          [`${order.side}_price`]: 90,
        });
        console.log(`Order response for ${stockTicker}:`, response);
      } catch (e) {
        console.error(`Error placing order for ${stockTicker}:`, e);
      }
    }
  }

  console.log(
    "------Completed processing all earnings calls ",
    new Date().toISOString().split("T")[0]
  );
}

main();

setInterval(main, 1000 * 60 * 60 * 3); // Run every 3 hours
