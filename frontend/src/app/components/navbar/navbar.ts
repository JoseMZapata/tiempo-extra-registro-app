import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { RegistroPendienteService } from '../../services/registro-pendiente.service';

@Component({
  selector: 'app-navbar',
  imports: [NgClass, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit, OnDestroy {
  menuOpen = false;
  totalPendientes = 0;

  private suscripcionPendientes?: Subscription;

  constructor(
    public auth: AuthService,
    private router: Router,
    private readonly registroPendienteService: RegistroPendienteService,
  ) {}

  ngOnInit(): void {
    this.suscripcionPendientes =
      this.registroPendienteService.pendientes$.subscribe((pendientes) => {
        this.totalPendientes = pendientes.length;
      });
  }

  ngOnDestroy(): void {
    this.suscripcionPendientes?.unsubscribe();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  logout() {
    this.closeMenu();
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
