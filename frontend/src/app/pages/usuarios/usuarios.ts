import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.model';
import { UsersService } from '../../services/users.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-usuarios',
  imports: [FormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
})
export class Usuarios implements OnInit {
  usuarios: User[] = [];
  cargando = false;
  mensaje = '';
  tipoMensaje = '';

  mostrarModal = false;
  guardando = false;
  usuarioEditando: User | null = null;
  formularioUsuario = {
    fullName: '',
    username: '',
    password: '',
    isAdmin: false,
  };

  usuarioAEliminar: User | null = null;
  mostrarModalEliminar = false;
  eliminando = false;

  constructor(
    public auth: AuthService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.cargando = true;
    this.cdr.detectChanges();
    this.usersService.getUsers().subscribe({
      next: (users) => {
        this.usuarios = users;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.mostrarError('No se pudieron cargar los usuarios.');
      },
    });
  }

  abrirNuevo(): void {
    this.usuarioEditando = null;
    this.formularioUsuario = {
      fullName: '',
      username: '',
      password: '',
      isAdmin: false,
    };
    this.mostrarModal = true;
  }

  editarUsuario(user: User): void {
    this.usuarioEditando = user;
    this.formularioUsuario = {
      fullName: user.fullName ?? '',
      username: user.username,
      password: '',
      isAdmin: user.isAdmin,
    };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  onGuardar(): void {
    const nombre = this.formularioUsuario.username.trim();
    const esEdicion = !!this.usuarioEditando;

    if (!nombre) {
      this.mostrarError('El usuario es obligatorio.');
      return;
    }
    if (!esEdicion && !this.formularioUsuario.password) {
      this.mostrarError('La contraseña es obligatoria.');
      return;
    }
    if (
      this.formularioUsuario.password &&
      this.formularioUsuario.password.length < 6
    ) {
      this.mostrarError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    if (esEdicion && this.usuarioEditando) {
      const payload: {
        username: string;
        fullName: string | null;
        isAdmin: boolean;
        password?: string;
      } = {
        username: nombre,
        fullName: this.formularioUsuario.fullName.trim() || null,
        isAdmin: this.formularioUsuario.isAdmin,
      };
      if (this.formularioUsuario.password) {
        payload.password = this.formularioUsuario.password;
      }
      this.usersService.updateUser(this.usuarioEditando.id, payload).subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarModal = false;
          this.mostrarExito('Usuario actualizado correctamente.');
        },
        error: (err) => {
          this.guardando = false;
          this.mostrarError(
            err?.error?.message || 'No se pudo actualizar el usuario.',
          );
        },
      });
    } else {
      this.usersService
        .createUser({
          username: nombre,
          password: this.formularioUsuario.password,
          fullName: this.formularioUsuario.fullName.trim() || null,
          isAdmin: this.formularioUsuario.isAdmin,
        })
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarModal = false;
            this.mostrarExito('Usuario creado correctamente.');
          },
          error: (err) => {
            this.guardando = false;
            this.mostrarError(
              err?.error?.message || 'No se pudo crear el usuario.',
            );
          },
        });
    }
  }

  private mostrarExito(texto: string): void {
    this.mensaje = texto;
    this.tipoMensaje = 'success';
    this.cargarUsuarios();
    this.cdr.detectChanges();
    setTimeout(() => {
      this.mensaje = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  private mostrarError(texto: string): void {
    this.mensaje = texto;
    this.tipoMensaje = 'danger';
    this.cdr.detectChanges();
    setTimeout(() => {
      this.mensaje = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  confirmarEliminar(user: User): void {
    this.usuarioAEliminar = user;
    this.mostrarModalEliminar = true;
  }

  cerrarModalEliminar(): void {
    this.mostrarModalEliminar = false;
    this.usuarioAEliminar = null;
  }

  onDeleteUser(): void {
    if (!this.usuarioAEliminar) return;
    this.eliminando = true;
    this.cdr.detectChanges();
    this.usersService.deleteUser(this.usuarioAEliminar.id).subscribe({
      next: () => {
        this.eliminando = false;
        this.mostrarModalEliminar = false;
        this.mostrarExito('Usuario eliminado correctamente.');
      },
      error: (err) => {
        this.eliminando = false;
        this.mostrarError(
          err?.error?.message || 'No se pudo eliminar el usuario.',
        );
      },
    });
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
