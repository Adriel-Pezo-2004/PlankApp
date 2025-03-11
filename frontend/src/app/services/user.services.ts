import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// Define interface for user data
interface User {
  id: number;
  nombre: string;
  correo: string;
  fecha_registro?: string;
}

// Define interface for profile update response
interface ProfileUpdateResponse {
  message: string;
  user: User;
  token: string;
}

// Define interface for password change response
interface PasswordChangeResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api'; // Adjust this to match your API URL

  constructor(private http: HttpClient) { }

  // Get authorization headers
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Update user profile
  updateProfile(userId: number, userData: { nombre?: string, correo?: string }): Observable<ProfileUpdateResponse> {
    return this.http.put<ProfileUpdateResponse>(
      `${this.apiUrl}/update-profile`, 
      { id: userId, ...userData },
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        // Update local storage with new user info and token
        if (response.user && response.token) {
          localStorage.setItem('user', JSON.stringify(response.user));
          localStorage.setItem('token', response.token);
        }
      })
    );
  }

  // Change password
  changePassword(userId: number, contraseñaActual: string, nuevaContraseña: string): Observable<PasswordChangeResponse> {
    return this.http.put<PasswordChangeResponse>(
      `${this.apiUrl}/change-password`,
      { id: userId, contraseñaActual, nuevaContraseña },
      { headers: this.getHeaders() }
    );
  }
}