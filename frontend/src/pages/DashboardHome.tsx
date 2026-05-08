import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";

export default function DashboardHome() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ id: string; paid: boolean } | null>("/plan/user/latest");
        if (cancelled) return;
        if (res.data?.id) {
          navigate(res.data.paid ? `/dashboard/${res.data.id}` : `/teaser/${res.data.id}`, { replace: true });
        } else {
          navigate("/create-plan", { replace: true });
        }
      } catch {
        if (!cancelled) navigate("/create-plan", { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 font-mono text-[13px] text-[#44475a]">
          <Loader2 className="w-4 h-4 text-[#5b5fc7] animate-spin" />
          <span>loading dashboard...</span>
        </div>
      </div>
    );
  }

  return null;
}

