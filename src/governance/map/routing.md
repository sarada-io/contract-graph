# Contract Map

Task-to-contract routing. An agent reads this to learn which module contracts a request touches,
then loads only those.

**This file is a stub until you fill it in.** Add one row per module as the repository grows.

| If the task touches… | Load |
|---|---|
| <a capability, subsystem, or surface> | `<module>/.agents/cg/contract.md` |

## Loading rules

1. Start with modules the task names explicitly.
2. Add a neighbour's contract only after cross-module impact is confirmed.
3. Stop loading once the implementation constraints are clear.

Loading every contract "to be safe" is the failure this file exists to prevent.
