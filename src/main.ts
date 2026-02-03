import * as fs from "fs";
import { getEarningsCallMeta } from "./getEarningsCallMeta.ts";
import { getEarningsCallEvents } from "./getEarningsCallEvents.ts";
import kalshiConfig from "../kalshi-config.json" with { type: "json" };
import { KalshiApi } from "../kalshi-api/index.ts";
import { delay } from "./utils.ts";
import type { EarningsInfo } from "./types.ts";
import { getPastTranscripts } from "./getPastTranscripts.ts";
import { getPromptResponse } from "./getPromptResponse.ts";
import type { PromptResponse } from "./getPromptResponse.ts";
// billing: https://console.cloud.google.com/billing/0172C5-246326-580681

export const kalshiAPI = KalshiApi(kalshiConfig);

console.log("Starting Kalshi Earnings Call Bot Started. v2");

const pastProcessedEventTickers: string[] = [
  "kxearningsmentiongoogl-26jun30",
  "kxearningsmentionea-25oct28",
];

async function main() {
  console.log("Searching for upcoming earnings calls...");

  const earningCallEvents = await getEarningsCallEvents({
    minVolume: 5000,
  });

  console.log(`Found ${earningCallEvents.length} upcoming earnings calls.`);
  for (const event of earningCallEvents) {
    console.log(`- ${event.event_title} (Volume: ${event.total_volume})`);
  }

  for (const event of earningCallEvents) {
    console.log(`Processing event: ${event.event_title}`);

    if (pastProcessedEventTickers.includes(event.event_ticker.toLowerCase())) {
      console.log(
        `Skipping event ${event.event_title} as it has been processed before.`,
      );
      continue;
    }

    if (event.total_volume < 10000) {
      console.log(
        `Skipping event ${event.event_title} due to low volume (${event.total_volume}).`,
      );
      continue;
    }

    const eventDir = `data/${event.event_ticker}`;

    if (!fs.existsSync(eventDir)) {
      fs.mkdirSync(eventDir, { recursive: true });
    }

    fs.writeFileSync(`${eventDir}/event.json`, JSON.stringify(event, null, 2));

    const metaPath = `${eventDir}/meta.json`;
    let meta: EarningsInfo | undefined;

    if (!fs.existsSync(metaPath)) {
      console.log(`Fetching metadata for event: ${event.event_title}`);
      meta = await getEarningsCallMeta(event);
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      await delay(1000);
    } else {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as EarningsInfo;
    }

    if (!meta) {
      console.log(
        `Skipping event ${event.event_title} due to missing metadata.`,
      );
      continue;
    }

    if (meta?.error) {
      console.log(
        `Skipping event ${event.event_title} due to metadata error: ${meta.error}`,
      );
      continue;
    }

    if (!meta.earningsCallDate) {
      console.log(
        `Skipping event ${event.event_title} due to missing meta or earnings call date.`,
      );
      continue;
    }

    // Skip if not one day before meta.earningsCallDate (date is string in format YYYY-MM-DD)
    const [year, month, day] = meta.earningsCallDate.split("-").map(Number);
    const earningsCallDate = new Date(year, month - 1, day);
    const oneDayBeforeEarningsCall = new Date(earningsCallDate);
    oneDayBeforeEarningsCall.setDate(earningsCallDate.getDate() - 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today.getTime() !== oneDayBeforeEarningsCall.getTime()) {
      console.log(
        `Skipping event ${event.event_title} as today is not one day before the earnings call date (${meta.earningsCallDate}).`,
      );
      continue;
    }

    pastProcessedEventTickers.push(event.event_ticker.toLowerCase());

    console.log(`Fetching past transcripts for ${meta.stockTicker}...`);

    const transcripts = await getPastTranscripts(meta.stockTicker!);

    fs.writeFileSync(
      `${eventDir}/transcripts.json`,
      JSON.stringify(transcripts, null, 2),
    );

    const promptTemplate = fs.readFileSync("./prompt.md", "utf-8");

    const promptText = promptTemplate
      .replace("{{BUDGET_AMOUNT}}", "$4.00")
      .replace("{{COMPANY_NAME}}", meta.companyName || "Unknown Company")
      .replace("{{STOCK_TICKER}}", meta.stockTicker || "UNKNOWN")
      .replace("{{TRANSCRIPT_JSON}}", JSON.stringify(transcripts, null, 2))
      .replace("{{EVENT_JSON}}", JSON.stringify(event, null, 2));

    console.log(`Generating prompt response for event: ${event.event_title}`);

    fs.writeFileSync(`${eventDir}/prompt.md`, promptText);

    // get 3 response from getPromptResponse

    const responses: PromptResponse[] = [];

    while (responses.length < 4) {
      const i = responses.length;
      console.log(`Getting response ${i + 1} for event: ${event.event_title}`);
      const response = await getPromptResponse(promptText);

      if ("error" in response) {
        console.log(
          `Error getting prompt response for event ${event.event_title}: ${response.error}`,
        );
        continue;
      }

      responses.push(response);
      fs.writeFileSync(
        `${eventDir}/response${i}.json`,
        JSON.stringify(response, null, 2),
      );
    }

    // average each word in responses' orders by market_id

    const aggregatedOrders: Record<
      string,
      {
        market_id: string;
        word: string;
        contract_count: number;
        estimated_cost: number;
        reasoning: string;
      }
    > = {};

    for (const response of responses) {
      for (const order of response.orders) {
        if (!aggregatedOrders[order.market_id]) {
          aggregatedOrders[order.market_id] = {
            market_id: order.market_id,
            word: order.word,
            contract_count: 0,
            estimated_cost: 0,
            reasoning: "",
          };
        }
        aggregatedOrders[order.market_id].contract_count +=
          order.contract_count;
        aggregatedOrders[order.market_id].estimated_cost +=
          order.estimated_cost;
        aggregatedOrders[order.market_id].reasoning += order.reasoning + "; ";
      }
    }

    // divide contract_count and estimated_cost by number of responses to get average
    const numResponses = responses.length;
    for (const market_id in aggregatedOrders) {
      aggregatedOrders[market_id].contract_count = Math.round(
        aggregatedOrders[market_id].contract_count / numResponses,
      );
      aggregatedOrders[market_id].estimated_cost =
        aggregatedOrders[market_id].estimated_cost / numResponses;
    }
    fs.writeFileSync(
      `${eventDir}/aggregated_orders.json`,
      JSON.stringify(Object.values(aggregatedOrders), null, 2),
    );

    for (const order of Object.values(aggregatedOrders)) {
      if (order.contract_count <= 1) {
        console.log(
          `Skipping order for market ${order.market_id} due to low contract count (${order.contract_count}).`,
        );
        continue;
      }

      if (order.contract_count >= 25) {
        console.log(
          `Skipping order for market ${order.market_id} due to high contract count (${order.contract_count}).`,
        );
        continue;
      }

      console.log(`Placing order:`, order);
      const side = "yes";
      try {
        const response = await kalshiAPI.order({
          ticker: order.market_id,
          side: side as "yes" | "no",
          action: "buy",
          count: Number(order.contract_count),
          type: "market",
          [`${side}_price`]: 95,
        });
        console.log(`Order response for ${order.market_id}:`, response);
      } catch (e) {
        console.error(`Error placing order for ${order.market_id}:`, e);
      }
    }

    console.log(`Finished processing event: ${event.event_title}`);
  }

  console.log(`Last run at: ${new Date().toISOString()}`);
  console.log("----------------------------------------------------");
}

setInterval(
  () => {
    try {
      main();
    } catch (e) {
      console.error("Error in scheduled main execution:", e);
    }
  },
  1000 * 60 * 60,
); // Run every 6 hours
main();
