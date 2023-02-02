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
      "esri/rest/query",
      "esri/widgets/Search"
    ]).then(([esriConfig, IdentityManager, ArcGISMap, MapView, FeatureLayer, FeatureTable, reactiveUtils, Editor, Home, GraphicsLayer, SketchViewModel, Graphic, geometryEngineAsync, query, Search]) => {

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
          Buscar();
          Consulta();
        })
        .catch(error => {
          console.log(error)
        });

      function loadsMap() {
        let featureLayer: any;
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
                  
                  let updateFeatures = [];
                  for (let index = 0; index < results.features.length; index++) {
                    const feature = results.features[index];
                    feature.attributes.entidad += " editado";
                    // const jsonFeature = JSON.stringify(feature.attributes);
                    updateFeatures.push(feature);
                  }
                  featureLayer
                    .applyEdits({updateFeatures: updateFeatures})
                    .then((editsResult: any) => {
                      console.log(editsResult);
                    })
                    .catch((error: any) => {
                      console.log("error = ", error);
                    });
                }
              })
              .catch(errorCallback);
          }
        }

        function errorCallback(error: { message: any; }) {
          console.log("error happened:", error.message);
        }
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
