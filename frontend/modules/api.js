const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let csrfToken = null;
let csrfExpiry = 0;
let csrfPromise = null;
let unauthorizedHandler = null;

export function onUnauthorized(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
}

async function fetchCsrfToken(force = false) {
  if (!force && csrfToken && Date.now() < csrfExpiry - 5000) {
    return csrfToken;
  }

  if (csrfPromise && !force) {
    return csrfPromise;
  }

  csrfPromise = (async () => {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      csrfPromise = null;
      throw new Error('Unable to fetch CSRF token');
    }

    const payload = await response.json();
    csrfToken = payload.csrfToken;
    csrfExpiry = Date.now() + (Number(payload.expiresIn) || 0);
    csrfPromise = null;
    return csrfToken;
  })().catch((error) => {
    csrfPromise = null;
    csrfToken = null;
    csrfExpiry = 0;
    throw error;
  });

  return csrfPromise;
}

export function ensureCsrfToken(force = false) {
  return fetchCsrfToken(force);
}

async function parseJsonResponse(response) {
  if (response.status === 204) {
    return null;
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  return response.json();
}

export async function request(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const fetchOptions = {
    method,
    credentials: 'include',
    headers,
  };

  if (method === 'GET') {
    fetchOptions.cache = 'no-store';
  }

  if (options.data !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    fetchOptions.body =
      headers['Content-Type'] === 'application/json'
        ? JSON.stringify(options.data)
        : options.data;
  }

  const needsCsrf = options.csrf !== false && !SAFE_METHODS.has(method);
  if (needsCsrf) {
    const token = await fetchCsrfToken();
    headers['X-CSRF-Token'] = token;
  }

  const response = await fetch(endpoint, fetchOptions);

  if (!response.ok) {
    let errorPayload = null;
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = null;
    }

    const error = new Error(
      errorPayload?.error || `HTTP ${response.status}: ${response.statusText}`
    );
    error.status = response.status;
    error.details = errorPayload || undefined;

    const csrfError =
      needsCsrf &&
      errorPayload &&
      typeof errorPayload.code === 'string' &&
      errorPayload.code.startsWith('CSRF_');

    if (csrfError && options._retry !== false) {
      await fetchCsrfToken(true);
      return request(endpoint, { ...options, _retry: false });
    }

    if (response.status === 401 && unauthorizedHandler) {
      unauthorizedHandler({ endpoint, method, error });
    }

    throw error;
  }

  return parseJsonResponse(response);
}

export function fetchData(endpoint, options = {}) {
  return request(endpoint, { ...options, method: 'GET' });
}

export function postData(endpoint, data, options = {}) {
  return request(endpoint, { ...options, method: 'POST', data });
}

export function putData(endpoint, data, options = {}) {
  return request(endpoint, { ...options, method: 'PUT', data });
}

export function deleteData(endpoint, options = {}) {
  return request(endpoint, { ...options, method: 'DELETE' });
}

export default fetchData;
