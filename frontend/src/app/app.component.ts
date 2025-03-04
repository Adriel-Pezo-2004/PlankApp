import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], // Solo necesitas esto
  template: `
    <h1>Bienvenido a la búsqueda de artistas</h1>
    <nav>
      <a routerLink="/buscar-artistas">Buscar Artistas</a>
    </nav>
    <router-outlet></router-outlet>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent {}
