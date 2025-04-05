import { getBaseUrl } from './queryClient';

// Store JWT token functions
export function getAuthToken() {
  return localStorage.getItem('token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('token');
}

// Error handling helper
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// API request interface that matches how it's used in the codebase
export interface ApiRequestOptions {
  method: string;
  data?: any;
  headers?: Record<string, string>;
}

// Enhanced API request function
export async function apiRequest(
  url: string,
  options: ApiRequestOptions
): Promise<Response> {
  // Get JWT token from localStorage
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    ...options.headers
  };
  
  if (options.data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Ensure URL starts with base URL in production
  const fullUrl = url.startsWith('http') ? url : `${getBaseUrl()}${url}`;
  
  const res = await fetch(fullUrl, {
    method: options.method,
    headers,
    body: options.data ? JSON.stringify(options.data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

// Legacy format wrapper to maintain backward compatibility
export async function legacyApiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  return apiRequest(url, { method, data });
}