import { NextResponse } from 'next/server'

export function GET() {
  return new NextResponse('google-site-verification: google3105c012acfb908e.html', {
    headers: { 'Content-Type': 'text/html' },
  })
}
