import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'

Sentry.init({
  dsn: "https://ab0f83f81c6a8fa95892e55412a0aa66@o4511424620986368.ingest.us.sentry.io/4511424623673344",
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
