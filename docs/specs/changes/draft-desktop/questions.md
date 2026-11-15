# Questions — draft-desktop

What only the person who owns the studio can decide. Q1 is the brief's own
question; Q2 and Q3 come from drafting it. All three are answered: the
installers ship unsigned now and gain signing when the owner's accounts exist.

| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | Which code-signing certificates do we have for macOS and Windows? | REQ-153, REQ-154, REQ-156 | macOS: an Apple Developer Program membership (individual or organization) with a Developer ID Application certificate, and an App Store Connect API key for notarization · none yet: ship unsigned, with the "Open anyway" steps, until it exists. Windows: Azure Trusted Signing (cloud, monthly fee, eligibility rules) · an OV or EV certificate on a cloud HSM (SSL.com eSigner, DigiCert KeyLocker) or a hardware token · none yet: ship unsigned, with the SmartScreen "Run anyway" steps | Unsigned for now, with documented "Open anyway" (macOS) and SmartScreen (Windows) steps. Signing is added when the accounts exist: unsigned installers now, signed when certificates exist, and the same pipeline gains the signing step. | reviewed |
| Q2 | In whose name are the installers signed — the publisher macOS and Windows show? | REQ-153, REQ-154 | The organization rsaglobaltech (needs the organization's verification: D-U-N-S for Apple, business validation for Windows) · The owner's own name, as an individual developer · The organization on macOS and Windows later, the owner's name until then | The owner's own name now; the organization rsaglobaltech later. | reviewed |
| Q3 | How does an update reach the person? | REQ-156 | Offered on start, installed when accepted, applied on the next restart · Downloaded in the background and installed when the studio quits, with a notice · Only said, with a link to the release, and installed by hand | Offered on start and applied on restart, never during a build. | reviewed |
