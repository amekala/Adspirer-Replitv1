import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser, LoginData, AuthResponse } from "@shared/types";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// Define the auth response type
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AuthResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<AuthResponse, Error, InsertUser>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const showToast = (title: string, description: string, variant?: "default" | "destructive") => {
    if (!isMobile) {
      toast({ title, description, variant });
    }
  };

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation<AuthResponse, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (response: AuthResponse) => {
      // Save the token to localStorage
      localStorage.setItem("token", response.token);
      
      // Save the user data to query cache
      queryClient.setQueryData(["/api/user"], response.user);
      showToast("Welcome back!", "Successfully logged in");
    },
    onError: (error: Error) => {
      showToast("Login failed", "Invalid email or password", "destructive");
    },
  });

  const registerMutation = useMutation<AuthResponse, Error, InsertUser>({
    mutationFn: async (data: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", data);
      return await res.json();
    },
    onSuccess: (response: AuthResponse) => {
      // Save the token to localStorage
      localStorage.setItem("token", response.token);
      
      // Save the user data to query cache
      queryClient.setQueryData(["/api/user"], response.user);
      showToast("Welcome!", "Account created successfully");
    },
    onError: (error: Error) => {
      showToast(
        "Registration failed",
        error.message || "Could not create account",
        "destructive"
      );
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Remove the token from localStorage
      localStorage.removeItem("token");
      
      // Clear user data from cache
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      showToast("Logout failed", error.message, "destructive");
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}