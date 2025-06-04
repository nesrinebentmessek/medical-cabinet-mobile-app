import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DoctorRdvPage } from './doctor-rdv.page';

describe('DoctorRdvPage', () => {
  let component: DoctorRdvPage;
  let fixture: ComponentFixture<DoctorRdvPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DoctorRdvPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
