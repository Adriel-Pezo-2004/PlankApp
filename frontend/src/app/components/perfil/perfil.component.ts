import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.services';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="container">
      <div class="perfil-container">
        <header>
          <h2>Perfil de Usuario</h2>
        </header>
        
        <!-- View Mode -->
        <div *ngIf="user && !isEditing && !isChangingPassword">
          <p><strong>Nombre:</strong> {{ user.nombre }}</p>
          <p><strong>Correo Electrónico:</strong> {{ user.correo }}</p>
          <p><strong>Fecha de Registro:</strong> {{ user.fecha_registro | date }}</p>
          
          <div class="button-group">
            <button (click)="toggleEdit()" class="edit-btn">Editar Perfil</button>
            <button (click)="togglePasswordChange()" class="password-btn">Cambiar Contraseña</button>
            <button (click)="goBack()" class="back-btn">Volver</button>
          </div>
        </div>
        
        <!-- Edit Mode -->
        <div *ngIf="user && isEditing" class="edit-form">
          <form (ngSubmit)="updateProfile()">
            <div class="form-group">
              <label for="nombre">Nombre:</label>
              <input 
                type="text" 
                id="nombre" 
                name="nombre" 
                [(ngModel)]="editForm.nombre" 
                required
              >
            </div>
            
            <div class="form-group">
              <label for="correo">Correo Electrónico:</label>
              <input 
                type="email" 
                id="correo" 
                name="correo" 
                [(ngModel)]="editForm.correo" 
                required
              >
            </div>
            
            <div class="form-message" *ngIf="message">{{ message }}</div>
            <div class="form-error" *ngIf="error">{{ error }}</div>
            
            <div class="button-group">
              <button type="submit" [disabled]="loading">
                {{ loading ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
              <button type="button" (click)="cancelEdit()" [disabled]="loading">Cancelar</button>
            </div>
          </form>
        </div>
        
        <!-- Password Change Mode -->
        <div *ngIf="user && isChangingPassword" class="edit-form">
          <form (ngSubmit)="changePassword()">
            <div class="form-group">
              <label for="currentPassword">Contraseña Actual:</label>
              <input 
                type="password" 
                id="currentPassword" 
                name="currentPassword" 
                [(ngModel)]="passwordForm.currentPassword" 
                required
              >
            </div>
            
            <div class="form-group">
              <label for="newPassword">Nueva Contraseña:</label>
              <input 
                type="password" 
                id="newPassword" 
                name="newPassword" 
                [(ngModel)]="passwordForm.newPassword" 
                required
              >
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">Confirmar Contraseña:</label>
              <input 
                type="password" 
                id="confirmPassword" 
                name="confirmPassword" 
                [(ngModel)]="passwordForm.confirmPassword" 
                required
              >
            </div>
            
            <div class="form-message" *ngIf="message">{{ message }}</div>
            <div class="form-error" *ngIf="error">{{ error }}</div>
            
            <div class="button-group">
              <button type="submit" [disabled]="loading">
                {{ loading ? 'Guardando...' : 'Cambiar Contraseña' }}
              </button>
              <button type="button" (click)="cancelPasswordChange()" [disabled]="loading">Cancelar</button>
            </div>
          </form>
        </div>
        
        <div *ngIf="!user">
          <p>No se encontró información del usuario.</p>
          <button (click)="goBack()">Volver</button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit {
  user: any;
  isEditing = false;
  isChangingPassword = false;
  loading = false;
  message = '';
  error = '';
  
  editForm = {
    nombre: '',
    correo: ''
  };
  
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  constructor(
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    if (typeof window !== 'undefined' && localStorage) {
      const user = localStorage.getItem('user');
      if (user) {
        this.user = JSON.parse(user);
        // Initialize form with current values
        this.editForm.nombre = this.user.nombre;
        this.editForm.correo = this.user.correo;
      } else {
        this.user = null;
      }
    } else {
      this.user = null;
    }
  }

  toggleEdit() {
    this.isEditing = true;
    this.isChangingPassword = false;
    this.clearMessages();
  }

  cancelEdit() {
    this.isEditing = false;
    // Reset form values
    this.editForm.nombre = this.user.nombre;
    this.editForm.correo = this.user.correo;
    this.clearMessages();
  }

  togglePasswordChange() {
    this.isChangingPassword = true;
    this.isEditing = false;
    this.clearMessages();
    // Reset password form
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  }

  cancelPasswordChange() {
    this.isChangingPassword = false;
    this.clearMessages();
  }

  clearMessages() {
    this.message = '';
    this.error = '';
  }

  updateProfile() {
    this.clearMessages();
    this.loading = true;
    
    // Check if any changes were made
    if (this.editForm.nombre === this.user.nombre && this.editForm.correo === this.user.correo) {
      this.error = 'No se han realizado cambios';
      this.loading = false;
      return;
    }
    
    this.userService.updateProfile(this.user.id, {
      nombre: this.editForm.nombre,
      correo: this.editForm.correo
    }).subscribe({
      next: (response) => {
        this.user = response.user;
        this.message = 'Perfil actualizado correctamente';
        this.loading = false;
        this.isEditing = false;
      },
      error: (err) => {
        this.error = err.error.error || 'Error al actualizar el perfil';
        this.loading = false;
      }
    });
  }

  changePassword() {
    this.clearMessages();
    this.loading = true;
    
    // Validate passwords match
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      this.loading = false;
      return;
    }
    
    // Validate password strength (optional)
    if (this.passwordForm.newPassword.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      this.loading = false;
      return;
    }
    
    this.userService.changePassword(
      this.user.id,
      this.passwordForm.currentPassword,
      this.passwordForm.newPassword
    ).subscribe({
      next: (response) => {
        this.message = 'Contraseña actualizada correctamente';
        this.loading = false;
        this.isChangingPassword = false;
        // Reset form
        this.passwordForm = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
      },
      error: (err) => {
        this.error = err.error.error || 'Error al cambiar la contraseña';
        this.loading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/buscar-artistas']);
  }
}