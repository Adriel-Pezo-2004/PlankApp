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
        <div>
          <label for="email">Correo Electrónico:</label>
          <input type="email" id="email" formControlName="email" required>
        </div>
        <div>
          <label for="password">Contraseña:</label>
          <input type="password" id="password" formControlName="password" required>
        </div>
        <button type="submit">Iniciar Sesión</button>
      </form>
      <p *ngIf="errorMessage" class="error">{{ errorMessage }}</p>
    </div>
  `,
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string | null = null;

  constructor(private formBuilder: FormBuilder, private http: HttpClient, private router: Router) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      console.log('Datos enviados:', { email, password }); // Log para verificar los datos enviados
      this.http.post('http://localhost:3000/api/login', { correo: email, contraseña: password }).subscribe({
        next: (response: any) => {
          console.log('Login successful:', response);
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.errorMessage = null;
          this.router.navigate(['/buscar-artistas']).then(() => {
            window.location.reload();
          });
        },
        error: (error) => {
          console.error('Error logging in:', error);
          this.errorMessage = 'Error logging in';
        }
      });
    }
  }
}