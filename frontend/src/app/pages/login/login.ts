import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  username = '';
  password = '';
  cargando = false;
  mensaje = '';
  tipoMensaje = 'danger';
  mostrarPassword = false;
  currentYear = new Date().getFullYear();

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['expired'] === '1') {
        this.mensaje =
          'Tu sesión expiró por inactividad. Inicia sesión nuevamente.';
        this.tipoMensaje = 'warning';
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    });
    if (this.auth.isAuthenticated()) {
      this.redirigir();
    }
  }

  onLogin(): void {
    if (!this.username || !this.password) {
      this.mensaje = 'Ingresa tu usuario y contraseña.';
      return;
    }
    this.cargando = true;
    this.mensaje = '';
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.cargando = false;
        this.redirigir();
      },
      error: () => {
        this.cargando = false;
        this.mensaje = 'Usuario o contraseña incorrectos.';
      },
    });
  }

  private redirigir(): void {
    this.router.navigate(['/']);
  }
}
