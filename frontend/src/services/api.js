const configured = import.meta.env.VITE_API_BASE_URL;
const BASE =
  configured === undefined || configured === ""
    ? ""
    : configured.replace(/\/$/, "") || "http://127.0.0.1:8000";

export const getToken = () => localStorage.getItem("jwt_token");
export const setToken = (token) => localStorage.setItem("jwt_token", token);
export const removeToken = () => localStorage.removeItem("jwt_token");

function apiUrl(path) {
  return BASE ? `${BASE}${path}` : path;
}

function getHeaders(isFormData = false) {
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function readError(response) {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail.map((item) => item.msg || JSON.stringify(item)).join("; ");
    }
    return response.statusText;
  } catch {
    return response.statusText || "Request failed";
  }
}

export async function getHealth() {
  const response = await fetch(apiUrl("/health"));
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function recommend(payload) {
  const response = await fetch(apiUrl("/api/v1/recommend"), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function getStandard(isCode) {
  const response = await fetch(apiUrl(`/api/v1/standards/${encodeURIComponent(isCode)}`), {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function uploadPdf(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(apiUrl("/api/v1/documents"), {
    method: "POST",
    headers: getHeaders(true),
    body: form,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}
