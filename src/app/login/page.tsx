"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error.includes("RATE_LIMITED")) {
        setError("登录失败过多，请 15 分钟后重试。");
      } else {
        setError("邮箱或密码错误。");
      }
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10 xs:px-6 sm:px-8">
      <section className="w-full rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        <h1 className="text-2xl font-semibold">登录</h1>
        <p className="mt-2 text-sm text-muted">单账号模式，请使用种子管理员账号登录。</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-sm">邮箱</span>
            <input
              className="h-11 rounded-lg border border-border bg-surface px-3 outline-none focus:ring-2 focus:ring-primary/35"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm">密码</span>
            <input
              className="h-11 rounded-lg border border-border bg-surface px-3 outline-none focus:ring-2 focus:ring-primary/35"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            className="h-11 w-full rounded-lg bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </section>
    </main>
  );
}
