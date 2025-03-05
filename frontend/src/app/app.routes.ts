import { Routes } from '@angular/router';
import { BuscarArtistasComponent } from './components/buscar-artistas/buscar-artistas.component';
import { MusicaArtistasComponent } from './components/musica-artistas/musica-artistas.component';

export const routes: Routes = [
  { path: 'artista/:id', component: MusicaArtistasComponent },
  { path: 'buscar-artistas', component: BuscarArtistasComponent },
  { path: '**', redirectTo: 'buscar-artistas' } // Ruta por defecto
];
