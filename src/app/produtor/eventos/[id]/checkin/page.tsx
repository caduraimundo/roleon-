import { redirect } from 'next/navigation'

export default async function CheckinRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/produtor/eventos/${id}/portaria`)
}
