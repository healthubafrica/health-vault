import { TelecareGuestScreen } from '@/components/screens/TelecareGuestScreen'

export const metadata = { title: 'Video Call Invite — Health Hub Africa' }

interface Props {
  params: Promise<{ token: string }>
}

export default async function TelecareGuestPage({ params }: Props) {
  const { token } = await params
  return <TelecareGuestScreen token={token} />
}
