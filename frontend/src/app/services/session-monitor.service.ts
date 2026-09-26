import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SessionMonitorService {
  private readonly events = [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
  ] as const;
  private readonly checkIntervalMs = 15_000;
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  start(): void {
    if (this.timer) return;
    for (const event of this.events) {
      window.addEventListener(event, this.onActivity, { passive: true });
    }
    this.timer = setInterval(() => this.check(), this.checkIntervalMs);
    this.check();
  }

  stop(): void {
    if (!this.timer) return;
    for (const event of this.events) {
      window.removeEventListener(event, this.onActivity);
    }
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private onActivity = (): void => {
    this.auth.updateLastActivity();
  };

  private check(): void {
    if (!this.auth.isAuthenticated()) return;
    if (this.auth.isSessionExpired()) {
      this.auth.logout();
      this.redirectToLogin();
    }
  }

  private redirectToLogin(): void {
    const currentUrl = this.router.url;
    if (currentUrl.startsWith('/login')) return;
    this.router.navigate(['/login'], { queryParams: { expired: '1' } });
  }
}
