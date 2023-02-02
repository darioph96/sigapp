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
      "esri/widgets/Home",
      "esri/widgets/Search"
    ]).then(([esriConfig, IdentityManager, ArcGISMap, MapView, FeatureLayer, Editor, Home, Search]) => {

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
              Buscar();
              Consulta();
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

      function Buscar(){
                        //prueba serch
                        const searchEdo = new Search({
                          view: mapView,
                          allPlaceholder: "Marginacion de Estados",
                          includeDefaultSources: false,
                          locationEnabled: false,
                          minSuggestCharacters: 5,
                          sources: [
                            {
                              layer: new FeatureLayer({
                                url: "https://procesosags.sigsa.info/server/rest/services/Francisco_Lopez/poblacion_mexico/FeatureServer/0",
                                outFields: ["*"]
                              }),
                              searchFields: ["ENTIDAD"], // ,"NOM_MUN"
                              suggestionTemplate:"{ENTIDAD}",
                              exactMatch: false,
                              outFields: ["*"],
                              placeHolder: "PUEBLA",
                              popupTemplate: {
                                title: "{ENTIDAD}",
                                content: "<p>Tiene una Area Territoreal de , <b>{AREA} Km</b>, y" +
                                          " Perimetro de <b>{PERIMETER} Km</b></p>" +
                                          "<ul><li>Estado: <b>{ENTIDAD}</b></li>" +
                                          "<li>Capital: <b>{CAPITAL}</b></li>" +
                                          "<li>Marginacion: <b>{GRA_MARG}</b></li>"+
                                          "<li>Total de Poblacion(2010): <b>{POB_TOT10}</b></li>"+
                                          "<li>Indicador de Marginada(2010): <b>{IND_MARG} %</b></li><ul>"
                              }
                            }/*,
                            {
                            layer: new FeatureLayer({
                              url: "https://procesosags.sigsa.info/server/rest/services/Francisco_Lopez/MarginacionMexico/MapServer/1",
                              outFields: ["*"]
                            }),
                            searchFields: ["NOM_MUN"], // ,"NOM_MUN"
                            suggestionTemplate:"{NOM_MUN}",
                            exactMatch: false,
                            outFields: ["*"],
                            placeHolder: "PUEBLA",
                            popupTemplate: {
                              title: "{NOM_MUN}",
                              content: "<p>Tiene una Area Territoreal de , <b>{AREA} Km</b>, y" +
                                        " Perimetro de <b>{PERIMETER} Km</b></p>" +
                                        "<ul><li>Estado: <b>{NOM_MUN}</b></li>" +
                                        "<li>Marginacion: <b>{GRA_MARG}</b></li>"+
                                        "<li>Total de Poblacion(2010): <b>{POB_TOT10}</b></li>"+
                                        "<li>Indicador de Marginada(2010): <b>{IND_MARG} %</b></li><ul>"
                            }
                          }*/
                          ]
                        });
                        // Add the search widget to the top right corner of the view
                        mapView.ui.add(searchEdo, {
                          position: "top-right"
                        });
                        //prueba serch
      }

      function Consulta(){
        // SQL query array
        const parcelLayerSQL = ["Elija una cláusula where de SQL...", "Entidad = 'PUEBLA'", "Entidad = 'HIDALGO'", "POB_TOT10 > 5000000", "POB_TOT10 < 1000000"];
        let whereClause = parcelLayerSQL[0];

        // Add SQL UI
        const select = document.createElement("select");
        select.setAttribute("class", "esri-widget esri-select");
        select.setAttribute("style", "width: 200px; font-family: 'Avenir Next'; font-size: 1em");
        parcelLayerSQL.forEach(function (query) {
            let option = document.createElement("option");
            option.innerHTML = query;
            option.value = query;
            select.appendChild(option);
        });
        //consulta
        mapView.ui.add(select, "top-right");
        // Listen for changes
        select.addEventListener('change', (event) => {
            const target = event.target as HTMLInputElement;
            whereClause = target?.value;
            queryFeatureLayer(mapView.extent);

        });
        // Get query layer and set up query
        const parcelLayer = new FeatureLayer({
            url: "https://procesosags.sigsa.info/server/rest/services/Francisco_Lopez/poblacion_mexico/FeatureServer/0",
        });
        function queryFeatureLayer(extent="") {

            const parcelQuery = {
                where: whereClause,  // Set by select element
                spatialRelationship: "intersects", // Relationship operation to apply
                geometry: extent, // Restricted to visible extent of the map
                outFields: ["ENTIDAD", "CAPITAL", "NUM_EDO"], // Attributes to return
                returnGeometry: true
            };

            parcelLayer.queryFeatures(parcelQuery)

                .then((results: any) => {

                    //console.log("Feature count: " + results.features.length)
                    console.log("results ---", results);
                    console.log("results.features ---", results?.features);
                    console.log("results.features.atributtes ---", results?.features.attributes);
                    displayResults(results);

                }).catch((error: any) => {
                    console.log(error.error);
                });

        }
        function displayResults(results: any) {
            // Create a blue polygon
            const symbol = {
                type: "simple-fill",
                color: [20, 130, 200, 0.5],
                outline: {
                    color: "white",
                    width: .5
                },
            };

            const popupTemplate = {
                title: "Estado {ENTIDAD}",
                content: "Capital: {CAPITAL} <br> No. Estado: {NUM_EDO} <br> Indice Marginacion: {IND_MARG} <br> Grado Marginacion: {GRA_MARG}"
            };

            // Assign styles and popup to features
            results.features.map((feature: any) => {
                feature.symbol = symbol;
                feature.popupTemplate = popupTemplate;
                return feature;
            });
            // Clear display
            mapView.popup.close();
            mapView.graphics.removeAll();
            // Add features to graphics layer
            mapView.graphics.addMany(results.features);

        }
      }
    })
    .catch(err => {
      console.log(err);
    });

  }
}
