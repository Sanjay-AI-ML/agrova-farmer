# Agrova Farmer

[Open the farmer app](https://sanjay-ai-ml.github.io/agrova-farmer/) · [Explore the separate 3D rover twin](https://sanjay-ai-ml.github.io/agrova/)

An installable, mobile-first farmer workspace for the Agrova agricultural rover, maintained by **Sanjay R (@Sanjay-AI-ML)**. The frontend uses HTML, CSS and dependency-free browser JavaScript.

## Features

- Stitch-inspired green dashboard with field-zone moisture cards, rover battery, solar assistance, onboard water and camera-quality indicators.
- Tamil, Hindi and English interface with 78 bundled voice clips; tap to listen, replay or stop.
- Saved voice-message inbox. Listening, reviewing a field observation and performing a treatment are deliberately separate actions.
- Interactive illustrative field map and safe rover simulation.
- Offline app shell, locally stored observations and language preferences after the first successful online load.
- Validated JSON import/export and an optional **read-only** farm-hub telemetry connection.
- Optional permission-based phone notifications and a connection contract for an external Web Push server.

## Run locally

Serve the `dist` directory over HTTP, rather than opening the HTML file directly:

```sh
python -m http.server 8770 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:8770/`. No package installation or frontend build is needed. For tests, install Node.js 22 or newer and run:

```sh
npm test
```

The 39 tests cover simulation interlocks, telemetry validation, voice-message state, translated dashboard rendering, HTML escaping and offline asset inclusion. Physical hardware and real-phone notification delivery are not established by these tests.

## Deployment

GitHub Actions runs the tests and deploys only `dist/` to GitHub Pages whenever `main` changes. The app uses relative asset paths and hash navigation, so it runs under `/agrova-farmer/` without a custom domain. No runtime API key or GitHub secret is needed by this static app. The deployment workflow uses the repository-scoped GitHub token, with Pages permissions limited to the deployment job.

This is a **public frontend demo**. It does not include a backend, server authentication, a farm database, private project documents, Sites hosting metadata or hardware command credentials. Do not commit real farmer data, hub tokens or environment files. Local data from another deployment does not migrate automatically; export/import a telemetry snapshot if needed.

## Important limits

The default readings and rover operations are explicitly simulated. The frontend does not run crop-detection AI, autonomous navigation or physical spray/motor commands. Imported and live observations remain read-only. The sample six-zone map is not surveyed GPS geometry, and simulated progress does not prove one-hectare coverage.

The voice guide uses bundled recordings and rule-based guidance, not a generative voice chatbot. A browser cannot reliably speak while a phone is locked or the app is closed. Closed-app notifications need a separately deployed, authenticated Web Push service; none is included. A public demo does not replace farm-account authorization in a real hub.

Sensor calibration, agronomic recommendations, native-speaker review, usability testing with farmers and real-device trials are required before field deployment. Microbial-fuel-cell sensing remains a research concept; electrode voltage alone is not a validated soil-health measure. Solar is assistance to grid-primary charging, not a continuous-power guarantee.

## Attribution and rights

The selected visual reference and decorative farmland asset came from the project owner's [Google Stitch project](https://stitch.withgoogle.com/projects/3912107090401501267). The farm photograph is decorative, not an image or survey of a user's real field.

Lexend, Noto Sans Tamil and Noto Sans Devanagari are bundled under the SIL Open Font License. Their full copyright and license notices are retained in `dist/assets/fonts/`.

The bundled generic guidance clips use Microsoft Edge synthetic voices (ta-IN-PallaviNeural, hi-IN-SwaraNeural and en-IN-NeerjaNeural), generated using the [edge-tts project](https://github.com/rany2/edge-tts). Playback is local to the app; no farmer information is sent to a speech provider at runtime.

No general open-source license is granted for the project's original code or assets by this publication. Third-party rights and notices remain applicable.
