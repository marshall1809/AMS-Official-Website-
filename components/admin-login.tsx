import { signInFromFormAction } from "@/lib/auth/actions";

export function AdminLogin({ failed }: { failed: boolean }) {
  return (
    <div className="theme-root admin-theme">
      <main className="admin-login">
        <form action={signInFromFormAction} className="admin-login__card panel">
          <p className="section-kicker">Admin Access</p>
          <h1>AMS Control</h1>
          <p>Sign in with a Supabase Auth account that has an assigned admin role.</p>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" required />
          </label>
          {failed ? <strong className="admin-login__error">Login failed.</strong> : null}
          <button className="button" type="submit">
            Sign in
          </button>
        </form>
      </main>
    </div>
  );
}
