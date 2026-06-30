import { PublicShareScreen } from '@/components/screens/PublicShareScreen'

export const metadata = { title: 'Shared Health Record — Health Hub Africa' }

interface Props {
  params: Promise<{ token: string }>
}

export default async function PublicSharePage({ params }: Props) {
  const { token } = await params
  return <PublicShareScreen token={token} />
}
