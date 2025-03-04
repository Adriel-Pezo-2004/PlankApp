import { Routes } from '@angular/router';
import { BuscarArtistasComponent } from './components/buscar-artistas/buscar-artistas.component';

export const routes: Routes = [
  { path: 'buscar-artistas', component: BuscarArtistasComponent },
  { path: '**', redirectTo: 'buscar-artistas' } // Ruta por defecto
];
