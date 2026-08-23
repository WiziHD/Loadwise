/**
 * Phase 0 payoff: run the rules over every scenario and read what comes out.
 *
 * Tests prove the rules behave as specified. This prints what a user would
 * actually be told — the only way to judge whether the output is useful
 * rather than merely correct.
 *
 * Run with: npm run demo
 */

import { buildReport } from "./report.js";

console.log(buildReport());
