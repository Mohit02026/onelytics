import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const mailbox = await prisma.connectedMailbox.findUnique({
    where: { userId_provider: { userId, provider: 'google' } },
  })
  if (!mailbox) return Response.json({ error: 'Not connected' }, { status: 404 })

  // Any workspace relying on this mailbox loses its sender — turn sending off
  // rather than leave it pointing at a mailbox that no longer exists.
  await prisma.workspace.updateMany({
    where: { weeklyReportSenderId: userId },
    data: { weeklyReportEnabled: false, weeklyReportSenderId: null },
  })

  await prisma.connectedMailbox.delete({
    where: { userId_provider: { userId, provider: 'google' } },
  })

  return Response.json({ success: true })
}
