import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MusicaArtistasComponent } from './musica-artistas.component';

describe('MusicaArtistasComponent', () => {
  let component: MusicaArtistasComponent;
  let fixture: ComponentFixture<MusicaArtistasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MusicaArtistasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MusicaArtistasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
