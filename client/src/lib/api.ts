// API handler for making consistent requests across the application

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
}

/**
 * Makes a request to the API with consistent error handling
 * @param url - The API endpoint to call
 * @param options - Request options (method, headers, data)
 * @returns Promise that resolves to the response data
 */
export async function apiRequest(url: string, options: ApiRequestOptions = {}) {
  const {
    method = 'GET',
    headers = {},
    data
  } = options;

  // Prepare request options
  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    credentials: 'include', // Include cookies for authentication
  };

  // Add body for non-GET requests
  if (method !== 'GET' && data !== undefined) {
    requestOptions.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, requestOptions);

    // Check if response is OK
    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Ignore JSON parsing error, use default message
      }
      throw new Error(errorMessage);
    }

    // Return JSON response if present, otherwise empty object
    if (response.headers.get('content-type')?.includes('application/json')) {
      return await response.json();
    }
    
    return {};
  } catch (error) {
    // Re-throw any errors for handling by the caller
    throw error;
  }
}

/**
 * Helper function for GET requests
 */
export function apiGet(url: string, headers?: Record<string, string>) {
  return apiRequest(url, { method: 'GET', headers });
}

/**
 * Helper function for POST requests
 */
export function apiPost(url: string, data?: any, headers?: Record<string, string>) {
  return apiRequest(url, { method: 'POST', data, headers });
}

/**
 * Helper function for PUT requests
 */
export function apiPut(url: string, data?: any, headers?: Record<string, string>) {
  return apiRequest(url, { method: 'PUT', data, headers });
}

/**
 * Helper function for DELETE requests
 */
export function apiDelete(url: string, headers?: Record<string, string>) {
  return apiRequest(url, { method: 'DELETE', headers });
}

/**
 * Helper function for PATCH requests
 */
export function apiPatch(url: string, data?: any, headers?: Record<string, string>) {
  return apiRequest(url, { method: 'PATCH', data, headers });
}