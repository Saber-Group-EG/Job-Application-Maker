const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export async function fetchCountries() {
  return request('/countries');
}

export async function fetchGovernorates(countryId) {
  return request(`/governorates/${countryId}`);
}

export async function fetchCities(governorateId) {
  return request(`/cities/${governorateId}`);
}

export async function addLead(data) {
  return request('/leads', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
