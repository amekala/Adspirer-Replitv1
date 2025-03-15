import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get("code");
    
    if (code) {
      // Send the code back to the opener window
      if (window.opener) {
        window.opener.postMessage({ code }, window.location.origin);
        window.close();
      } else {
        // If opened directly, redirect to dashboard
        setLocation("/dashboard");
      }
    }
  }, [setLocation]);

  return null;
}
