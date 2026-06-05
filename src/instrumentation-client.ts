import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  defaults: '2026-01-30',
  disable_session_recording: true,
  persistence: 'localStorage+cookie',
})
