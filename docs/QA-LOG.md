# QA log

One block per bug. Severity: **S1** crash, data loss, wrong fasting rule or time, an allergen shown as allowed, a
review blocker. **S2** wrong behaviour with a workaround. **S3** visual or text.
S1 blocks the release. S2 is fixed or written up in the review notes. S3 is fixed if there is time.

## Template
```
### QA-NNN  S1|S2|S3  short title
- Build: 1.0.0 (N), TestFlight / dev build / Simulator
- Device: iPhone model, iOS version, text size, Reduce Motion on/off, language
- Steps:
  1.
  2.
- Expected:
- Actual:
- Evidence: screenshot or screen recording path
- Area: core | ui | db | sync | auth | ai | notif | store
- Status: open | fixing (branch) | fixed in build N | won't fix (why)
```

## Device matrix results (fill in on Fri, TESTING §8)
| check | iPhone (iOS __) | Simulator 17 Pro Max | Android smoke (model __, Android __) |
|---|---|---|---|
| fresh install, onboarding, guest | | | |
| Danas on a fast day, a Ramadan day (dev clock), a free day | | | |
| Kalendar month swipe, selected day, report | | | |
| Plan 7/30, meal plan, shopping list | | | |
| Tajmer start, kill app, notification at goal, stop | | | |
| Šta da jedem: ours, AI with consent, AI offline fallback | | | |
| Apple sign in (iOS), email OTP, sync iPhone ↔ Android | | | |
| Export JSON, delete account, Apple revoke confirmed | | | |
| Notifications: evening, sehur, iftar, IF end | | | |
| Largest Dynamic Type, VoiceOver pass, Reduce Motion | | | |
| Airplane mode: everything except AI, sync, auth | | | |
| Dark sky at night, dusk, day (dev clock) | | | |

## Bugs
