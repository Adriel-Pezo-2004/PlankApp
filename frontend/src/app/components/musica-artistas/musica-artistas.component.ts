import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-musica-artistas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container">
      <div *ngIf="loading" class="loading">Cargando...</div>
      <div *ngIf="error" class="error">{{ error }}</div>

      <div *ngIf="artist">
        <h1>{{ artist.name }}</h1>
        <img [src]="artist.images?.[0]?.url" alt="Imagen del artista" class="artist-img">

        <section *ngIf="albums.length">
          <h2>Álbumes de Estudio</h2>
          <div *ngFor="let album of albums" class="album-card">
            <h3>{{ album.name }} ({{ album.release_date?.split('-')[0] }})</h3>
            <ul>
              <li *ngFor="let track of album.tracks">
                {{ track.track_number }}. {{ track.name }}
              </li>
            </ul>
          </div>
        </section>

        <section *ngIf="singles.length">
          <h2>Sencillos y EP</h2>
          <div *ngFor="let single of singles" class="album-card">
            <h3>{{ single.name }} ({{ single.release_date?.split('-')[0] }})</h3>
            <ul>
              <li *ngFor="let track of single.tracks">
                {{ track.track_number }}. {{ track.name }}
              </li>
            </ul>
          </div>
        </section>

        <section *ngIf="appearances.length">
          <h2>Apariciones</h2>
          <div *ngFor="let appear of appearances" class="album-card">
            <h3>{{ appear.name }} ({{ appear.release_date?.split('-')[0] }})</h3>
            <ul>
              <li *ngFor="let track of appear.tracks">
                {{ track.track_number }}. {{ track.name }}
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .container { padding: 20px; max-width: 800px; margin: 0 auto; }
    .artist-img { max-width: 200px; border-radius: 50%; margin: 20px 0; }
    .album-card { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .loading, .error { padding: 20px; text-align: center; }
    h2 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
    ul { list-style: none; padding: 0; }
    li { padding: 5px 0; }
  `]
})
export class MusicaArtistasComponent implements OnInit {
  artistId!: string;
  artist: any;
  albums: any[] = [];
  singles: any[] = [];
  appearances: any[] = [];
  loading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.artistId = params['id'];
      this.loadArtistData();
    });
  }

  loadArtistData(): void {
    this.loading = true;
    this.http.get<any>(`http://localhost:3000/api/artista-detalle/${this.artistId}`)
      .subscribe({
        next: (data) => {
          this.artist = data.artist;
          this.albums = data.albums;
          this.singles = data.singles;
          this.appearances = data.appearances;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar datos del artista';
          this.loading = false;
          console.error(err);
        }
      });
  }
}