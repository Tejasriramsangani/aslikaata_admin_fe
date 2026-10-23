/**
 * ASLI KAATA Admin Operations API Client
 * Connects directly to aslikaata_be on http://localhost:4000/api/v1
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string | null;
  timestamp?: string;
}

class AdminApiClient {
  private refreshPromise: Promise<string | null> | null = null;

  private isTokenExpired(token: string): boolean {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return true;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      const { exp } = JSON.parse(jsonPayload);
      if (!exp) return false;
      return Date.now() >= exp * 1000 - 30000;
    } catch {
      return false;
    }
  }

  public getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('aslikaata_admin_access_token');
  }

  public setTokens(token: string, refreshToken?: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('aslikaata_admin_access_token', token);
    if (refreshToken) localStorage.setItem('aslikaata_admin_refresh_token', refreshToken);
  }

  public clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('aslikaata_admin_access_token');
    localStorage.removeItem('aslikaata_admin_refresh_token');
    localStorage.removeItem('aslikaata_admin_profile');
  }

  public async acquireFreshToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = (async () => {
      try {
        const refreshToken =
          typeof window !== 'undefined'
            ? localStorage.getItem('aslikaata_admin_refresh_token')
            : null;
        if (!refreshToken) {
          this.clearTokens();
          return null;
        }
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const refreshData = await refreshRes.json().catch(() => ({}));
        const tokens = refreshData?.data || refreshData;
        if (refreshRes.ok && tokens?.accessToken) {
          this.setTokens(tokens.accessToken, tokens.refreshToken || refreshToken);
          return tokens.accessToken;
        }
        this.clearTokens();
      } catch {
        this.clearTokens();
      } finally {
        this.refreshPromise = null;
      }
      return null;
    })();

    return this.refreshPromise;
  }

  private async request<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
  ): Promise<ApiResponse<T>> {
    const isLoginEndpoint = endpoint.includes('/auth/admin/login');
    let token = this.getAccessToken();

    if (!isLoginEndpoint && token && this.isTokenExpired(token)) {
      const freshToken = await this.acquireFreshToken();
      token = freshToken;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${BASE_URL}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && typeof window !== 'undefined' && !isLoginEndpoint) {
          const freshToken = await this.acquireFreshToken();
          if (freshToken) {
            headers['Authorization'] = `Bearer ${freshToken}`;
            const retryRes = await fetch(url, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined,
            });
            const retryJson = await retryRes.json().catch(() => ({}));
            if (retryRes.ok) {
              return {
                success: true,
                data: retryJson.data !== undefined ? retryJson.data : retryJson,
                error: null,
                timestamp: retryJson.timestamp || new Date().toISOString(),
              };
            }
          }
        }

        return {
          success: false,
          data: null as any,
          error: json.message || json.error || `HTTP ${response.status}`,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: json.data !== undefined ? json.data : json,
        error: null,
        timestamp: json.timestamp || new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        data: null as any,
        error: err.message || 'Network error connecting to ASLI KAATA Backend',
        timestamp: new Date().toISOString(),
      };
    }
  }

  public get<T = any>(endpoint: string) {
    return this.request<T>(endpoint, 'GET');
  }

  public post<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, 'POST', body);
  }

  public patch<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, 'PATCH', body);
  }

  public put<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, 'PUT', body);
  }

  public delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, 'DELETE');
  }
}

export const adminApiClient = new AdminApiClient();
