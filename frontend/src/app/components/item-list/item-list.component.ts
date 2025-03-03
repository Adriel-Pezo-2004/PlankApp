// frontend/src/app/components/item-list/item-list.component.ts
import { Component, OnInit } from '@angular/core';
import { ItemService } from '../../services/item.services';

@Component({
  selector: 'app-item-list',
  template: `
    <div class="container">
      <h2>Lista de Items</h2>
      
      <!-- Formulario para crear items -->
      <form (ngSubmit)="onSubmit()">
        <button type="submit">Crear Item</button>
      </form>

      <!-- Lista de items -->
      <div *ngFor="let item of items">
        <h3>{{item.nombre}}</h3>
        <p>{{item.descripcion}}</p>
      </div>
    </div>
  `
})
export class ItemListComponent implements OnInit {
  items: any[] = [];
  newItem = { nombre: '', descripcion: '' };

  constructor(private itemService: ItemService) { }

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.itemService.getItems().subscribe(
      data => this.items = data,
      error => console.error('Error:', error)
    );
  }

  onSubmit() {
    this.itemService.createItem(this.newItem).subscribe(
      response => {
        console.log('Item creado:', response);
        this.loadItems();
        this.newItem = { nombre: '', descripcion: '' };
      },
      error => console.error('Error:', error)
    );
  }
}