// src/app/models/user.model.ts

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'doctor' | 'patient';  // Type d'utilisateur
    profilePicture: string;
    speciality?: string;  // Ajout de speciality pour le rôle 'doctor'
  dateOfBirth?: string;  // Ajout de dateOfBirth pour le rôle 'patient'  // URL ou chemin vers l'image de profil
  }
  
  export interface Doctor extends User {
    speciality: string;  // Spécialité du médecin
    bio: string;  // Brève biographie
    phoneNumber: string;  // Numéro de téléphone
  }
  
  export interface Patient extends User {
    dateOfBirth: string;  // Date de naissance du patient
    medicalHistory: string;  // Historique médical du patient
  }
  