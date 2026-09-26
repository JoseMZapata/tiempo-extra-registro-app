import { Routes } from '@angular/router';
import { authGuard, adminGuard, loginGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'empleados',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/empleados/empleados').then((m) => m.Empleados),
  },
  {
    path: 'historial',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/historial/historial').then((m) => m.Historial),
  },
  {
    path: 'rutas',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/rutas/rutas').then((m) => m.Rutas),
  },
  {
    path: 'usuarios',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/usuarios/usuarios').then((m) => m.Usuarios),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
