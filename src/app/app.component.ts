import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

import { loadModules } from 'esri-loader';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'sigapp';

  // this is needed to be able to create the MapView at the DOM element in this component
  @ViewChild('viewDiv') private viewDiv: ElementRef = {} as ElementRef;

  ngOnInit() {
    loadModules([
      "esri/config",
      "esri/identity/IdentityManager",
      "esri/Map",
      "esri/views/MapView",
      "esri/layers/FeatureLayer",
      "esri/widgets/FeatureTable",
      "esri/core/reactiveUtils",
      "esri/widgets/Editor",
      "esri/widgets/Home",
      "esri/layers/GraphicsLayer",
      "esri/widgets/Sketch/SketchViewModel",
      "esri/Graphic",
      "esri/geometry/geometryEngineAsync",
      "esri/rest/query"
    ]).then(([esriConfig, IdentityManager, ArcGISMap, MapView, FeatureLayer, FeatureTable, reactiveUtils, Editor, Home, GraphicsLayer, SketchViewModel, Graphic, geometryEngineAsync, query]) => {

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
        let featureLayer: { when: (arg0: () => void) => Promise<any>; };
        let selectedFeature;
        let id;

        const popupheads = {
          "title": "Trailhead",
          "content": "<b>Estado:</b> {entidad}"
        }

        query.executeQueryJSON("https://procesosags.sigsa.info/server/rest/services/Francisco_Lopez/poblacion_mexico/FeatureServer/0", {  // autocasts as new Query()
          where: "pob_tot10 > 800000 AND pob_tot10 < 1150000"
        }).then(function (results: { features: any; }) {
          // results is a FeatureSet containing an array of graphic features
          console.log(results.features);
        }, function (error: any) {
          console.log(error); // will print error in console, if any
        });

        // mapView.when(() => {
        featureLayer = new FeatureLayer({
          url: "https://procesosags.sigsa.info/server/rest/services/Francisco_Lopez/poblacion_mexico/FeatureServer/0",
          outFields: ["*"],
          title: "Poblacion México",
          popupTemplate: popupheads
        });
        map.add(featureLayer);

        let LayerView: { queryFeatures: (arg0: { geometry: any; outFields: string[]; }) => Promise<{ features: string | any[]; }>; };
        featureLayer
          .when(() => {
            mapView.whenLayerView(featureLayer).then(function (layerView: any) {
              LayerView = layerView;
            });
          })
          .catch(errorCallback);

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

        if (checkboxEle != null) {
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
              if (appContainer != null && tableContainer != null && labelText != null) {
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
                mapView.popup.selectedFeature.attributes.objectid
              );
              id = selectedFeature.getObjectId();
            }
          }
        );
        // })

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

        let features: any[] = [];

        // Listen for the table's selection-change event
        featureTable.on("selection-change", (changes: { removed: any[]; added: any[]; }) => {
          // if the feature is unselected then remove the objectId
          // of the removed feature from the features array
          changes.removed.forEach((item) => {
            const data = features.find((data) => {
              return data === item.objectId;
            });
            if (data) {
              features.splice(features.indexOf(data), 1);
            }
          });

          // If the selection is added, push all added selections to array
          changes.added.forEach((item) => {
            features.push(item.objectId);
          });
        });

        // polygonGraphicsLayer will be used by the sketchviewmodel
        // show the polygon being drawn on the view
        const polygonGraphicsLayer = new GraphicsLayer();
        map.add(polygonGraphicsLayer);

        // add the select by rectangle button the view
        mapView.ui.add("select-by-rectangle", "top-left");
        const selectButton = document.getElementById("select-by-rectangle");

        if (selectButton != null) {
          // click event for the select by rectangle button
          selectButton.addEventListener("click", () => {
            mapView.popup.close();
            sketchViewModel.create("rectangle");
          });
        }

        // add the clear selection button the view
        mapView.ui.add("clear-selection", "top-left");
        const btnClear = document.getElementById("clear-selection");
        if (btnClear != null) {
          btnClear.addEventListener("click", () => {
            featureTable.clearSelection();
            featureTable.filterGeometry = null;
            polygonGraphicsLayer.removeAll();
          });
        }

        // create a new sketch view model set its layer
        const sketchViewModel = new SketchViewModel({
          view: mapView,
          layer: polygonGraphicsLayer
        });

        // Once user is done drawing a rectangle on the map
        // use the rectangle to select features on the map and table
        sketchViewModel.on("create", async (event: { state: string; }) => {
          if (event.state === "complete") {
            // this polygon will be used to query features that intersect it
            const geometries = polygonGraphicsLayer.graphics.map(function (
              graphic: { geometry: any; }
            ) {
              return graphic.geometry;
            });
            const queryGeometry = await geometryEngineAsync.union(
              geometries.toArray()
            );
            selectFeatures(queryGeometry);
          }
        });

        // This function is called when user completes drawing a rectangle
        // on the map. Use the rectangle to select features in the layer and table
        function selectFeatures(geometry: any) {
          if (LayerView) {
            // create a query and set its geometry parameter to the
            // rectangle that was drawn on the view
            const query = {
              geometry: geometry,
              outFields: ["*"]
            };

            // query graphics from the csv layer view. Geometry set for the query
            // can be polygon for point features and only intersecting geometries are returned
            LayerView
              .queryFeatures(query)
              .then((results: { features: string | any[]; }) => {
                if (results.features.length === 0) {
                  // clearSelection();
                  console.log("clear selection");
                } else {
                  // pass in the query results to the table by calling its selectRows method.
                  // This will trigger FeatureTable's selection-change event
                  // where we will be setting the feature effect on the csv layer view
                  featureTable.filterGeometry = geometry;
                  featureTable.selectRows(results.features);
                }
              })
              .catch(errorCallback);
          }
        }

        function errorCallback(error: { message: any; }) {
          console.log("error happened:", error.message);
        }
      }
    })
      .catch(err => {
        console.log(err);
      });

  }
}
