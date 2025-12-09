// src/api.js
import axios from "axios";
import API_BASE from './config/api';

const API_HOST = API_BASE.replace(/\/$/, '');
const api = axios.create({ baseURL: `${API_HOST}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  // const tenantId = localStorage.getItem("tenantId"); // Frontend no longer needs to send this explicitly

  if (token) config.headers.Authorization = `Bearer ${token}`;

  // IMPORTANT: Remove sending tenantId explicitly in body/params.
  // The backend will now extract it securely from the JWT in the Authorization header.
  // This prevents client-side tampering with tenantId.
  // If your backend still relies on it for some specific non-tenant-data calls,
  // you'd need to handle that carefully, but for tenant-specific data, it's safer
  // to rely on the token.
  // if (config.method === "get") {
  //   config.params = { ...(config.params || {}), tenantId };
  // } else {
  //   config.data = { ...(config.data || {}), tenantId };
  // }

  return config;
});

export default api;