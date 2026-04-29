import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await prisma.generatedReport.findUnique({
    where: { id: params.id },
  })
  if (!report || report.workspaceId !== session.user.workspaceId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json(report)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await prisma.generatedReport.findUnique({
    where: { id: params.id },
    select: { workspaceId: true },
  })
  if (!report || report.workspaceId !== session.user.workspaceId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.generatedReport.delete({ where: { id: params.id } })
  return Response.json({ success: true })
}
