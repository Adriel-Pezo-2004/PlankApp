import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <header>
      <h1>Bienvenido a la búsqueda de artistas</h1>
      <nav>
        <a routerLink="/buscar-artistas">Buscar Artistas</a>
        <ng-container *ngIf="isAuthenticated; else guestLinks">
          <span>Bienvenido, {{ userName }}</span>
          <a (click)="logout()">Cerrar Sesión</a>
        </ng-container>
        <ng-template #guestLinks>
          <a routerLink="/register">Registrarse</a>
          <a routerLink="/login">Iniciar Sesión</a>
        </ng-template>
      </nav>
    </header>
    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isAuthenticated = false;
  userName: string | null = null;

  constructor(private router: Router) {
    this.checkAuthentication();
  }

  checkAuthentication() {
    if (typeof window !== 'undefined' && localStorage) {
      const user = localStorage.getItem('user');
      if (user) {
        this.isAuthenticated = true;
        this.userName = JSON.parse(user).nombre;
      } else {
        this.isAuthenticated = false;
        this.userName = null;
      }
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isAuthenticated = false;
    this.userName = null;
    this.router.navigate(['/login']);
  }
}