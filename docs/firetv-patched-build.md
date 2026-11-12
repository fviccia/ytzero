# Fire TV / Android TV build with local patches

Upstream ships the TV client for tvOS, Android TV and Fire TV, but only the
tvOS path has been exercised by its author. This branch carries the fixes
needed to play video on Android-based devices, plus the server-side fixes the
same deployment depends on.

## What this branch changes

**TV app (`apps/tv`)**

- `TvNativePlayer.tsx`
  - Ignores a `playToEnd` event that arrives before playback actually started
    (Android reports an empty playlist as ended), and does not run the native
    fullscreen activity on Android — the modal is already full screen.
  - Keeps the "preparing playback" panel non-focusable for the first 450 ms on
    Android so the key release that opened the player cannot activate
    **Details** and close it.
- `playbackBuffer.ts`
  - Accepts a source whose initial duration is not yet known: it waits for
    `readyToPlay` and reads the duration then, instead of failing with
    "Invalid playback duration".
- `screens/FeedScreen.tsx`
  - Hides the scheduled-videos carousel on the TV home screen.
- `patches/expo-video@57.0.3.patch`
  - `VideoPlayer.kt`: never emit `PlayedToEnd` for a player without a committed
    source; emit `sourceLoad` once the duration is valid.
  - `VideoView.kt`: focus highlight for the native transport controls (accent
    fill + scale for buttons, nothing for the time bar), a 35% scrim only while
    the controls are visible, `hideControllerIfVisible()` for the Back key, and
    controller auto-hide after 4 s.
  - `DataSourceUtils.kt`: OkHttp timeouts of 15 s connect / 30 s read.
  - `expo-module.config.json`: drop the prebuilt publication so the module is
    compiled from source with these patches.

**Server (`app`)**

- `videoCompletion.ts`: marking a partially watched video as watched also
  aligns the saved position with the duration, so it leaves Continue watching
  (upstream issue #243).
- `downloadConfig.ts`: `yt-dlp` runs with `youtube:player_client=default,-tv_samsung`
  because the `tv_samsung` client returns URLs that answer 403 for videos with
  ad breaks, which broke direct HLS playback.

## Build the APK

```sh
cd apps/tv
bun install                      # applies the expo-video patch
bunx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease \
  -x lintVitalRelease -x lintVitalAnalyzeRelease -x lintVitalReportRelease \
  -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
```

The APK is written to `apps/tv/android/app/build/outputs/apk/release/app-release.apk`.
`lintVitalRelease` is skipped because upstream ships iOS-only translations that
trip `ExtraTranslation`.

Pushing a `v*` tag runs `.github/workflows/android-apk.yml`, which builds the
same APK and attaches it to the GitHub release.

## Deploy the server image

```sh
docker build -f Dockerfile.patched -t <registry>/franco/ytzero:patched .
docker push <registry>/franco/ytzero:patched
```

Point the `ytzero` compose stack at that image so the patches survive upstream
image updates.
