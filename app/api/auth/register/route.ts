import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { email: rawEmail, password, name } = parsed.data
    const email = rawEmail.toLowerCase()

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Atomically create Workspace and User
    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: name ? `${name}'s Workspace` : "My Workspace",
        }
      })

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          workspaceId: workspace.id
        }
      })

      return { user, workspace }
    })

    return NextResponse.json(
      { message: "User registered successfully", workspaceId: result.workspace.id },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
