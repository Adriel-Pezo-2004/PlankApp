import { Component, OnInit, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-musica-artistas',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  template: `
    <div class="main-container">
      <div *ngIf="loading" class="loading">Cargando...</div>
      <div *ngIf="error" class="error">{{ error }}</div>

      <div *ngIf="artist" class="artist-content">
        <div class="artist-header" [style.--artist-color]="generateDynamicColor(artist.name)">
          <img [src]="artist.images?.[0]?.url || 'assets/default-artist.png'" alt="Imagen del artista" class="artist-img">
          
          <button class="play-button">
            <svg viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"></path>
            </svg>
          </button>
          
          <h1 class="artist-name">{{ artist.name }}</h1>
        </div>

        <div class="main-content">
          <section *ngIf="albums.length" class="section-container">
            <h2>Álbumes de Estudio</h2>
            <div class="grid-container">
              <div *ngFor="let album of albums; let i = index" class="album-card" [class.visible]="isVisible[i]">
                <div class="album-content">
                  <img [src]="album.images?.[0]?.url || 'assets/default-album.png'" alt="Portada del álbum" class="album-img">
                  <div class="album-info">
                    <h3 class="album-title">{{ album.name }}</h3>
                    <div class="album-year">{{ album.release_date?.split('-')[0] }}</div>
                  </div>
                </div>
                <div class="tracks-container" [class.expanded]="album.expanded">
                  <ul>
                    <li *ngFor="let track of album.tracks">
                      <span class="track-number">{{ track.track_number }}</span>
                      <span class="track-name">{{ track.name }}</span>
                    </li>
                  </ul>
                </div>
                <div *ngIf="album.tracks?.length > 3" class="show-more toggle-bar" [class.expanded]="album.expanded" (click)="toggleTracks(album)">
                  <span class="toggle-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M7 10l5 5 5-5z" fill="currentColor"></path>
                    </svg>
                  </span>
                  {{ album.expanded ? 'Ver menos' : 'Ver más canciones...' }}
                </div>
              </div>
            </div>
          </section>

          <section *ngIf="singles.length" class="section-container">
            <h2>Sencillos y EP</h2>
            <div class="grid-container">
              <div *ngFor="let single of singles; let i = index" class="album-card" [class.visible]="isVisible[i + albums.length]">
                <div class="album-content">
                  <img [src]="single.images?.[0]?.url || 'assets/default-single.png'" alt="Portada del sencillo" class="album-img">
                  <div class="album-info">
                    <h3 class="album-title">{{ single.name }}</h3>
                    <div class="album-year">{{ single.release_date?.split('-')[0] }}</div>
                  </div>
                </div>
                <div class="tracks-container" [class.expanded]="single.expanded">
                  <ul>
                    <li *ngFor="let track of single.tracks">
                      <span class="track-number">{{ track.track_number }}</span>
                      <span class="track-name">{{ track.name }}</span>
                    </li>
                  </ul>
                </div>
                <div *ngIf="single.tracks?.length > 3" class="show-more toggle-bar" [class.expanded]="single.expanded" (click)="toggleTracks(single)">
                  <span class="toggle-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M7 10l5 5 5-5z" fill="currentColor"></path>
                    </svg>
                  </span>
                  {{ single.expanded ? 'Ver menos' : 'Ver más canciones...' }}
                </div>
              </div>
            </div>
          </section>

          <section *ngIf="appearances.length" class="section-container">
            <h2>Apariciones</h2>
            <div class="grid-container">
              <div *ngFor="let appear of appearances; let i = index" class="album-card" [class.visible]="isVisible[i + albums.length + singles.length]">
                <div class="album-content">
                  <img [src]="appear.images?.[0]?.url || 'assets/default-album.png'" alt="Portada del álbum" class="album-img">
                  <div class="album-info">
                    <h3 class="album-title">{{ appear.name }}</h3>
                    <div class="album-year">{{ appear.release_date?.split('-')[0] }}</div>
                  </div>
                </div>
                <div class="tracks-container" [class.expanded]="appear.expanded">
                  <ul>
                    <li *ngFor="let track of appear.tracks">
                      <span class="track-number">{{ track.track_number }}</span>
                      <span class="track-name">{{ track.name }}</span>
                    </li>
                  </ul>
                </div>
                <div *ngIf="appear.tracks?.length > 3" class="show-more toggle-bar" [class.expanded]="appear.expanded" (click)="toggleTracks(appear)">
                  <span class="toggle-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M7 10l5 5 5-5z" fill="currentColor"></path>
                    </svg>
                  </span>
                  {{ appear.expanded ? 'Ver menos' : 'Ver más canciones...' }}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./musica-artistas.component.scss']
})
export class MusicaArtistasComponent implements OnInit {
  artistId!: string;
  artist: any;
  albums: any[] = [];
  singles: any[] = [];
  appearances: any[] = [];
  loading = false;
  error = '';
  isVisible: boolean[] = [];
  private isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.artistId = params['id'];
      this.loadArtistData();
    });

    if (this.isBrowser) {
      setTimeout(() => {
        this.checkVisibility();
      }, 300);
    }
  }

  loadArtistData(): void {
    this.loading = true;
    this.http.get<any>(`http://localhost:3000/api/artista-detalle/${this.artistId}`)
      .subscribe({
        next: (data) => {
          this.artist = data.artist;
          this.albums = data.albums.map((album: any) => ({ ...album, expanded: false }));
          this.singles = data.singles.map((single: any) => ({ ...single, expanded: false }));
          this.appearances = data.appearances.map((appear: any) => ({ ...appear, expanded: false }));
          this.loading = false;
          this.isVisible = new Array(this.albums.length + this.singles.length + this.appearances.length).fill(false);
          if (this.isBrowser) {
            setTimeout(() => {
              this.checkVisibility();
            }, 300);
          }
        },
        error: (err) => {
          this.error = 'Error al cargar datos del artista';
          this.loading = false;
          console.error(err);
        }
      });
  }

  toggleTracks(item: any): void {
    item.expanded = !item.expanded;
  
    // Si se expande, hacer que todas las demás tarjetas bajen
    if (item.expanded) {
      setTimeout(() => {
        const card = document.querySelector('.album-card.expanded');
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }  

  @HostListener('window:scroll', ['$event'])
  @HostListener('window:resize', ['$event'])
  onEvent(): void {
    if (this.isBrowser) {
      this.checkVisibility();
    }
  }

  checkVisibility(): void {
    if (!this.isBrowser) return;

    const cards = document.querySelectorAll('.album-card');
    cards.forEach((card, index) => {
      if (index < this.isVisible.length) {
        const rect = card.getBoundingClientRect();
        const isVisible = rect.top <= window.innerHeight && rect.bottom >= 0;
        if (isVisible) {
          this.isVisible[index] = true;
        }
      }
    });
  }

  generateDynamicColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 35%)`;
  }
}