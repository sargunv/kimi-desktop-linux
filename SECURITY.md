# Security notes

This project transforms proprietary third-party binaries. It does not audit or
endorse Kimi Work, its telemetry, the scripts or plugins it downloads, or its
transitive dependencies.

Kimi Work 3.1.2 bundles `openclaw@2026.3.13`. On 2026-07-21, npm reported five
high and three critical vulnerable packages in the reconstructed gateway tree.
Some findings concern channel integrations that Kimi leaves disabled by
default, but others affect OpenClaw's gateway and execution boundaries. Run:

```sh
cd build/kimi-work/resources/resources/gateway
npm audit --omit=dev
```

Do not apply `npm audit fix --force`: it can replace compatibility-sensitive
dependencies used by Kimi's private daemon. A safe upgrade requires a newer
vendor build or explicit integration testing against a newer OpenClaw release.

The portable launcher uses Electron's `--no-sandbox` fallback because it cannot
install `chrome-sandbox` as a setuid-root helper. Prefer a distro-native package
with correctly installed sandbox permissions for higher-risk deployments.
