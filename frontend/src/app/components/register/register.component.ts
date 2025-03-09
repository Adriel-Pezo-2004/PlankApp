import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, HttpClientModule, CommonModule], 
  template: `
    <div class="register-container">
      <header>
        <h2>Registro de Usuario</h2>
      </header>
      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="name">Nombre:</label>
          <input type="text" id="name" formControlName="name" required>
          <div *ngIf="registerForm.get('name')?.invalid && registerForm.get('name')?.touched" class="error-message">
            Nombre es requerido
          </div>
        </div>
        <div class="form-group">
          <label for="email">Correo Electrónico:</label>
          <input type="email" id="email" formControlName="email" required>
          <div *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched" class="error-message">
            <span *ngIf="registerForm.get('email')?.errors?.['required']">Correo electrónico es requerido</span>
            <span *ngIf="registerForm.get('email')?.errors?.['email']">Correo electrónico no válido</span>
          </div>
        </div>
        <div class="form-group">
          <label for="password">Contraseña:</label>
          <input type="password" id="password" formControlName="password" required>
          <div *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched" class="error-message">
            <span *ngIf="registerForm.get('password')?.errors?.['required']">Contraseña es requerida</span>
            <span *ngIf="registerForm.get('password')?.errors?.['minlength']">La contraseña debe tener al menos 6 caracteres</span>
          </div>
        </div>
        <button type="submit" [disabled]="registerForm.invalid || isLoading">
          {{ isLoading ? 'Registrando...' : 'Registrar' }}
        </button>
      </form>
      <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="success">{{ successMessage }}</div>
      <p class="login-link">¿Ya tienes una cuenta? <a routerLink="/login">Iniciar sesión</a></p>
    </div>
  `,
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder, 
    private http: HttpClient,
    private router: Router
  ) {
    this.registerForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;
      this.successMessage = null;
      
      const userData = {
        nombre: this.registerForm.value.name,
        correo: this.registerForm.value.email,
        contraseña: this.registerForm.value.password
      };
      
      this.http.post('http://localhost:3000/api/register', userData)
        .subscribe({
          next: (response: any) => {
            console.log('Usuario registrado:', response);
            this.successMessage = 'Registro exitoso. Redirigiendo al inicio de sesión...';
            this.isLoading = false;
            
            // Redirigir al usuario a la página de inicio de sesión después de un breve retraso
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          },
          error: (error) => {
            console.error('Error al registrar usuario:', error);
            this.isLoading = false;
            
            if (error.status === 400) {
              this.errorMessage = 'Por favor, complete todos los campos correctamente.';
            } else if (error.status === 409) {
              this.errorMessage = 'Este correo ya está registrado.';
            } else {
              this.errorMessage = 'Error al registrar usuario. Por favor, intente de nuevo.';
            }
          }
        });
    } else {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
    }
  }
}