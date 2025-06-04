import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-doctor-profile',
  templateUrl: './doctor-profile.page.html',
  styleUrls: ['./doctor-profile.page.scss'],
  standalone: false
})
export class DoctorProfilePage implements OnInit {
  doctor: any = {
    nom: '',
    email: '',
    specialite: '',
    description: '',
    image: '',
    user_id: '',
    disponibilites: []
  };

  newAvailability: any = {
    day: '',
    startTime: '',
    endTime: ''
  };

  appointments: any[] = [];
  consultations: any[] = [];
  newConsultation = {
    appointmentId: '',
    patientId: '',
    patientName: '',
    date: '',
    diagnostic: '',
    prescription: '',
    consultationType: 'in_person'
  };
  files: File[] = [];

  constructor(
    private authService: AuthService,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDoctorProfile();
    this.loadAppointments();
    this.loadConsultations();
  }

  async loadDoctorProfile() {
    try {
      const doctorData = await this.authService.getDoctorProfile().toPromise();
      const availabilities = await this.authService.getAvailabilities().toPromise();
      this.doctor = {
        nom: doctorData.nom || '',
        email: doctorData.email || '',
        specialite: doctorData.specialite || '',
        description: doctorData.description || '',
        image: doctorData.image || '',
        user_id: doctorData.user_id || '',
        disponibilites: availabilities.map((slot: any) => ({
          id: slot.id,
          day: slot.jour,
          startTime: slot.heure.split('-')[0],
          endTime: slot.heure.split('-')[1]
        }))
      };
    } catch (error) {
      console.error('Error loading doctor profile:', error);
      this.presentToast('Erreur lors du chargement du profil');
    }
  }

  async loadAppointments() {
    try {
      const data = await this.authService.getDoctorAppointments().toPromise();
      // Filter for confirmed appointments without a consultation
      this.appointments = data.filter((appt: any) => {
        const hasConsultation = this.consultations.some(
          (consult) => consult.appointmentId === appt._id
        );
        return appt.status === 'confirmed' && !hasConsultation;
      });
    } catch (error) {
      console.error('Erreur lors du chargement des rendez-vous:', error);
      this.presentToast('Erreur lors du chargement des rendez-vous');
    }
  }

  async loadConsultations() {
    try {
      const data = await this.authService.getConsultations().toPromise();
      this.consultations = data;
      // Reload appointments to update the list of available appointments
      await this.loadAppointments();
    } catch (error) {
      console.error('Erreur lors du chargement des consultations:', error);
      this.presentToast('Erreur lors du chargement des consultations');
    }
  }

  async updateProfile() {
    try {
      const updatedData = {
        nom: this.doctor.nom,
        email: this.doctor.email,
        specialite: this.doctor.specialite,
        description: this.doctor.description,
        image: this.doctor.image
      };
      await this.authService.updateDoctorProfile(updatedData).toPromise();
      this.presentToast('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error updating profile:', error);
      this.presentToast('Erreur lors de la mise à jour du profil');
    }
  }

  async addAvailability() {
    if (this.newAvailability.day && this.newAvailability.startTime && this.newAvailability.endTime) {
      // Validate time slots within allowed ranges (08:00–12:00 or 13:00–18:00)
      const startHour = parseInt(this.newAvailability.startTime.split(':')[0]);
      const endHour = parseInt(this.newAvailability.endTime.split(':')[0]);
      const isMorningValid = startHour >= 8 && endHour <= 12;
      const isAfternoonValid = startHour >= 13 && endHour <= 18;

      if (!(isMorningValid || isAfternoonValid)) {
        this.presentToast('Les horaires doivent être entre 08:00–12:00 ou 13:00–18:00');
        return;
      }

      // Check for overlapping slots on the same day
      const overlapping = this.doctor.disponibilites.some((slot: any) =>
        slot.day === this.newAvailability.day &&
        (
          (this.newAvailability.startTime >= slot.startTime && this.newAvailability.startTime < slot.endTime) ||
          (this.newAvailability.endTime > slot.startTime && this.newAvailability.endTime <= slot.endTime) ||
          (this.newAvailability.startTime <= slot.startTime && this.newAvailability.endTime >= slot.endTime)
        )
      );

      if (overlapping) {
        this.presentToast('Les créneaux horaires se chevauchent pour ce jour');
        return;
      }

      try {
        const availabilityData = {
          jour: this.newAvailability.day,
          heure: `${this.newAvailability.startTime}-${this.newAvailability.endTime}`
        };
        await this.authService.createAvailability(availabilityData).toPromise();
        const newSlot = {
          id: `${this.doctor.user_id}_${this.newAvailability.day}`,
          day: this.newAvailability.day,
          startTime: this.newAvailability.startTime,
          endTime: this.newAvailability.endTime
        };
        this.doctor.disponibilites.push(newSlot);
        this.presentToast('Disponibilité ajoutée avec succès');
        this.newAvailability = { day: '', startTime: '', endTime: '' };
      } catch (error) {
        console.error('Error adding availability:', error);
        this.presentToast('Erreur lors de l’ajout de la disponibilité');
      }
    } else {
      this.presentToast('Veuillez remplir tous les champs');
    }
  }

  async removeAvailability(index: number, slot: any) {
    try {
      await this.authService.deleteAvailability({ jour: slot.day }).toPromise();
      this.doctor.disponibilites.splice(index, 1);
      this.presentToast('Disponibilité supprimée avec succès');
    } catch (error) {
      console.error('Error removing availability:', error);
      this.presentToast('Erreur lors de la suppression de la disponibilité');
    }
  }

  onFileChange(event: any) {
    this.files = Array.from(event.target.files);
  }

  onAppointmentChange(event: any) {
    const appointmentId = event.detail.value;
    const selectedAppointment = this.appointments.find((appt) => appt._id === appointmentId);
    if (selectedAppointment) {
      this.newConsultation.patientId = selectedAppointment.patientId;
      this.newConsultation.patientName = selectedAppointment.patientName;
      this.newConsultation.date = selectedAppointment.date;
    } else {
      this.newConsultation.patientId = '';
      this.newConsultation.patientName = '';
      this.newConsultation.date = '';
    }
  }

  async addConsultation() {
    if (
      !this.newConsultation.appointmentId ||
      !this.newConsultation.diagnostic ||
      !this.newConsultation.prescription ||
      !this.newConsultation.consultationType
    ) {
      this.presentToast('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('appointmentId', this.newConsultation.appointmentId);
      formData.append('patientId', this.newConsultation.patientId);
      formData.append('patientName', this.newConsultation.patientName);
      formData.append('date', this.newConsultation.date);
      formData.append('diagnostic', this.newConsultation.diagnostic);
      formData.append('prescription', this.newConsultation.prescription);
      formData.append('consultationType', this.newConsultation.consultationType);
      this.files.forEach((file) => formData.append('documents', file));

      await this.authService.uploadConsultation(formData).toPromise();
      this.presentToast('Consultation enregistrée avec succès');
      this.loadConsultations();
      this.newConsultation = {
        appointmentId: '',
        patientId: '',
        patientName: '',
        date: '',
        diagnostic: '',
        prescription: '',
        consultationType: 'in_person'
      };
      this.files = [];
    } catch (error) {
      console.error('Erreur lors de l’enregistrement de la consultation:', error);
      this.presentToast('Erreur lors de l’enregistrement de la consultation');
    }
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}