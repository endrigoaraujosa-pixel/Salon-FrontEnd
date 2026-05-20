import axios from "axios";

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL + "/api";
  }
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `http://${host}:5000/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("salon_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Adicionar um timestamp para evitar cache em requisições GET que podem falhar na primeira vez
    if (config.method === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;