# 11 Block and Report

**Status:** Dropped
**Date:** October 30, 2026
**Traces to:** PRD v2.8, US-2.3 (block part) and US-2.4, module 11

No code was built for this module. This document records the decision and the risk it leaves.

## Goal

Module 11 was meant to let a recipient block the sender of a drop and report a drop to Drop's moderators.

## What Was Built

Nothing. The plan was written and discussed, then the team decided not to build either feature.

## Decisions & Trade-offs

- **Why it was dropped.** Senders have no account, so a block can only follow a device or a network, and both are easy to get around. A report only helps if someone reads it or a rule acts on it, and nobody on the team will review reports. A button that promises action and never delivers it was judged worse than no button.
- **Blocking by network was a problem anyway.** Many students share one campus or dorm network. Blocking one sender by network would silently stop everyone on that network from sending to the recipient, without anyone knowing.
- **Sender accounts were considered.** Requiring senders to sign in, with their identity hidden from the recipient but known to Drop, would make blocks reliable. It was not chosen: signing up inside social app browsers loses most senders, and Drop knowing who sent each drop would change the promise that nobody can find out.
- **A lighter option was considered.** A report that keeps evidence and automatically stops a device after several recipients report it would act without a moderator. It is noted as a fallback if the risk below has to be closed.
- **What stays.** Recipients can delete any drop now, and pause their link once settings ship. The hidden sender and device codes stay, because the sending limits use them.

## Security Pass

No code changed, so no control was added or weakened. The decision removes two planned safety controls; the gap is recorded below and in the PRD's open questions.

## Verification

The PRD was updated to version 2.8: the block and report stories, tables, endpoints, the block step in sending and the moderator queue are removed, and the risk is listed as an open question to settle before launch.

## Open Items

- **Must settle before launch.** With anonymous senders, an all-ages audience and no automatic content check yet, a targeted recipient cannot stop a sender, and Drop has no way to learn of threats or child abuse material in drops. Review with the team and a lawyer before launch.
- The automatic text and photo check is now the main safeguard and should be built before launch.
- Pausing a link (module 13) is the recipient's only off switch.
