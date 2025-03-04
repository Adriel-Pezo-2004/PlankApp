import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-buscar-artistas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="buscador">
      <input [(ngModel)]="query" placeholder="Buscar artista" />
      <button (click)="buscarArtistas()" [disabled]="loading">Buscar</button>
    </div>
    <div *ngIf="loading">Cargando...</div>
    <div *ngIf="error" class="error">{{ error }}</div>
    <ul>
      <li *ngFor="let artista of artistas">
        <img [src]="artista.images[0]?.url" alt="Imagen del artista" width="50" height="50"/>
        {{ artista.name }}
      </li>
    </ul>
  `,
  styleUrls: ['./buscar-artistas.component.scss']
})
export class BuscarArtistasComponent {
  query: string = '';
  artistas: any[] = [];
  loading: boolean = false;
  error: string = '';

  constructor(private http: HttpClient) {}

  buscarArtistas(): void {
    if (!this.query.trim()) {
      this.error = 'Ingrese un nombre de artista';
      return;
    }

    this.loading = true;
    this.error = '';
    this.http.get<any>(`http://localhost:3000/api/buscar-artista?q=${this.query}`)
      .subscribe(
        (response) => {
          this.artistas = response;
          this.loading = false;
        },
        (error) => {
          this.error = 'Error al buscar artistas';
          this.loading = false;
        }
      );
  }
}
