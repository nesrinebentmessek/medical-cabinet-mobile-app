import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientNotificationsPage } from './patient-notifications.page';

describe('PatientNotificationsPage', () => {
  let component: PatientNotificationsPage;
  let fixture: ComponentFixture<PatientNotificationsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PatientNotificationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
