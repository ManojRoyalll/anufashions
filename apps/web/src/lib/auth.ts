import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = {
  loading: boolean;
  session: Session | null;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: true, session: null });

  useEffect(() => {
    if (!supabase) { setState({ loading: false, session: null }); return; }
    supabase.auth.getSession().then(({ data }) => {
      setState({ loading: false, session: data.session });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ loading: false, session });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return "Backend not configured.";
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? error.message : null;
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}
