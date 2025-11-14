export async function fetchData(endpoint) {
  const response = await fetch(endpoint);
  if (!response.ok) {
    console.error(`Ошибка запроса ${endpoint}:`, response.status);
    return [];
  }
  try {
    return await response.json();
  } catch (error) {
    console.error('Ошибка чтения ответа', error);
    return [];
  }
}

export default fetchData;
