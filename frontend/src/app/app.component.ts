import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <header>
      <h1>{{ isAuthenticated ? 'Bienvenido, ' + userName : 'Bienvenido a PlankApp' }}</h1>
      <nav>
        <a routerLink="/buscar-artistas">Buscar Artistas</a>
        <ng-container *ngIf="isAuthenticated; else guestLinks">
          <a (click)="perfil()">Mi Perfil</a>
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
export class AppComponent implements OnInit {
  isAuthenticated = false;
  userName: string | null = null;

  constructor(private router: Router, private titleService: Title) {}

  ngOnInit() {
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
    this.updateTitle();
  }

  updateTitle() {
    const title = this.isAuthenticated ? `Bienvenido, ${this.userName}` : 'Bienvenido a la búsqueda de artistas';
    this.titleService.setTitle(title);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isAuthenticated = false;
    this.userName = null;
    this.updateTitle();
    this.router.navigate(['/login']);
  }

  perfil() {
    this.router.navigate(['/perfil']);
  }
}