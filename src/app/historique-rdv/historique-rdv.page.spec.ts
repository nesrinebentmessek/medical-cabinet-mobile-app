import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistoriqueRdvPage } from './historique-rdv.page';

describe('HistoriqueRdvPage', () => {
  let component: HistoriqueRdvPage;
  let fixture: ComponentFixture<HistoriqueRdvPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HistoriqueRdvPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
