import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://ab0f83f81c6a8fa95892e55412a0aa66@o4511424620986368.ingest.us.sentry.io/4511424623673344",
  tracesSampleRate: 1.0,
});
