import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Callback universal do Supabase Auth:
 * - confirmação de e-mail (link com ?code= ou ?token_hash=)
 * - retorno do login social (Google OAuth com ?code=)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const next = searchParams.get("next") ?? "/";

  if (code || tokenHash) {
    const supabase = await createClient();
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    } else if (tokenHash) {
      await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
    }
  }

  // next só aceita caminhos internos (evita open redirect).
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
