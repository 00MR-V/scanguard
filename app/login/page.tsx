import { loginAction } from "@/actions/auth-actions";
import { PasswordField } from "@/components/auth/password-field";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  disabled: "This account is disabled. Contact an administrator.",
  invalid_credentials: "Invalid username or password.",
  missing_fields: "Enter both username and password.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 py-10 text-zinc-950">
      <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-emerald-700">ScanGuard</p>
          <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}

        <form action={loginAction} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Username</span>
            <input
              className="mt-1 h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              name="username"
              type="text"
              autoComplete="username"
              required
            />
          </label>

          <PasswordField />

          <button
            className="h-11 w-full rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            type="submit"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
