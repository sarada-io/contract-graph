import fs from "node:fs";
import path from "node:path";
import { intentAction, intentFile } from "../../src/scripts/intent.js";

export const fixtureIntent = `# Fixture project intent

## Purpose and audience
Provide reusable export formatting for operators of several independent applications.

## Boundaries
Own format conversion. Application-specific names and permissions stay in callers.

## Variation
Accept arbitrary caller-defined field names through the documented mapping input.

## Acceptance example
Two applications with different domain fields export their own rows without engine special cases.

## Open questions
None

## Binding sources
None
`;

/** Explicit synthetic owner evidence for fixtures that exercise post-adoption delivery. */
export function approveFixtureIntent(root) {
  const file = path.join(root, intentFile(root));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, fixtureIntent);
  const { snapshot } = intentAction(root, "review");
  const evidence = path.join(root, ".fixture-intent-approval.json");
  fs.writeFileSync(evidence, JSON.stringify({ by: "Synthetic fixture owner", response: "I approve this fixture's reusable export purpose.", scope: "repository", snapshot }));
  try { return intentAction(root, "approve", { evidence }); }
  finally { fs.rmSync(evidence); }
}
