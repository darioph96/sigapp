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
  @ViewChild('viewDiv') private viewDiv: ElementRef = {} as ElementRef;

  ngOnInit(){
    loadModules([
      "esri/config",
      "esri/identity/IdentityManager",
      "esri/Map",
      "esri/views/MapView",
      "esri/layers/FeatureLayer",
      "esri/widgets/FeatureTable",
      "esri/core/reactiveUtils",
      "esri/widgets/Editor",
      "esri/widgets/Home"
    ]).then(([esriConfig, IdentityManager, ArcGISMap, MapView, FeatureLayer, FeatureTable, reactiveUtils, Editor, Home]) => {

      const map = new ArcGISMap({
        basemap: 'topo-vector'
      });

      const mapView = new MapView({
        container: this.viewDiv.nativeElement,
        center: [-101, 23],
        zoom: 5,
        map: map,
        popup: {
          dockEnabled: true,
          dockOptions: {
            buttonEnabled: false,
            breakpoint: false
          }
        }
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
        let featureLayer;
        let selectedFeature;
        let id;
        // const estadosLayer = new FeatureLayer({
        //   url: "https://procesosags.sigsa.info/server/rest/services/Francisco_Lopez/poblacion_mexico/FeatureServer/0",
        // });
        // map.add(estadosLayer, 0);

        mapView.when(() => {
          featureLayer = new FeatureLayer({
            url: "https://procesosags.sigsa.info/server/rest/services/Francisco_Lopez/poblacion_mexico/FeatureServer/0",
            outFields: ["*"],
            title: "Poblacion México"
          });
          map.add(featureLayer);

          // Get references to div elements for toggling table visibility
          const appContainer = document.getElementById("appContainer");
          const tableContainer = document.getElementById("tableContainer");
          const tableDiv = document.getElementById("tableDiv");

          // Create the feature table
          const featureTable = new FeatureTable({
            view: mapView,
            layer: featureLayer,
            multiSortEnabled: true, // set this to true to enable sorting on multiple columns
            editingEnabled: true,
            tableTemplate: {
              // autocast to TableTemplate
              // columnTemplates: [
              //   // takes an array of GroupColumnTemplate and FieldColumnTemplate
              //   {
              //     // autocast to GroupColumnTemplate
              //     type: "group",
              //     label: "Crime details",
              //     columnTemplates: [
              //       {
              //         type: "field",
              //         fieldName: "Primary_Type",
              //         label: "Crime type"
              //       },
              //       {
              //         type: "field",
              //         fieldName: "Description",
              //         label: "Description"
              //       },
              //       {
              //         type: "field",
              //         fieldName: "Location_Description",
              //         label: "Location description"
              //       }
              //     ]
              //   },
              //   {
              //     type: "group",
              //     label: "Arrest information",
              //     columnTemplates: [
              //       {
              //         type: "field",
              //         fieldName: "Arrest",
              //         label: "Arrest"
              //       },
              //       {
              //         type: "field",
              //         fieldName: "incident_date",
              //         label: "Date of incident"
              //       },
              //       {
              //         type: "field",
              //         fieldName: "Case_Number",
              //         label: "Case No.",
              //         editable: false
              //       }
              //     ]
              //   }
              // ]
            },
            container: tableDiv
          });

          // Add toggle visibility slider
          mapView.ui.add(document.getElementById("mainDiv"), "top-left");

          // Get reference to div elements
          const checkboxEle = document.getElementById("checkboxId") as HTMLInputElement;
          const labelText = document.getElementById("labelText");

          if(checkboxEle != null){
            // Listen for when toggle is changed, call toggleFeatureTable function
            checkboxEle.onchange = () => {
              toggleFeatureTable();
            };
  
            function toggleFeatureTable() {
              // Check if the table is displayed, if so, toggle off. If not, display.
              if (checkboxEle != null && appContainer != null && tableContainer != null && labelText != null && !checkboxEle.checked) {
                appContainer.removeChild(tableContainer);
                labelText.innerHTML = "Tabla de elementos";
              } else {
                if(appContainer != null && tableContainer != null && labelText != null){
                  appContainer.appendChild(tableContainer);
                  labelText.innerHTML = "Tabla de elementos";
                }
              }
            }
          }

          // Watch for the popup's visible property. Once it is true, clear the current table selection and select the corresponding table row from the popup
          reactiveUtils.watch(
            () => mapView.popup.viewModel.active,
            () => {
              selectedFeature = mapView.popup.selectedFeature;
              if (selectedFeature !== null && mapView.popup.visible !== false) {
                featureTable.highlightIds.removeAll();
                featureTable.highlightIds.add(
                  mapView.popup.selectedFeature.attributes.OBJECTID
                );
                id = selectedFeature.getObjectId();
              }
            }
          );
        })

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
