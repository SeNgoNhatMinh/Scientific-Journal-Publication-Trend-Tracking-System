import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { motion } from "framer-motion";

export default function JoinWorkspacePage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token || !id) {
        setStatus("error");
        setMessage("Invalid invitation link.");
        return;
      }

      try {
        await api.post(`/workspaces/${id}/join`, { token });
        setStatus("success");
        setMessage("You have successfully joined the workspace.");
        setTimeout(() => {
          navigate(`/workspaces/${id}`);
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.response?.data?.message || "Could not verify invitation token.");
      }
    };

    verifyToken();
  }, [id, token, navigate]);

  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass border border-border/40 p-8 rounded-2xl shadow-lg w-full max-w-md text-center"
      >
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h2 className="text-lg font-semibold">Verifying Invitation...</h2>
            <p className="text-sm text-muted-foreground">Please wait while we set up your access.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <h2 className="text-xl font-bold text-emerald-500">Welcome!</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground animate-pulse">Redirecting to workspace...</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <XCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-bold text-destructive">Invitation Failed</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button onClick={() => navigate("/workspaces")} className="mt-2 rounded-xl">
              Go to My Workspaces
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
