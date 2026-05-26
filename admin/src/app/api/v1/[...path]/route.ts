/**
 * Catch-all proxy: forwards every /api/v1/* request to the backend and
 * EXPLICITLY copies all response headers (including Set-Cookie) back to the
 * browser. Next.js `rewrites` silently drop Set-Cookie, so we use a real
 * route handler instead.
 */
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Context = { params: Promise<{ path: string[] }> }

async function proxy(req: NextRequest, ctx: Context): Promise<NextResponse> {
  const { path } = await ctx.params
  const pathStr   = path.join('/')
  const search    = req.nextUrl.search
  const url       = `${BACKEND}/api/v1/${pathStr}${search}`

  // Forward relevant incoming headers
  const fwdHeaders = new Headers()
  const ct = req.headers.get('content-type')
  if (ct) fwdHeaders.set('content-type', ct)
  const cookie = req.headers.get('cookie')
  if (cookie) fwdHeaders.set('cookie', cookie)
  const auth = req.headers.get('authorization')
  if (auth) fwdHeaders.set('authorization', auth)

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const body    = hasBody ? await req.text() : undefined

  let backendRes: Response
  try {
    backendRes = await fetch(url, {
      method:  req.method,
      headers: fwdHeaders,
      body,
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'PROXY_ERROR', message: String(err) } },
      { status: 502 },
    )
  }

  // Build response, copying ALL headers from the backend (incl. Set-Cookie)
  const resHeaders = new Headers()
  backendRes.headers.forEach((val, key) => {
    // Skip hop-by-hop headers that must not be forwarded
    if (['transfer-encoding', 'connection', 'keep-alive', 'upgrade'].includes(key.toLowerCase())) return
    resHeaders.append(key, val)
  })

  return new NextResponse(backendRes.body, {
    status:  backendRes.status,
    headers: resHeaders,
  })
}

export const GET     = proxy
export const POST    = proxy
export const PUT     = proxy
export const PATCH   = proxy
export const DELETE  = proxy
export const OPTIONS = proxy
