import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    try {
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get("code");
      const error = queryParams.get("error");
      const errorDescription = queryParams.get("error_description");

      console.log("Auth callback received:", { code, error, errorDescription });

      if (error) {
        console.error("OAuth error:", error, errorDescription);
        if (window.opener) {
          window.opener.postMessage({ error, errorDescription }, "*");
          window.close();
        } else {
          setLocation("/dashboard");
        }
        return;
      }

      if (code) {
        if (window.opener) {
          // Send to any origin but only with the code
          window.opener.postMessage({ code }, "*");
          window.close();
        } else {
          // If opened directly (mobile flow), handle the code server-side
          fetch("/api/amazon/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
            credentials: "include", // Include cookies for authentication
          })
            .then((response) => {
              if (!response.ok) throw new Error("Failed to connect account");
              setLocation("/dashboard");
            })
            .catch((error) => {
              console.error("Failed to connect account:", error);
              setLocation("/dashboard");
            });
        }
      } else {
        console.error("No code or error received in callback");
        setLocation("/dashboard");
      }
    } catch (error) {
      console.error("Error in auth callback:", error);
      setLocation("/dashboard");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-medium">Processing authentication...</h2>
        <p className="text-sm text-muted-foreground mt-2">Please wait while we complete the connection.</p>
      </div>
    </div>
  );
}