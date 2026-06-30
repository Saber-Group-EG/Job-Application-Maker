const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function submitApplicant(data) {
  const res = await fetch(`${BASE_URL}/applicants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Submit failed: ${res.statusText}`);
  return res.json();
}

export async function checkExistingApplicant(email, phone) {
  const params = new URLSearchParams();
  if (email) params.set('email', email);
  if (phone) params.set('phone', phone);
  const res = await fetch(`${BASE_URL}/applicants/check?${params}`);
  if (!res.ok) throw new Error(`Check failed: ${res.statusText}`);
  return res.json();
}

export function getApiErrorMessage(error) {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return 'An unexpected error occurred. Please try again.';
}
