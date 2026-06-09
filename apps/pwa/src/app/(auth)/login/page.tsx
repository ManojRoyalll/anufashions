"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@anufashions.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4">
          <h1 className="text-2xl font-bold">Anu Fashions Login</h1>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button
            className="w-full"
            onClick={async () => {
              const result = await signIn("credentials", { email, password, redirect: false });
              if (result?.error) {
                setError("Invalid credentials");
                return;
              }
              router.push("/dashboard");
            }}
          >
            Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
