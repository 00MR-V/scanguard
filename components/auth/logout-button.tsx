import { logoutAction } from "@/actions/auth-actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        type="submit"
      >
        Log out
      </button>
    </form>
  );
}
