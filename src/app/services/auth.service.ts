import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000';
  private authState = new BehaviorSubject<boolean>(false);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);


  constructor(private http: HttpClient) {
    this.checkAuthState();
  }

  // Authentication methods
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((response: any) => {
        if (response.token) {
          sessionStorage.setItem('token', response.token);
          this.authState.next(true);
        }
      }),
      catchError(this.handleError)
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData).pipe(
      catchError(this.handleError)
    );
  }

  logout(): void {
    sessionStorage.removeItem('token');
    this.authState.next(false);
  }

  saveToken(token: string): void {
    sessionStorage.setItem('token', token);
    this.authState.next(true);
  }

  removeToken(): void {
    this.logout();
  }

  isAuthenticated(): boolean {
    return !!sessionStorage.getItem('token');
  }

  getAuthState(): Observable<boolean> {
    return this.authState.asObservable();
  }

  private checkAuthState() {
    const isAuth = this.isAuthenticated();
    this.authState.next(isAuth);
  }

  getProfile(): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/profile`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getDoctorProfile(): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/doctors/profile`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  updateDoctorProfile(data: any): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.put(`${this.apiUrl}/doctors/profile`, data, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Appointment methods
  getUserRendezVous(): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/rendezvous`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getDoctorAppointments(): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/doctor/rendezvous`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  createRendezVous(data: any): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/rendezvous`, data, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  updateRdvStatus(rdvId: string, status: string): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.put(`${this.apiUrl}/rendezvous/${rdvId}/status`, { status }, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  deleteRdv(rdvId: string): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.delete(`${this.apiUrl}/rendezvous/${rdvId}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  updateRdv(rdvId: string, data: { date: string; heure: string }): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.put(`${this.apiUrl}/rendezvous/${rdvId}`, data, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Calendar and availability methods
  getDoctorCalendar(doctorId: string, year: number, month: number): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/doctor_calendar/${doctorId}?year=${year}&month=${month}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getDoctorAvailability(doctorId: string, date: string): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/doctor_availability/${doctorId}?date=${date}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Availability methods
  getAvailabilities(): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/disponibilites`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  createAvailability(data: any): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/disponibilites`, data, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  deleteAvailability(data: { jour: string }): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.delete(`${this.apiUrl}/disponibilites`, { headers, body: data }).pipe(
      catchError(this.handleError)
    );
  }

  // Notification methods
  sendNotification(data: any): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/notifications`, data, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getNotifications(): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/notifications`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  updateNotificationReadStatus(notificationId: string, read: boolean): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.put(`${this.apiUrl}/notifications/${notificationId}`, { read }, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Document methods
  uploadDocument(formData: FormData): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/documents`, formData, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getPatientDocuments(): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/documents`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getDoctorPatientDocuments(): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/documents_patients`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  updateDocumentStatus(documentId: string, consulted: boolean): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.put(`${this.apiUrl}/documents/${documentId}/consulted`, { consulted }, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  annotateDocument(documentId: string, annotation: string): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/documents/${documentId}/annotate`, { annotation }, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  downloadDocument(fileId: string): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/documents/${fileId}/download`, { headers, responseType: 'blob' }).pipe(
      catchError(this.handleError)
    );
  }

  // Consultation methods
  getConsultations(): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/consultations`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getMedicalHistory(): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/historique`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  uploadConsultation(formData: FormData): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/consultations`, formData, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Messaging methods
  getConversations(): Observable<any[]> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get<any[]>(`${this.apiUrl}/messages/conversations`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  createConversation(doctorId: string): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/messages/conversations`, { doctorId }, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getMessages(conversationId: string): Observable<any[]> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get<any[]>(`${this.apiUrl}/messages/${conversationId}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  sendMessage(conversationId: string, content: string): Observable<any> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/messages/${conversationId}`, { content, type: 'text' }, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Doctor methods
  getDoctors(): Observable<any[]> {
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get<any[]>(`${this.apiUrl}/doctors`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => new Error(error.error?.message || 'Something went wrong; please try again later.'));
  }
  
}