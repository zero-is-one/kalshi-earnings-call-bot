### 🧩 Step 1 — Kalshi Event JSON

You are analyzing a Kalshi earnings-call event.

Below is the JSON for the event group. Parse markets with:

- Market ID or name
- YES price
- NO price (1 - YES)
- Liquidity if available

**Input JSON:**

[KALSHI_EVENT_JSON]

### 🧾 Step 2 — Transcripts

Here is Transcript of the last 3 earnings call for **[COMPANY]**.

[PAST_TRANSCRIPTS]

### 🧾 Step 3 — Analysis

Now generate the complete “Earnings Call Kalshi Mispricing Analysis Report”  
based on all prior data and transcripts.

Markets are pricing semantic relevance instead of actual vocabulary usage. The goal is that the markets are dramatically overpricing trendy corporate buzzwords while underpricing core business terminology. This creates arbitrage opportunities for disciplined traders. Bet on what companies actually say, not what makes conceptual sense. The fundamental advantage comes from tedious research arbitrage: Most traders don’t read transcripts: They bet on intuition and to them buzzwords feel important. The edge is boring statistical work beats exciting speculation.

Output the report in this format:

---

## 🧾 [COMPANY] Earnings Call Kalshi Mispricing Analysis

### 1. Overview

Brief summary of event context, pricing patterns, and data sources (3 transcripts).

---

### 2. Market Summary

Table:
| Word | YES Price | Historical Appearance Rate | Empirical Edge (Δ%) | Bias Direction | Verdict |
Explain if each word is **overpriced (NO bias)** or **underpriced (YES bias)**.

---

### 3. Word-Level Findings

For each word:

- **Observed frequency trend** (up, down, stable)
- **Historical context snippet** (1–2 examples)
- **Market interpretation**
- **Mispricing explanation**
- **Verdict**: ✅ Buy YES / ❌ Buy NO / ⚪ Pass

---

### 4. Tiered Opportunity Map

| Tier   | Mispricing Range | Representative Words | Recommended Action        |
| ------ | ---------------- | -------------------- | ------------------------- |
| Tier 1 | >40%             | [words]              | High-conviction positions |
| Tier 2 | 20–40%           | [words]              | Selective trades          |
| Tier 3 | 10–20%           | [words]              | Watchlist only            |

---

### 5. Structural Observations

Identify systematic biases, such as:

- Vocabulary normalization lag
- Thematic repetition
- Market anchoring to recent inflation mentions
- Overreaction to buzzwords or policy language

---

### 6. Position Sizing Strategy

Suggest portfolio weighting using proportional expected edge or Kelly approximation.

---

### 7. Meta-Pattern Summary

One paragraph summarizing macro-level linguistic or thematic behavior in this company’s calls.

---

### 8. Expected Portfolio Return (Estimate)

Compute a rough expected edge-weighted return based on identified pricing gaps.

### 9. Overview

Given that we only have [AMOUNT_TO_SPEND]. What should bets should we place for on Kalshi. If all options are poor then not betting is an option as well.

### 10. --JSON--

Same as section 9 but it should be valid json, if no good options an empty array is acceptable.Should follow the format of:

```json
[
  {
    word: (word for this market item).
    eventTicker: (ticker of the event of the word),
    marketTicker: (ticker of the market of the word),
    side: (yes or no),
    contractCount: (number of contracts that should be bought)
  },

(repeat for all markets in the events)....

]
```
