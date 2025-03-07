import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, HttpClientModule, CommonModule], 
  template: `
    <header>
      <h2>Registro de Usuario</h2>
    </header>
    <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
      <div>
        <label for="name">Nombre:</label>
        <input type="text" id="name" formControlName="name" required>
      </div>
      <div>
        <label for="email">Correo Electrónico:</label>
        <input type="email" id="email" formControlName="email" required>
      </div>
      <div>
        <label for="password">Contraseña:</label>
        <input type="password" id="password" formControlName="password" required>
      </div>
      <button type="submit">Registrar</button>
    </form>
    <p *ngIf="errorMessage">{{ errorMessage }}</p>
  `,
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage: string | null = null;

  constructor(private formBuilder: FormBuilder, private http: HttpClient) {
    this.registerForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const userData = {
        nombre: this.registerForm.value.name,
        correo: this.registerForm.value.email,
        contraseña: this.registerForm.value.password
      };
      this.http.post('http://localhost:3000/api/register', userData).subscribe({
        next: (response) => {
          console.log('User registered:', response);
          this.errorMessage = null;
        },
        error: (error) => {
          console.error('Error registering user:', error);
          this.errorMessage = 'Error registering user';
        }
      });
    }
  }
}