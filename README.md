# Garage

A client-only vehicle maintenance log. One screen lists the vehicles, the selected vehicle (service, fuel, and miles per gallon), and the maintenance that is due across the garage. Data stays in this browser under the `localStorage` key `vm.garage`.

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm run test:unit
npm run test:integration
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

## Testing

Unit and integration tests use Vitest and do not launch a browser. End-to-end tests run the same garage flows in four Playwright projects: desktop (Desktop Chrome, 1280×800), mobile (Pixel 5), firefox (Desktop Firefox), and webkit (Desktop Safari). Pull requests and the pre-release job run them. A failure blocks the `vN` release.

Limits:

- WebKit is Playwright’s build, not Safari on macOS.
- Unit and integration tests do not launch a browser.
- End-to-end hits the preview server, not a `file://` open.
- CI retries a failed end-to-end test once.

## Single-file build

```bash
npm run build
```

`dist/index.html` contains the script and styles. Open that file directly, or serve it from any static host.

## Releases

A pull request runs the unit, integration, and Playwright tests and does not publish a release. A push to `main` runs those tests, then tags the next `vN` (`v1`, `v2`, `v3`, …) and publishes a GitHub Release whose only asset is `index.html`.
