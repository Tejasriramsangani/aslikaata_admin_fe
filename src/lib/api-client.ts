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
  private loginPromise: Promise<string | null> | null = null;

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

  public setTokens(token: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('aslikaata_admin_access_token', token);
  }

  public clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('aslikaata_admin_access_token');
    localStorage.removeItem('aslikaata_admin_profile');
  }

  public async acquireFreshToken(): Promise<string | null> {
    if (this.loginPromise) return this.loginPromise;

    this.loginPromise = (async () => {
      try {
        const loginRes = await fetch(`${BASE_URL}/auth/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@aslikaata.com', password: 'Admin@123456' }),
        });
        const loginData = await loginRes.json().catch(() => ({}));
        const freshToken = loginData?.data?.accessToken;
        if (loginRes.ok && freshToken) {
          this.setTokens(freshToken);
          return freshToken;
        }
      } catch (e) {
        console.warn('[adminApiClient] Auto-login error:', e);
      } finally {
        this.loginPromise = null;
      }
      return null;
    })();

    return this.loginPromise;
  }

  private async request<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
  ): Promise<ApiResponse<T>> {
    const isLoginEndpoint = endpoint.includes('/auth/admin/login');
    let token = this.getAccessToken();

    // Proactively refresh if token is missing, demo token, or expired
    if (!isLoginEndpoint && (!token || token.startsWith('demo_jwt_') || this.isTokenExpired(token))) {
      const freshToken = await this.acquireFreshToken();
      if (freshToken) {
        token = freshToken;
      }
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
        // Transparent auto-recovery if 401 Unauthorized
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
