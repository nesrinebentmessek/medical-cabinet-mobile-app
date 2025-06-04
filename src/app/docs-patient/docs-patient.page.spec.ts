import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocsPatientPage } from './docs-patient.page';

describe('DocsPatientPage', () => {
  let component: DocsPatientPage;
  let fixture: ComponentFixture<DocsPatientPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DocsPatientPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
