# Mermaid starting examples

These examples describe hypothetical software. They are syntax and composition examples, not
claims about the adopting repository. Replace the names, relationships, and caption with facts
from the selected contracts. Load only the example matching the reader's question.

The palette is optional and uses Mermaid's base theme without CSS overrides. The examples use
configuration frontmatter; check support in the destination renderer. If configuration is stripped,
use the host theme and retain the status words and relationship labels. Flowcharts use SVG text
labels to avoid dependence on HTML label styling. Keep only the classes used in the final diagram.

## Contract ownership overview

Example: a repository delegates refunds through a billing module to its refund component.
The arrows describe ownership and implementation, not the order of a refund request.

```mermaid
---
config:
  theme: base
  fontFamily: 'Verdana, sans-serif'
  flowchart:
    htmlLabels: false
    subGraphTitleMargin:
      top: 8
      bottom: 20
  themeVariables:
    fontFamily: 'Verdana, sans-serif'
    primaryColor: '#EAF3EF'
    primaryTextColor: '#24313F'
    primaryBorderColor: '#31685D'
    lineColor: '#64717D'
    edgeLabelBackground: '#FCFBF8'
    clusterBkg: '#F5F3ED'
    clusterBorder: '#B7B6AE'
---
flowchart TB
  accTitle: Example refund ownership
  accDescr: Read from the repository contract into the billing module, then its refund component and implementation. Arrows show decomposition rather than runtime calls.

  Root["Repository contract"]:::support
  subgraph Billing["Billing module"]
    direction TB
    Module["Billing contract"]:::boundary
    Refund["Refund component contract"]:::boundary
    Code["Refund implementation"]:::support
    Module -->|owns refunds| Refund
    Refund -->|implemented by| Code
  end
  Root -->|owns billing| Billing

  classDef boundary fill:#EAF3EF,stroke:#31685D,stroke-width:1.5px,color:#24313F
  classDef support fill:#F5F3ED,stroke:#64717D,stroke-width:1px,color:#24313F
```

The refund component is the narrower starting point for a refund change. Its parent explains
where that responsibility fits; source inspection establishes how the promise is implemented.

## Current responsibility and proposed extraction

Example proposal: a report worker currently formats and saves reports. A proposed formatter
would own formatting, leaving persistence with the worker. Dashed arrows describe the proposal.

```mermaid
---
config:
  theme: base
  fontFamily: 'Verdana, sans-serif'
  flowchart:
    htmlLabels: false
  themeVariables:
    fontFamily: 'Verdana, sans-serif'
    primaryColor: '#F5F3ED'
    primaryTextColor: '#24313F'
    primaryBorderColor: '#64717D'
    lineColor: '#64717D'
    edgeLabelBackground: '#FCFBF8'
---
flowchart TB
  accTitle: Example proposed formatter extraction
  accDescr: The current report worker writes the report file. A proposed dashed relationship would delegate formatting to a new formatter; the worker would retain responsibility for saving the result.

  Worker["Current report worker"]:::current
  Report["Current report file"]:::support
  Formatter["Proposed formatter"]:::proposed
  Worker -->|writes report| Report
  Worker -.->|format request| Formatter

  classDef current fill:#EAF3EF,stroke:#31685D,stroke-width:1.5px,color:#24313F
  classDef support fill:#F5F3ED,stroke:#64717D,stroke-width:1px,color:#24313F
  classDef proposed fill:#FBF0DA,stroke:#92652B,stroke-width:1.5px,stroke-dasharray:5 3,color:#24313F
```

The formatter is a proposed responsibility boundary. This illustration does not establish that
the extraction is implemented, accepted, or verified.

## One operation across public surfaces

Example interaction: a caller requests a refund; the refund service checks its policy and asks
the payment provider to reverse the charge. Include only the failure cases relevant to the contract.

```mermaid
---
config:
  theme: base
  fontFamily: 'Verdana, sans-serif'
  themeVariables:
    actorBkg: '#EAF3EF'
    actorBorder: '#31685D'
    actorTextColor: '#24313F'
    signalColor: '#64717D'
    signalTextColor: '#24313F'
    labelBoxBkgColor: '#F5F3ED'
    labelBoxBorderColor: '#64717D'
    labelTextColor: '#24313F'
    loopTextColor: '#24313F'
---
sequenceDiagram
  accTitle: Example refund request
  accDescr: The caller asks the refund service for a refund. The service checks policy and either requests a reversal from the provider or returns the rejection reason.

  participant Caller
  participant Refund as Refund service
  participant Policy as Refund policy
  participant Provider as Payment provider
  Caller->>Refund: Request refund
  Refund->>Policy: Check refund eligibility
  Policy-->>Refund: Eligibility result
  alt Eligible
    Refund->>Provider: Reverse charge
    Provider-->>Refund: Reversal result
    Refund-->>Caller: Refund result
  else Ineligible
    Refund-->>Caller: Rejection reason
  end
```

The refund service coordinates the operation through named public surfaces. The policy owns
eligibility; the provider performs the reversal. This sequence does not itself prove either
component's behavior or error handling.
