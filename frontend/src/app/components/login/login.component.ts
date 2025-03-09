import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, HttpClientModule, CommonModule],
  template: `
    <div class="login-container">
      <header>
        <h2>Iniciar Sesión</h2>
      </header>
      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="email">Correo Electrónico:</label>
          <input type="email" id="email" formControlName="email" required>
          <div *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched" class="error-message">
            <span *ngIf="loginForm.get('email')?.errors?.['required']">Correo electrónico es requerido</span>
            <span *ngIf="loginForm.get('email')?.errors?.['email']">Correo electrónico no válido</span>
          </div>
        </div>
        <div class="form-group">
          <label for="password">Contraseña:</label>
          <input type="password" id="password" formControlName="password" required>
          <div *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" class="error-message">
            <span *ngIf="loginForm.get('password')?.errors?.['required']">Contraseña es requerida</span>
            <span *ngIf="loginForm.get('password')?.errors?.['minlength']">La contraseña debe tener al menos 6 caracteres</span>
          </div>
        </div>
        <button type="submit" [disabled]="loginForm.invalid || isLoading">
          {{ isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
        </button>
      </form>
      <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>
      <p class="register-link">¿No tienes una cuenta? <a routerLink="/register">Regístrate</a></p>
    </div>
  `,
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;

  constructor(private formBuilder: FormBuilder, private http: HttpClient, private router: Router) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;
      
      const { email, password } = this.loginForm.value;
      console.log('Datos enviados:', { email, password });
      
      this.http.post('http://localhost:3000/api/login', { 
        correo: email, 
        contraseña: password 
      }).subscribe({
        next: (response: any) => {
          console.log('Login exitoso:', response);
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.errorMessage = null;
          this.isLoading = false;
          
          this.router.navigate(['/buscar-artistas']).then(() => {
            window.location.reload();
          });
        },
        error: (error) => {
          console.error('Error al iniciar sesión:', error);
          this.isLoading = false;
          
          if (error.status === 401) {
            this.errorMessage = 'Correo o contraseña incorrectos';
          } else {
            this.errorMessage = 'Error al iniciar sesión. Por favor, intente de nuevo.';
          }
        }
      });
    } else {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.loginForm.controls).forEach(key => {
        const control = this.loginForm.get(key);
        control?.markAsTouched();
      });
    }
  }
}