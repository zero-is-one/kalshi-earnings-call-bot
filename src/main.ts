import {
  Configuration,
  PortfolioApi,
  EventsApi,
  SeriesApi,
} from "kalshi-typescript";
import kalshiConfig from "../kalshi-config.json" with { type: "json" };
import { getEarningsCallInfo } from "./ai.ts";
import { openJson } from "reactive-json-file";
import { getSearchSeries } from "./search.ts";

const config = new Configuration(kalshiConfig);
const portfolioApi = new PortfolioApi(config);

const earningsMetaDb = openJson<EarningsInfo[]>("./earningsMetaDb.json");

console.log("Starting Kalshi Earnings Call Bot");

async function main() {
  const balance = await portfolioApi.getBalance();
  console.log(`Balance: $${(balance.data.balance || 0) / 100}`);

  const earningCallEvents = await getSearchSeries({
    minVolume: 10000,
  });

  console.log(`Found ${earningCallEvents.length} upcoming earnings calls.`);

  console.log("Gathering earnings call info via AI...");
  for (const event of earningCallEvents) {
    const earningsMeta = earningsMetaDb.find(
      (e) => e.eventTicker === event.event_ticker
    );

    console.log(`Getting meta for event: ${event.event_title}`);

    if (earningsMeta) {
      console.log(`-> Already processed, skipping.`);
      continue;
    }

    const info = await getEarningsCallInfo(event);
    earningsMetaDb.push(info);
    console.log(
      `Retreived -> ${info.companyName} : ${
        info.earningsCallDate || info.error
      }`
    );

    // to avoid rate limits
    //console.log(info);
    await delay(3000);
  }

  // console.log(
  //   db.events
  //     .sort((a, b) => {
  //       const dateA = a.earningsMeta.earningsCallDate
  //         ? new Date(a.earningsMeta.earningsCallDate).getTime()
  //         : 0;
  //       const dateB = b.earningsMeta.earningsCallDate
  //         ? new Date(b.earningsMeta.earningsCallDate).getTime()
  //         : 0;
  //       return dateA - dateB;
  //     })
  //     .map(
  //       (e) =>
  //         `${e.apiEvent.event_title} - ${e.earningsMeta.companyName} : ${e.earningsMeta.earningsCallDate || e.earningsMeta.error}`
  //     )
  //     .join("\n")
  // );
}

main();

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
