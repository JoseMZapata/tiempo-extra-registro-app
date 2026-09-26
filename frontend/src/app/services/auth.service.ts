import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  username: string;
  fullName?: string | null;
  isAdmin: boolean;
}

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  username: string;
  fullName?: string | null;
  isAdmin: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly tokenKey = 'tiempo_extra_token';
  private readonly userKey = 'tiempo_extra_user';
  private readonly sessionStartKey = 'tiempo_extra_session_started_at';
  private readonly lastActivityKey = 'tiempo_extra_last_activity_at';

  private tokenSignal = signal<string | null>(this.readToken());
  private userSignal = signal<AuthUser | null>(this.readUser());

  private lastActivityWrite = 0;

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly isAdmin = computed(() => this.userSignal()?.isAdmin === true);

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap((res) => {
          const user: AuthUser = {
            username: res.username,
            fullName: res.fullName,
            isAdmin: res.isAdmin,
          };
          const now = Date.now();
          localStorage.setItem(this.tokenKey, res.accessToken);
          localStorage.setItem(this.userKey, JSON.stringify(user));
          localStorage.setItem(this.sessionStartKey, now.toString());
          localStorage.setItem(this.lastActivityKey, now.toString());
          this.lastActivityWrite = now;
          this.tokenSignal.set(res.accessToken);
          this.userSignal.set(user);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.sessionStartKey);
    localStorage.removeItem(this.lastActivityKey);
    this.tokenSignal.set(null);
    this.userSignal.set(null);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  updateLastActivity(): void {
    const now = Date.now();
    if (now - this.lastActivityWrite < 30_000) return;
    this.lastActivityWrite = now;
    localStorage.setItem(this.lastActivityKey, now.toString());
  }

  isSessionExpired(): boolean {
    const now = Date.now();
    const sessionStart = this.readNumber(this.sessionStartKey);
    const lastActivity = this.readNumber(this.lastActivityKey);
    if (!sessionStart || sessionStart > now) return true;

    if (now - sessionStart > environment.sessionTimeoutMinutes * 60_000) {
      return true;
    }

    const lastActivityMs =
      lastActivity && lastActivity <= now ? lastActivity : sessionStart;
    if (now - lastActivityMs > environment.idleTimeoutMinutes * 60_000) {
      return true;
    }

    return false;
  }

  private readToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  private readNumber(key: string): number | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }
}
