import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const [email, setEmail] = useState("admin@anufashions.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-700">Business Login</h1>
            <p className="text-sm text-slate-600">Sarees & Ladies Wear Retail Manager</p>
          </div>

          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button
            className="w-full"
            disabled={loading}
            onClick={async () => {
              try {
                setError("");
                await login(email, password);
                navigate("/");
              } catch {
                setError("Invalid credentials");
              }
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
