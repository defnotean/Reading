# Mobile QA

Use this checklist for every internal Android build and for the first iOS build when macOS/Xcode is available.

## Device Matrix

- Android emulator, phone-size profile
- Android physical phone when available
- Android tablet when available
- Future iOS simulator on macOS when available
- Future iOS physical device when signing is available

## Launch

- App opens without a blank screen.
- Bottom navigation is visible.
- Desktop titlebar controls are not visible.
- Desktop left rail is not visible.
- Safe-area padding keeps controls above system navigation.
- On Android tablet or landscape widths, bottom navigation remains visible and desktop titlebar/rail remain hidden.

## Browse And Search

- MangaDex trending loads.
- ComicK trending loads.
- NovelFire trending loads.
- Search returns results for a known title.
- Generic URL paste returns a reader route for a supported manga or novel page.

## Reader

- Manga paginated reader advances by tap.
- Manga paginated reader advances by swipe.
- Manga continuous reader scrolls smoothly.
- Novel paginated reader fits text without horizontal overflow.
- Novel continuous reader keeps readable margins.
- Reader settings remain reachable and do not overflow.
- After reader chrome auto-hides, tap or touch restores the controls.
- Touch/coarse-pointer devices never hide the cursor as a desktop hover affordance.

## Library And Persistence

- Star a title.
- Restart the app.
- Starred title remains in Library.
- Open a chapter and change progress.
- Restart the app.
- Continue Reading points at the last opened title.

## Platform Behavior

- External URL opener launches the default browser when an external chapter URL is available.
- Rotate portrait to landscape and back.
- Background the app, wait ten seconds, resume it.
- Clear cache in Settings and confirm app remains responsive.
