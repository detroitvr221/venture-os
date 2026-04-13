import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || 'NONE';
  const token = authHeader.replace('Bearer ', '');

  const validTokens = [
    process.env.OPENCLAW_WEBHOOK_SECRET,
    process.env.OPENCLAW_API_KEY,
    process.env.OPENCLAW_GATEWAY_TOKEN,
    'vos-hooks-token-2026',
    'vos-gw-token-2026',
  ].filter(Boolean);

  const tokenSet = new Set(validTokens);
  const isValid = tokenSet.has(token);

  return NextResponse.json({
    received_token_length: token.length,
    received_token_start: token.slice(0, 10),
    valid_tokens_count: validTokens.length,
    is_valid: isValid,
    env_webhook_set: !!process.env.OPENCLAW_WEBHOOK_SECRET,
    env_api_set: !!process.env.OPENCLAW_API_KEY,
    env_gateway_set: !!process.env.OPENCLAW_GATEWAY_TOKEN,
  });
}

export async function GET() {
  return NextResponse.json({ status: 'ok', route: 'openclaw-test' });
}
