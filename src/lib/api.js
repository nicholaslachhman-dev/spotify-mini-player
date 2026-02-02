// Shared API helpers for talking to the local Node server.
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3001";

const toJson = async (response) => {
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

export const apiGet = async (path) => {
  const response = await fetch(`${API_BASE}${path}`);
  return { status: response.status, data: await toJson(response) };
};

export const apiPost = async (path, body) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await toJson(response) };
};

export const apiPut = async (path, body) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await toJson(response) };
};

export const apiDelete = async (path, body) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await toJson(response) };
};
