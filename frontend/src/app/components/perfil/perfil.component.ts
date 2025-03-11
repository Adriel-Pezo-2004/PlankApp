import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <div class="perfil-container">
        <header>
          <h2>Perfil de Usuario</h2>
        </header>
        <div *ngIf="user">
          <p><strong>Nombre:</strong> {{ user.nombre }}</p>
          <p><strong>Correo Electrónico:</strong> {{ user.correo }}</p>
          <p><strong>Fecha de Registro:</strong> {{ user.fecha_registro | date }}</p>
        </div>
        <div *ngIf="!user">
          <p>No se encontró información del usuario.</p>
        </div>
        <button (click)="goBack()">Volver</button>
      </div>
    </div>
  `,
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit {
  user: any;

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    if (typeof window !== 'undefined' && localStorage) {
      const user = localStorage.getItem('user');
      if (user) {
        this.user = JSON.parse(user);
      } else {
        this.user = null;
      }
    } else {
      this.user = null;
    }
  }

  goBack() {
    this.router.navigate(['/buscar-artistas']);
  }
}