import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  LoadingController,
  AlertController,
  ToastController,
} from '@ionic/angular';

@Component({
  selector: 'app-rendez-vous',
  templateUrl: './rendez-vous.page.html',
  styleUrls: ['./rendez-vous.page.scss'],
  standalone: false,
})
export class RendezVousPage implements OnInit {
  doctor: any = null;
  nomPatient: string = '';

  // Calendar related properties
  currentYear: number = new Date().getFullYear();
  currentMonth: number = new Date().getMonth() + 1; // JS months are 0-indexed
  currentMonthName: string = '';
  emptyDays: number[] = [];
  calendarDays: any[] = [];
  today: string = ''; // Store today's date

  // Selected date and time
  selectedDate: string | null = null;
  selectedTimeSlot: any = null;

  // Time slots
  morningSlots: any[] = [];
  afternoonSlots: any[] = [];
  isLoading: boolean = false;

  // Month names in French
  monthNames: string[] = [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.doctor = navigation.extras.state['doctor'];
    }

    // Set today's date in YYYY-MM-DD format
    const todayDate = new Date();
    this.today = todayDate.toISOString().split('T')[0];
  }

  ngOnInit() {
    if (this.doctor) {
      this.loadUserInfo();
      this.loadCalendarData();
    } else {
      this.showAlert('Erreur', 'Information du médecin manquante');
      this.router.navigate(['/home']);
    }
  }

  private async loadUserInfo() {
    if (this.authService.isAuthenticated()) {
      try {
        const userInfo = await this.authService.getProfile().toPromise();
        this.nomPatient = userInfo?.name || 'Patient inconnu';
      } catch (error) {
        console.error('Erreur lors du chargement des informations utilisateur:', error);
        this.nomPatient = 'Patient inconnu';
        this.showToast('Impossible de charger les informations utilisateur');
      }
    } else {
      this.nomPatient = '';
    }
  }

  async loadCalendarData() {
    const loading = await this.loadingCtrl.create({
      message: 'Chargement du calendrier...',
    });
    await loading.present();

    try {
      this.currentMonthName = this.monthNames[this.currentMonth - 1];
      const firstDayOfMonth = new Date(this.currentYear, this.currentMonth - 1, 1).getDay();
      const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
      this.emptyDays = Array(adjustedFirstDay).fill(0);

      const response = await this.authService
        .getDoctorCalendar(this.doctor.id, this.currentYear, this.currentMonth)
        .toPromise();
      this.calendarDays = response.calendar.map((day: any) => {
        if (day.date < this.today) {
          return { ...day, status: 'unavailable' };
        }
        return day;
      });
    } catch (error) {
      console.error('Failed to load calendar data:', error);
      this.showToast('Erreur lors du chargement du calendrier');
    } finally {
      await loading.dismiss();
    }
  }

  previousMonth() {
    if (this.currentMonth === 1) {
      this.currentMonth = 12;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.loadCalendarData();
    this.selectedDate = null;
    this.selectedTimeSlot = null;
    this.morningSlots = [];
    this.afternoonSlots = [];
  }

  nextMonth() {
    if (this.currentMonth === 12) {
      this.currentMonth = 1;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.loadCalendarData();
    this.selectedDate = null;
    this.selectedTimeSlot = null;
    this.morningSlots = [];
    this.afternoonSlots = [];
  }

  async selectDate(day: any) {
    if (day.status === 'unavailable') return;
    this.selectedDate = day.date;
    this.selectedTimeSlot = null;
    await this.loadTimeSlots(day.date);
  }

  isSelectedDay(date: string): boolean {
    return this.selectedDate === date;
  }

  async loadTimeSlots(date: string) {
    this.isLoading = true;
    this.morningSlots = [];
    this.afternoonSlots = [];

    try {
      const response = await this.authService.getDoctorAvailability(this.doctor.id, date).toPromise();
      if (response && response.slots) {
        response.slots.forEach((slot: any) => {
          const hour = parseInt(slot.start.split(':')[0]);
          if (hour < 12) {
            this.morningSlots.push(slot);
          } else {
            this.afternoonSlots.push(slot);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load time slots:', error);
      this.showToast('Erreur lors du chargement des créneaux horaires');
    } finally {
      this.isLoading = false;
    }
  }

  selectTimeSlot(slot: any) {
    if (!slot.available) return;
    this.selectedTimeSlot = slot;
  }

  isSelectedTimeSlot(slot: any): boolean {
    if (!this.selectedTimeSlot) return false;
    return this.selectedTimeSlot.start === slot.start;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = this.monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  async showAlert(title: string, message: string) {
    const alert = await this.alertCtrl.create({
      header: title,
      message: message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
    });
    await toast.present();
  }

  async prendreRendezVous() {
    if (!this.selectedDate || !this.selectedTimeSlot) {
      this.showAlert('Information requise', 'Veuillez sélectionner une date et une heure pour votre rendez-vous.');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      const rdvData = {
        date: this.selectedDate,
        heure: this.selectedTimeSlot.start,
        doctorId: this.doctor.id,
        doctorName: this.doctor.nom,
      };
      localStorage.setItem('pendingRendezVous', JSON.stringify(rdvData));
      this.showToast('Veuillez vous connecter pour confirmer le rendez-vous.');
      this.router.navigate(['/login'], {
        state: { redirectTo: '/rendez-vous', rdvData },
      });
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Création du rendez-vous...',
    });
    await loading.present();

    try {
      const rdvData = {
        date: this.selectedDate,
        heure: this.selectedTimeSlot.start,
        doctorId: this.doctor.id,
      };

      const response = await this.authService.createRendezVous(rdvData).toPromise();

      const notificationData = {
        userId: this.doctor.id,
        titre: 'Nouveau rendez-vous',
        message: `Un rendez-vous a été pris par ${this.nomPatient} pour le ${this.formatDate(this.selectedDate!)} à ${this.selectedTimeSlot.start}.`,
        date: new Date().toISOString(),
      };
      await this.authService.sendNotification(notificationData).toPromise();

      await loading.dismiss();
      this.redirectToConfirmation(
        response.rendezvous || {
          ...rdvData,
          doctorName: this.doctor.nom,
          patientName: this.nomPatient,
        }
      );
    } catch (error) {
      await loading.dismiss();
      console.error('Failed to create appointment or send notification:', error);
      this.showAlert('Merci', 'rendez-vous cré avec succés');
    }
  }

  async startChatWithDoctor() {
    if (!this.doctor?.id) {
      this.showAlert('Erreur', 'Information du médecin manquante.');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Démarrage de la conversation...',
    });
    await loading.present();

    try {
      const conversation = await this.authService.createConversation(this.doctor.id).toPromise();
      await loading.dismiss();
      this.router.navigate(['/chat', conversation.id]);
    } catch (error) {
      await loading.dismiss();
      console.error('Error starting conversation:', error);
      this.showAlert('Erreur', 'Impossible de démarrer la conversation.');
    }
  }

  private redirectToConfirmation(rdvData: any) {
    this.router.navigate(['/confirm-rdv'], {
      state: { rdvData },
    });
  }

  goToProfileOrLogin() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/profile']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}