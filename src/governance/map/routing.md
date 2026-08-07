# Contract Map

Task-to-contract routing. This map is the entry point into the context graph, not a complete list of
files to edit. It gives a request its first module contracts; the agent reads those contracts to
understand how the modules are used by the project, then follows their child-contract links toward
the responsible sub-module before opening source code.

**This file is a stub until you fill it in.** Add one row per module as the repository grows.

| If the task touches… | Load |
|---|---|
| <a capability, subsystem, or surface> | `<module>/.agents/cg/contract.md` |

## Loading rules

1. Start with the rows matching the request.
2. Within each selected module, follow its child contracts from broad responsibility to the
   smallest relevant sub-module.
3. Add a neighbour's contract only after cross-module impact is confirmed.
4. Stop loading contracts once the implementation boundary and constraints are clear.

Loading every contract "to be safe" is the failure this file exists to prevent.
