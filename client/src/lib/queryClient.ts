import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get the base URL depending on the environment
export function getBaseUrl() {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Check if there's an API URL in the environment
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    // Fall back to current origin
    return window.location.origin;
  }
  // Fallback for non-browser environments
  return '';
}

export async function apiRequest(
  url: string,
  options: {
    method: string;
    data?: unknown;
  } = { method: 'GET' }
): Promise<Response> {
  // Get JWT token from localStorage
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {};
  if (options.data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Ensure URL starts with base URL in production
  const fullUrl = url.startsWith('http') ? url : `${getBaseUrl()}${url}`;
  
  console.log(`API Request to: ${fullUrl}`);
  
  const res = await fetch(fullUrl, {
    method: options.method,
    headers,
    body: options.data ? JSON.stringify(options.data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get JWT token from localStorage
    const token = localStorage.getItem('token');
    
    // Set up headers with Authorization if token exists
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Get the full URL with base URL if needed
    const url = queryKey[0] as string;
    const fullUrl = url.startsWith('http') ? url : `${getBaseUrl()}${url}`;
    
    const res = await fetch(fullUrl, { headers });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
