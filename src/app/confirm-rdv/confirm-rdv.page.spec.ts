import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmRdvPage } from './confirm-rdv.page';

describe('ConfirmRdvPage', () => {
  let component: ConfirmRdvPage;
  let fixture: ComponentFixture<ConfirmRdvPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmRdvPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
