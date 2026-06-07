import LoginForm from "./LoginForm";

export const metadata = { title: "Admin Sign In · JJ Properties" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-sm border border-stone-200 p-8">
        <h1 className="text-2xl font-semibold text-stone-900 mb-2">JJ Properties Admin</h1>
        <p className="text-stone-600 mb-6 text-sm">Sign in with your staff credentials.</p>
        <LoginForm next={next ?? "/admin"} />
        <p className="mt-4 text-sm">
          <a href="/admin/forgot-password" className="text-stone-600 hover:underline">
            Forgot your password?
          </a>
        </p>
      </div>
    </main>
  );
}
