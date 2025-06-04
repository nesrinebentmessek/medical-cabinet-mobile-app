import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone:false
})
export class HomePage implements OnInit {
  searchTerm: string = '';
  doctors: any[] = [];
  filteredDoctors: any[] = [];
  isLoading: boolean = false;
  isLoaded: boolean = false;
  public hasMoreData: boolean = true;

  private currentPage: number = 1;
  private readonly pageSize: number = 10;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadInitialDoctors();
  }

  onScroll(event: any) {
    const bottom = event.detail.scrollHeight === event.detail.scrollTop + event.detail.clientHeight;
    if (bottom && !this.isLoading && this.hasMoreData) {
      this.isLoading = true;
      this.loadMoreDoctors();
    }
  }

  loadInitialDoctors() {
    this.isLoading = true;
    this.http.get<any[]>(`http://localhost:5000/doctors?page=1&limit=${this.pageSize}`).subscribe({
      next: (data) => this.handleDoctorData(data),
      error: (error) => this.handleError(error)
    });
  }

  loadMoreDoctors() {
    if (!this.hasMoreData) return;

    this.isLoading = true;
    this.currentPage++;
    this.http.get<any[]>(`http://localhost:5000/doctors?page=${this.currentPage}&limit=${this.pageSize}`).subscribe({
      next: (newDoctors) => this.handleNewDoctors(newDoctors),
      error: (error) => this.handleLoadMoreError(error)
    });
  }

  private handleDoctorData(data: any[]) {
    this.doctors = data;
    this.filteredDoctors = [...data];
    this.hasMoreData = data.length === this.pageSize;
    this.isLoading = false;
    this.isLoaded = true;
  }

  private handleNewDoctors(newDoctors: any[]) {
    if (newDoctors.length < this.pageSize) {
      this.hasMoreData = false;
    }
    this.doctors = [...this.doctors, ...newDoctors];
    this.filteredDoctors = [...this.filteredDoctors, ...newDoctors];
    this.isLoading = false;
  }

  private handleError(error: any) {
    console.error('Erreur de chargement initial :', error);
    this.isLoading = false;
  }

  private handleLoadMoreError(error: any) {
    console.error('Erreur de chargement supplémentaire :', error);
    this.currentPage--;
    this.isLoading = false;
  }

  filterDoctors() {
    if (!this.searchTerm) {
      this.filteredDoctors = [...this.doctors];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredDoctors = this.doctors.filter(doctor => this.doctorMatchesSearch(doctor, term));
  }

  private doctorMatchesSearch(doctor: any, term: string): boolean {
    return (
      (doctor.nom && doctor.nom.toLowerCase().includes(term)) ||
      (doctor.specialite && doctor.specialite.toLowerCase().includes(term))
    );
  }

  resetSearch() {
    this.searchTerm = '';
    this.filterDoctors();
  }

  openRendezVous(doctor: any) {
    this.router.navigate(['/rendez-vous'], {
      state: { doctor }
    });
  }
}
