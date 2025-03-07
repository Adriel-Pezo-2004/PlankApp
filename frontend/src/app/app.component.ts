import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink], // Importante incluir RouterLink
  template: `
    <header>
      <h1>Bienvenido a la búsqueda de artistas</h1>
      <nav>
        <a routerLink="/buscar-artistas">Buscar Artistas</a>
        <a routerLink="/register">Registrarse</a>
        <a routerLink="/login">Iniciar Sesión</a>
      </nav>
    </header>
    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent {}