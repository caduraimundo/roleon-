import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'

Sentry.init({
  dsn: "https://78dfb90d66030e1e0baad6642b996f89@o4512039961755648.ingest.us.sentry.io/4512039997800448",
  tracesSampleRate: 1.0,
  debug: false,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  defaults: '2026-01-30',
  disable_session_recording: true,
  persistence: 'localStorage+cookie',
})
