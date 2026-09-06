import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://78dfb90d66030e1e0baad6642b996f89@o4512039961755648.ingest.us.sentry.io/4512039997800448",
  tracesSampleRate: 1.0,
  debug: false,
});
