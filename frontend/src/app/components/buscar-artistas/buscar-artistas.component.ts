import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-buscar-artistas',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="buscador">
      <input [(ngModel)]="query" placeholder="Buscar artista" />
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
        <li>
          <img [src]="exactMatch.images?.[0]?.url" alt="Imagen del artista" width="50" height="50"/>
          {{ exactMatch.name }}
        </li>
      </ul>
    </div>

    <!-- Sugerencias (si no hay coincidencia exacta) -->
    <div *ngIf="topResults.length">
      <h2>Resultados Similares</h2>
      <ul>
        <li *ngFor="let artista of topResults">
          <img [src]="artista.images?.[0]?.url" alt="Imagen del artista" width="50" height="50"/>
          {{ artista.name }}
        </li>
      </ul>
    </div>

    <!-- Mensaje si no se encuentra ningún artista, pero solo después de una búsqueda -->
    <div *ngIf="searchPerformed && !exactMatch && !topResults.length && !loading && !error">
      <h2>No se encontró ningún artista</h2>
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

  constructor(private http: HttpClient) {}

  buscarArtistas(): void {
    if (!this.query.trim()) {
      this.error = 'Ingrese un nombre de artista';
      return;
    }

    // Reiniciar estados
    this.loading = true;
    this.error = '';
    this.exactMatch = null;
    this.topResults = [];
    this.searchPerformed = true; // Se ha iniciado una búsqueda

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