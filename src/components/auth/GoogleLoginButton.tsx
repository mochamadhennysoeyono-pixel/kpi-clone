"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";

export default function GoogleLoginButton() {
  const { loginWithGoogle, isLoading } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLocalLoading(true);
    setError(null);
    try {
      const result = await loginWithGoogle();
      if (result && !result.success) {
        setError(result.error || "Login dengan Google gagal. Silakan coba lagi.");
      } else if (!result) {
        setError("Login dengan Google gagal (no response).");
      }
    } catch (e: any) {
      setError(e.message || "Login dengan Google gagal. Silakan coba lagi.");
    }
    setLocalLoading(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
        disabled={isLoading || localLoading}
      >
        {localLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg
            className="mr-2 h-4 w-4"
            aria-hidden="true"
            focusable="false"
            data-prefix="fab"
            data-icon="google"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 488 512"
          >
            <path
              fill="currentColor"
              d="M488 261.8C488 403.3 381.5 512 244 512 110.1 512 0 401.9 0 265.8 0 129.8 110.1 20 244 20c66.5 0 122.1 24.6 166.4 65.6l-67.5 64.8C295.5 112.6 270.1 96 244 96c-59.6 0-108.1 48.4-108.1 108.1s48.4 108.1 108.1 108.1c68.2 0 97.9-53.1 101.4-78.1H244v-64.8h243.2c1.3 7.9 2.8 15.5 2.8 23.5z"
            ></path>
          </svg>
        )}
        Masuk dengan Google
      </Button>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
