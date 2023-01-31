import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

import { loadModules } from 'esri-loader';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  title = 'sigapp';
  
  // this is needed to be able to create the MapView at the DOM element in this component
  @ViewChild('mapViewNode') private mapViewEl: ElementRef = {} as ElementRef;

  ngOnInit(){
    loadModules([
      'esri/Map',
      'esri/views/MapView'
    ]).then(([Map, MapView]) => {

      const map = new Map({
        basemap: 'hybrid'
      });

      const mapView = new MapView({
        container: this.mapViewEl.nativeElement,
        center: [-99.139, 19.376],
            zoom: 5,
        map: map
      });
    })
    .catch(err => {
      console.log(err);
    });
    
  }
}
