import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], // Solo necesitas esto
  template: `
    <header>
      <h1>Bienvenido a la búsqueda de artistas</h1>
      <nav>
        <a routerLink="/buscar-artistas">Buscar Artistas</a>
      </nav>
    </header>
    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent {}