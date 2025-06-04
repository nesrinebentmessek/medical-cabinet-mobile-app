import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsultationsPage } from './consultations.page';

describe('ConsultationsPage', () => {
  let component: ConsultationsPage;
  let fixture: ComponentFixture<ConsultationsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ConsultationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
