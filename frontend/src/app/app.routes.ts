import { Routes } from '@angular/router';
import { BuscarArtistasComponent } from './components/buscar-artistas/buscar-artistas.component';
import { MusicaArtistasComponent } from './components/musica-artistas/musica-artistas.component';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { PerfilComponent } from './components/perfil/perfil.component';

export const routes: Routes = [
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'artista/:id', component: MusicaArtistasComponent },
  { path: 'buscar-artistas', component: BuscarArtistasComponent },
  { path: 'perfil', component: PerfilComponent },
  { path: '**', redirectTo: 'buscar-artistas' } // Ruta por defecto
];
