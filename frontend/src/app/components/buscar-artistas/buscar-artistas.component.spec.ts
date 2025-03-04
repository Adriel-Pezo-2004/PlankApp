import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuscarArtistasComponent } from './buscar-artistas.component';

describe('BuscarArtistasComponent', () => {
  let component: BuscarArtistasComponent;
  let fixture: ComponentFixture<BuscarArtistasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuscarArtistasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BuscarArtistasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
