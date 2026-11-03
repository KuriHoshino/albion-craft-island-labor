import { createFileRoute } from "@tanstack/react-router"
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client"

export const Route = createFileRoute("/login")({ component: Login })

function Login() {
  return (
    <main className="grid min-h-screen place-items-center bg-ink p-6 text-parchment">
      <div className="w-full max-w-sm space-y-3">
        <h1 className="font-display text-3xl">Sign in</h1>
        <p className="text-sm text-muted">Sign in with Google to keep saved crafts on your account.</p>
        {authEnabled ? (
          GROK_PROVIDERS.map((provider) => (
            <button
              key={provider.providerId}
              type="button"
              onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
              className="h-11 w-full rounded-lg border border-line bg-panel text-sm text-parchment"
            >
              Continue with {provider.label}
            </button>
          ))
        ) : (
          <p className="text-sm text-muted">Sign-in is turned off.</p>
        )}
      </div>
    </main>
  )
}
