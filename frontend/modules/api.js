/**
 * Centralized API client with proper error handling
 * Throws errors instead of returning empty arrays
 */

/**
 * Fetch data from endpoint (GET request)
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} Response data
 * @throws {Error} On network or HTTP errors
 */
export async function fetchData(endpoint) {
  try {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Ошибка запроса: ${error}`);
  }
}

/**
 * Send data to endpoint (POST request)
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @returns {Promise<any>} Response data
 * @throws {Error} On network or HTTP errors
 */
export async function postData(endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Ошибка запроса: ${error}`);
  }
}

/**
 * Update data at endpoint (PUT request)
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @returns {Promise<any>} Response data
 * @throws {Error} On network or HTTP errors
 */
export async function putData(endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Ошибка запроса: ${error}`);
  }
}

/**
 * Delete data at endpoint (DELETE request)
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} Response data
 * @throws {Error} On network or HTTP errors
 */
export async function deleteData(endpoint) {
  try {
    const response = await fetch(endpoint, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Ошибка запроса: ${error}`);
  }
}

export default fetchData;
