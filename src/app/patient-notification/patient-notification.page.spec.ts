import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientNotificationPage } from './patient-notification.page';

describe('PatientNotificationPage', () => {
  let component: PatientNotificationPage;
  let fixture: ComponentFixture<PatientNotificationPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PatientNotificationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
