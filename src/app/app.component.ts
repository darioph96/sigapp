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
      "esri/config",
      "esri/identity/IdentityManager",
      "esri/Map",
      "esri/views/MapView",
      "esri/layers/FeatureLayer",
      "esri/widgets/Editor",
      "esri/widgets/Home"
    ]).then(([esriConfig, IdentityManager, ArcGISMap, MapView, FeatureLayer, Editor, Home]) => {

      const map = new ArcGISMap({
        basemap: 'topo-vector'
      });

      const mapView = new MapView({
        container: this.mapViewEl.nativeElement,
        center: [-101, 23],
        zoom: 5,
        map: map
      });

      esriConfig.apiKey = "AAPK2b935e8bbf564ef581ca3c6fcaa5f2a71ZH84cPqqFvyz3KplFRHP8HyAwJJkh6cnpcQ-qkWh5aiyDQsGJbsXglGx0QM2cPm";
            
      const formData = new FormData();
      formData.append("username", "francisco.lopez");
      formData.append("password", "FJLA.sig2021");
      formData.append("referer", "null" !== window.origin ? window.origin : window.location.origin);
      formData.append("expiration", "60");
      formData.append("f", "json");

      async function getToken(url = "", data = new FormData()) {
          const response = await fetch(url, {
              method: "POST",
              body: data,
          });
          return response.json();
      }
      
      getToken("https://procesosags.sigsa.info/portal/sharing/rest/generateToken", formData)
          .then(data => {
              if (data.error) {
                  alert("Usuario y contrasenia incorrecto");
                  return;
              }
              console.log(data);
              IdentityManager.registerToken({
                  token: data.token,
                  server: "https://procesosags.sigsa.info/portal/sharing/",
                  ssl: true,
              });
              
              
              loadsMap();
          })
          .catch(error => {
              console.log(error)
          });
      
      function loadsMap() {
        
        const estadosLayer = new FeatureLayer({
          url: "https://procesosags.sigsa.info/server/rest/services/Francisco_Lopez/poblacion_mexico/FeatureServer/0",
        });
        map.add(estadosLayer, 0);

        const homeBtn = new Home({
          view: mapView
        });

        mapView.ui.add(homeBtn, "top-left");

        // Editor widget
        const editor = new Editor({
          view: mapView
        });
        // Add widget to the view
        mapView.ui.add(editor, "top-right");
      }
    })
    .catch(err => {
      console.log(err);
    });
    
  }
}
