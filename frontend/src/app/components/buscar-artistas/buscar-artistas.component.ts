import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-buscar-artistas',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
  <div class="buscar-container">
    <div class="buscador">
      <input [(ngModel)]="query" placeholder="Buscar artista" (keyup.enter)="buscarArtistas()" />
      <button (click)="buscarArtistas()" [disabled]="loading">Buscar</button>
    </div>

    <!-- Mensaje de carga -->
    <div *ngIf="loading">Cargando...</div>

    <!-- Mensaje de error -->
    <div *ngIf="error" class="error">{{ error }}</div>

    <!-- Coincidencia exacta -->
    <div *ngIf="exactMatch">
      <h2>Coincidencia Exacta</h2>
      <ul>
        <li (click)="verDetalleArtista(exactMatch.id)">
          <img *ngIf="exactMatch.images?.[0]?.url; else defaultImage" 
               [src]="exactMatch.images[0].url" 
               alt="Imagen del artista" 
               width="50" 
               height="50"/>
          <ng-template #defaultImage>
            <img src="assets/default-user.png" alt="Imagen por defecto" width="50" height="50"/>
          </ng-template>
          {{ exactMatch.name }}
        </li>
      </ul>
    </div>

    <!-- Sugerencias -->
    <div *ngIf="topResults.length">
      <h2>Resultados Similares</h2>
      <ul>
        <li *ngFor="let artista of topResults" 
            (click)="verDetalleArtista(artista.id)">
          <img *ngIf="artista.images?.[0]?.url; else defaultImage" 
               [src]="artista.images[0].url" 
               alt="Imagen del artista" 
               width="50" 
               height="50"/>
          <ng-template #defaultImage>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="4"></circle>
              <path d="M4 20c0-4 4-7 8-7s8 3 8 7"></path>
            </svg>
          </ng-template>
          {{ artista.name }}
        </li>
      </ul>
    </div>

    <!-- Mensaje si no se encuentra ningún artista, pero solo después de una búsqueda -->
    <div *ngIf="searchPerformed && !exactMatch && !topResults.length && !loading && !error">
      <h2>No se encontró ningún artista</h2>
    </div>
  </div>
  `,
  styleUrls: ['./buscar-artistas.component.scss']
})
export class BuscarArtistasComponent {
  query: string = '';
  exactMatch: any = null;
  topResults: any[] = [];
  loading: boolean = false;
  error: string = '';
  searchPerformed: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  verDetalleArtista(artistId: string): void {
    this.router.navigate(['/artista', artistId]);
  }

  buscarArtistas(): void {
    if (!this.query.trim()) {
      this.error = 'Ingrese un nombre de artista';
      return;
    }

    this.loading = true;
    this.error = '';
    this.exactMatch = null;
    this.topResults = [];
    this.searchPerformed = true;

    this.http.get<any>(`http://localhost:3000/api/buscar-artista?q=${this.query}`)
      .subscribe({
        next: (response) => {
          this.exactMatch = response.exactMatch;
          this.topResults = response.topResults;
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Error al buscar artistas';
          this.loading = false;
          console.error('Error en la búsqueda:', error);
        }
      });
  }
}