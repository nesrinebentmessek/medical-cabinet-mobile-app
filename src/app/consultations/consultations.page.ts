import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-consultations',
  templateUrl: './consultations.page.html',
  styleUrls: ['./consultations.page.scss'],
  standalone:false
})
export class ConsultationsPage implements OnInit {
  appointments: any[] = [];  // Add this property
  consultations: any[] = [];
  newConsultation = {
    appointmentId: '',  // Add this missing property
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
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadAppointments();
    this.loadConsultations();
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
      console.error('Error loading appointments:', error);
      this.presentToast('Error loading appointments');
    }
  }

  async loadConsultations() {
    try {
      const data = await this.authService.getConsultations().toPromise();
      this.consultations = data;
      // Reload appointments to update the list
      await this.loadAppointments();
    } catch (error) {
      console.error('Error loading consultations:', error);
      this.presentToast('Error loading consultations');
    }
  }

  // Add this missing method
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

  onFileChange(event: any) {
    this.files = Array.from(event.target.files);
  }

  async ajouter() {  // Changed from addConsultation to match template
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
      console.error('Erreur lors de l\'enregistrement:', error);
      this.presentToast('Erreur lors de l\'enregistrement de la consultation');
    }
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