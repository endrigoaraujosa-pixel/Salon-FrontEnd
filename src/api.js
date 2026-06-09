import axios from "axios";

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL + "/api";
  }
  const hostname = window.location.hostname;
  return `http://${hostname}:5000/api`;
};

const getTenantId = () => {
  const hostname = window.location.hostname;
  return hostname.split('.')[0];
};

const tenantId = getTenantId();

const baseURL = getBaseURL();
const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    "x-tenant-id": tenantId
  },
  withCredentials: true,
});

const blackList = [
  "/auth/refresh",
  "/auth/login",
  "/auth/logout"
];

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {    
    const token = localStorage.getItem("salon_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      config.headers['x-is-mobile'] = 'true';
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


api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const responseStatus = error.response?.status;

    if (responseStatus === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const headers = {
          "x-tenant-id": tenantId
        };
        if (isMobile) {
          headers["x-is-mobile"] = "true";
        }
        const refreshResponse = await axios.post(`${baseURL}/auth/refresh`, {}, { 
          withCredentials: true,
          headers
        });
        if (refreshResponse.data.token) {
          localStorage.setItem('salon_token', refreshResponse.data.token);
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Erro no refresh token:', refreshError);
        localStorage.removeItem('salon_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;