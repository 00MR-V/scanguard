import { logoutAction } from "@/actions/auth-actions";

export function LogoutButton() {
  return (
    <form action={logoutAction} className="w-full sm:w-auto">
      <button
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 sm:w-auto"
        type="submit"
      >
        Log out
      </button>
    </form>
  );
}
