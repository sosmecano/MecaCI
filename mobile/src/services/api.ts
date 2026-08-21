import * as SecureStore from 'expo-secure-store';
import { File, UploadType } from 'expo-file-system';

const BASE_URL = 'https://mecanova.onrender.com/api';
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (!res.ok) return false;

    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request(path: string, options: RequestInit = {}, timeoutMs = 15000): Promise<any> {
  const token = await getToken();
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
    if (res.status === 401 && token) {
      if (!refreshing) {
        refreshing = refreshAccessToken();
      }
      const ok = await refreshing;
      refreshing = null;
      if (ok) {
        const newToken = await getToken();
        headers['Authorization'] = `Bearer ${newToken}`;
        const retry = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
        const data = await retry.json();
        if (!retry.ok) throw new Error(data.error || 'Request failed');
        return data;
      }
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      throw new Error('Session expired');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function uploadFile(path: string, fileUri: string, fieldName: string = 'photo') {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const file = new File(fileUri);
    const result = await file.upload(`${BASE_URL}${path}`, {
      uploadType: UploadType.MULTIPART,
      fieldName,
      headers,
    });
    let data: any;
    try {
      data = JSON.parse(result.body);
    } catch {
      throw new Error('Invalid response from server');
    }
    if (result.status >= 400) throw new Error(data?.error || 'Upload failed');
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  upload: {
    photo: (fileUri: string) => uploadFile('/upload/photo', fileUri),
  },
  auth: {
    sendOtp: (phone: string) => request('/auth/send-otp', {
      method: 'POST', body: JSON.stringify({ phone }),
    }),
    verifyOtp: (phone: string, code: string) => request('/auth/verify-otp', {
      method: 'POST', body: JSON.stringify({ phone, code }),
    }),
    adminVerify: (phone: string, code: string) => request('/auth/admin-verify', {
      method: 'POST', body: JSON.stringify({ phone, code }),
    }),
  },
  users: {
    me: () => request('/users/me'),
    update: (data: any) => request('/users/me', {
      method: 'PUT', body: JSON.stringify(data),
    }),
    vehicles: {
      list: () => request('/users/vehicles'),
      create: (data: any) => request('/users/vehicles', {
        method: 'POST', body: JSON.stringify(data),
      }),
      remove: (id: string) => request(`/users/vehicles/${id}`, { method: 'DELETE' }),
    },
    missions: () => request('/users/missions'),
  },
  professionals: {
    register: (data: any) => request('/professionals/register', {
      method: 'POST', body: JSON.stringify(data),
    }),
    sendOtp: (phone: string) => request('/professionals/send-otp', {
      method: 'POST', body: JSON.stringify({ phone }),
    }),
    verifyOtp: (phone: string, code: string) => request('/professionals/verify-otp', {
      method: 'POST', body: JSON.stringify({ phone, code }),
    }),
    me: () => request('/professionals/me'),
    update: (data: any) => request('/professionals/me', {
      method: 'PUT', body: JSON.stringify(data),
    }),
    setAvailability: (is_available: boolean) => request('/professionals/availability', {
      method: 'PUT', body: JSON.stringify({ is_available }),
    }),
    missions: (status?: string) => request(`/professionals/missions?status=${status || 'all'}`),
    nearbyMissions: () => request('/professionals/nearby-missions'),
    earnings: () => request('/professionals/earnings'),
  },
  missions: {
    create: (data: any) => request('/missions', {
      method: 'POST', body: JSON.stringify(data),
    }),
    get: (id: string) => request(`/missions/${id}`),
    accept: (id: string) => request(`/missions/${id}/accept`, {
      method: 'PATCH',
    }),
    updateStatus: (id: string, status: string) => request(`/missions/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),
    arrive: (id: string, lat: number, lng: number) => request(`/missions/${id}/arrive`, {
      method: 'POST', body: JSON.stringify({ lat, lng }),
    }),
    updateLocation: (id: string, lat: number, lng: number) => request(`/missions/${id}/location`, {
      method: 'POST', body: JSON.stringify({ lat, lng }),
    }),
    nearbyPros: (lat: number, lng: number, type?: string) =>
      request(`/missions/nearby/professionals?lat=${lat}&lng=${lng}&type=${type || ''}`),
  },
  diagnoses: {
    list: (missionId: string) => request(`/diagnoses/mission/${missionId}`),
    create: (data: any) => request('/diagnoses', {
      method: 'POST', body: JSON.stringify(data),
    }),
    updateStatus: (id: string, status: string) => request(`/diagnoses/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),
  },
  subscriptions: {
    my: () => request('/subscriptions/my'),
    create: (data: any) => request('/subscriptions', {
      method: 'POST', body: JSON.stringify(data),
    }),
  },
  payments: {
    create: (data: any) => request('/payments', {
      method: 'POST', body: JSON.stringify(data),
    }),
    history: () => request('/payments/history'),
  },
  garages: {
    list: () => request('/garages'),
    get: (id: string) => request(`/garages/${id}`),
    review: (data: any) => request('/garages/reviews', {
      method: 'POST', body: JSON.stringify(data),
    }),
  },
  admin: {
    dashboard: () => request('/admin/dashboard'),
    professionals: (status?: string) => request(`/admin/professionals?status=${status || 'all'}`),
    validatePro: (id: string, action: string) => request(`/admin/professionals/${id}/validate`, {
      method: 'PATCH', body: JSON.stringify({ action }),
    }),
    users: () => request('/admin/users'),
    suspendUser: (id: string) => request(`/admin/users/${id}/suspend`, { method: 'PATCH' }),
    missions: (status?: string) => request(`/admin/missions?status=${status || 'all'}`),
    payments: () => request('/admin/payments'),
  },
  proxy: {
    searchAddress: (q: string) => request(`/proxy/nominatim/search?q=${encodeURIComponent(q)}`),
    reverseGeocode: (lat: number, lng: number) => request(`/proxy/nominatim/reverse?lat=${lat}&lon=${lng}`),
    route: (fromLng: number, fromLat: number, toLng: number, toLat: number) =>
      request(`/proxy/osrm/driving/${fromLng},${fromLat};${toLng},${toLat}`),
  },
};