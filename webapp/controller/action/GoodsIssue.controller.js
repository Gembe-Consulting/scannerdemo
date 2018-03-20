sap.ui.define([
	"./ActionBaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"com/mii/scanner/model/sapType",
	"com/mii/scanner/model/formatter"
], function(ActionBaseController, JSONModel, MessageBox, sapType, formatter) {
	"use strict";

	return ActionBaseController.extend("com.mii.scanner.controller.action.GoodsIssue", {

		sapType: sapType,
		formatter: formatter,

		_aDisallowedStorageLocations: ["VG01", "1000"],

		_oInitData: {
			//entry screen data
			entryQuantity: null,
			unitOfMeasure: null,
			orderNumber: null,
			storageUnit: null,
			storageLocation: null,
			materialNumber: null,
			bulkMaterialIndicator: false,
			//storage unit data
			LENUM: null,
			MEINH: null,
			BESTQ: null,
			VFDAT: null
		},

		_oInitView: {
			bStorageUnitValid: true,
			bOrderNumberValid: true,
			bValid: false,
			storageUnitValueState: sap.ui.core.ValueState.None,
			orderNumberValueState: sap.ui.core.ValueState.None,
			materialNumberValueState: sap.ui.core.ValueState.None
		},

		onInit: function() {
			//call super class onInit to apply user login protection. DO NOT DELETE!
			ActionBaseController.prototype.onInit.call(this);

			this.setModel(new JSONModel(jQuery.extend({}, this._oInitData)), "data");

			this.setModel(new JSONModel(jQuery.extend({}, this._oInitView)), "view");

			this.getRouter()
				.getRoute("goodsIssue")
				.attachMatched(this._onRouteMatched, this);
		},

		onSave: function() {
			var fnResolve,
				fnReject;

			this.getOwnerComponent().showBusyIndicator();

			fnResolve = function(oData) {
				var oDataModel = this.getModel("data");

				this.addLogMessage({
					text: this.getTranslation("goodsIssue.messageText.goodsIssuePostingSuccessfull", [oDataModel.getProperty("/orderNumber")]),
					type: sap.ui.core.MessageType.Success
				});
			}.bind(this);

			fnReject = function(oError) {
				MessageBox.error(oError.message, {
					title: this.getTranslation("error.miiTransactionErrorText", ["GoodsMovementCreate: 261"])
				});
			}.bind(this);

			/* Perform service call, Hide Busy Indicator, Update View Controls */
			this._postGoodsIssue()
				.then(fnResolve, fnReject)
				.then(this.getOwnerComponent().hideBusyIndicator)
				.then(function() {
					this.onClearFormPress({}, true /*bKeepMessageStrip*/ );
				}.bind(this));
		},

		_postGoodsIssue: function() {
			var sPath = "/",
				oDataModel = this.getModel("data"),
				oViewModel = this.getModel("view"),
				oGoodsIssueModel = this.getModel("goodsMovement"),
				sUsername = this.getModel("user").getProperty("USERLOGIN"),
				sDefaultMoveType = "261",
				sDefaultUnitOfMeasure = "KG",

				oParam;

			if (oDataModel.getProperty(sPath + "storageUnit") && oViewModel.getProperty("/type") === "withLE") {
				oParam = {
					"Param.1": oDataModel.getProperty(sPath + "storageUnit"),
					"Param.2": oDataModel.getProperty(sPath + "orderNumber"),
					"Param.4": oDataModel.getProperty(sPath + "entryQuantity"),
					"Param.5": oDataModel.getProperty(sPath + "unitOfMeasure") || sDefaultUnitOfMeasure,
					"Param.6": oDataModel.getProperty(sPath + "materialNumber"),
					"Param.10": sUsername,
					"Param.11": oDataModel.getProperty(sPath + "movementType") || sDefaultMoveType
				};
			} else {
				oParam = {
					"Param.2": oDataModel.getProperty(sPath + "orderNumber"),
					"Param.3": oDataModel.getProperty(sPath + "storageLocation"),
					"Param.4": oDataModel.getProperty(sPath + "entryQuantity"),
					"Param.5": oDataModel.getProperty(sPath + "unitOfMeasure") || sDefaultUnitOfMeasure,
					"Param.6": oDataModel.getProperty(sPath + "materialNumber"),
					"Param.10": sUsername,
					"Param.11": oDataModel.getProperty(sPath + "movementType") || sDefaultMoveType
				};
			}

			return oGoodsIssueModel.loadMiiData(oGoodsIssueModel._sServiceUrl, oParam);

		},

		_onRouteMatched: function(oEvent) {
			var oArgs, oView, oQuery;
			oArgs = oEvent.getParameter("arguments");
			oView = this.getView();

			oQuery = oArgs["?query"];

			if (oQuery) {
				if (oQuery.type) {
					this._oInitView.type = oQuery.type; //update initial object
					oView.getModel("view").setProperty("/type", oQuery.type);
				}
				if (oQuery.LENUM) {
					oView.getModel("data").setProperty("/storageUnit", oQuery.LENUM);
					this.byId("storageUnitInput").fireChange({
						value: oQuery.LENUM
					});
				}
				if (oQuery.AUFNR) {
					oView.getModel("data").setProperty("/orderNumber", oQuery.AUFNR);
					this.byId("orderNumberInput").fireChange({
						value: oQuery.AUFNR
					});
				}
				if (oQuery.MATNR) {
					oView.getModel("data").setProperty("/materialNumber", oQuery.MATNR);
					this.byId("materialNumberInput").fireChange({
						value: oQuery.MATNR
					});
				}
				if (oQuery.MEINH) {
					oView.getModel("data").setProperty("/unitOfMeasure", oQuery.MEINH);
					this.byId("unitOfMeasureInput").fireChange({
						value: oQuery.MEINH
					});
				}
				if (oQuery.LGORT) {
					oView.getModel("data").setProperty("/storageLocation", oQuery.LGORT);
					this.byId("storageLocationInput").fireChange({
						value: oQuery.LGORT
					});
				}
				if (oQuery.SCHGT) {
					oQuery.SCHGT = (oQuery.SCHGT === "true");
					oView.getModel("data").setProperty("/bulkMaterialIndicator", oQuery.SCHGT);
					this.byId("bulkMaterialSwitch").fireChange({
						value: oQuery.SCHGT
					});
				}
			}
		},

		updateViewControls: function(oData) {
			var oViewModel = this.getModel("view"),
				bStorageUnitValid = oViewModel.getProperty("/bStorageUnitValid"),
				bOrderNumberValid = oViewModel.getProperty("/bOrderNumberValid"),
				bInputValuesComplete,
				bNoErrorMessagesActive,
				bReadyForPosting;

			// check if all required input data is present
			bInputValuesComplete = this.isInputDataValid(oData);

			// check if all input data has proper format
			bNoErrorMessagesActive = this.isMessageModelClean();

			// we are ready for posting once we have complete and proper formatted input
			bReadyForPosting = bNoErrorMessagesActive && bInputValuesComplete && bStorageUnitValid && bOrderNumberValid;

			oViewModel.setProperty("/bValid", bReadyForPosting);
		},

		isInputDataValid: function(oData) {
			switch (this.getModel("view").getProperty("/type")) {
				case "withLE":
					return !!oData.entryQuantity && oData.entryQuantity > 0 && oData.entryQuantity !== "" && !!oData.unitOfMeasure && !!oData.orderNumber && !!oData.storageUnit;
				case "nonLE":
					return !!oData.entryQuantity && oData.entryQuantity > 0 && oData.entryQuantity !== "" && !!oData.unitOfMeasure && !!oData.orderNumber && !!oData.storageLocation && !!oData.materialNumber;
				default:
					return false;
			}
		},

		validateComponentWithdrawal: function(sOrderNumber, sMaterialNumber, oSource) {
			var fnReject,
				fnResolve;

			if (!sOrderNumber || !sMaterialNumber) {
				return false;
			}

			/* Prepare UI: busy, value states, log messages */
			this.showControlBusyIndicator(oSource);
			oSource.setValueState(sap.ui.core.ValueState.None);
			this.clearLogMessages();

			fnResolve = function(oData) {
				var oOrderComponent,
					aRows = oData.d.results[0].Rowset.results[0].Row.results,
					oDataModel = this.getModel("data"),
					sComponentUnitOfMeasure;

				/* Check if oData contains required results: extract value, evaluate value, set UI, set model data */
				if (aRows.length === 1) {
					oOrderComponent = aRows[0];
					oSource.setValueState(sap.ui.core.ValueState.Success);

					if (oOrderComponent.RGEKZ === "X") {
						this.addLogMessage({
							text: this.getTranslation("goodsIssue.messageText.materialBackflushedInOrderComponentList", [sMaterialNumber]),
							type: sap.ui.core.MessageType.Warning
						});
						oSource.setValueState(sap.ui.core.ValueState.Warning);
					}

					if (oDataModel.getProperty("/unitOfMeasure") && oDataModel.getProperty("/unitOfMeasure") !== oOrderComponent.EINHEIT) {
						this.addLogMessage({
							text: this.getTranslation("goodsIssue.messageText.orderComponentHasDeviatingUnitOfMeasure", [oOrderComponent.EINHEIT, oDataModel.getProperty("/unitOfMeasure")])
						});
						oSource.setValueState(sap.ui.core.ValueState.Error);
					} else {
						sComponentUnitOfMeasure = oOrderComponent.EINHEIT;
					}

					oDataModel.setProperty("/unitOfMeasure", sComponentUnitOfMeasure);

					// update entry quantity by remaining open quantity, but only if users did not enter a quantity beforhand
					if (this.getModel("view").getProperty("/type") === "nonLE" && (!oDataModel.getProperty("/entryQuantity") || oDataModel.getProperty("/entryQuantity") === "")) {
						oDataModel.setProperty("/entryQuantity", oOrderComponent.BDMNG - oOrderComponent.ENMNG);
						this.byId("quantityInput").setTooltip(this.getTranslation("goodsIssue.tooltip.remainingQuantity", [oOrderComponent.BDMNG - oOrderComponent.ENMNG, oOrderComponent.BDMNG, oOrderComponent.ENMNG]));
					} else {
						this.byId("quantityInput").setTooltip("");
					}

				} else {
					this.addLogMessage({
						text: this.getTranslation("goodsIssue.messageText.materialNotContaintedInOrderComponentList", [sMaterialNumber, sOrderNumber]),
						type: sap.ui.core.MessageType.Warning
					});
					oSource.setValueState(sap.ui.core.ValueState.Warning);
				}

			}.bind(this);

			fnReject = function(oError) {
				MessageBox.error(oError.message, {
					title: this.getTranslation("error.miiTransactionErrorText", ["OrderComponentGet"])
				});
			}.bind(this);

			this.requestOrderComponentInfoService(sOrderNumber, sMaterialNumber)
				.then(fnResolve, fnReject)
				.then(function() {
					this.hideControlBusyIndicator(oSource);
				}.bind(this))
				.then(function() {
					this.updateViewControls(this.getModel("data").getData());
				}.bind(this));

			return true;
		},

		/*
		 * bestq === "S" || bestq === "Q" || bestq === "R"
		 */
		onStorageUnitInputChange: function(oEvent) {
			var oSource = oEvent.getSource(),
				sStorageUnitNumber = oEvent.getParameter("value"),
				fnResolve,
				fnReject;

			/* Prepare UI: busy, value states, log messages */
			this.showControlBusyIndicator(oSource);
			oSource.setValueState(sap.ui.core.ValueState.None);
			this.clearLogMessages();

			/* Prepare Data */
			sStorageUnitNumber = this.padStorageUnitNumber(sStorageUnitNumber);

			fnResolve = function(oData) {
				var oStorageUnit = {
						LENUM: null
					},
					aRows = oData.d.results[0].Rowset.results[0].Row.results,
					bStorageUnitValid = true,
					bMergeData = true,
					oExpirationDateFormatted,
					oDataModel = this.getModel("data");

				aRows = oData.d.results[0].Rowset.results[0].Row.results;

				/* Check if oData contains required results: extract value, evaluate value, set UI, set model data */
				if (aRows.length === 1) {
					oStorageUnit = this._formatStorageUnitData(aRows[0]);

					oSource.setValueState(sap.ui.core.ValueState.Success);

					if (this.formatter.isPastDate(oStorageUnit.VFDAT)) {
						oExpirationDateFormatted = moment(oStorageUnit.VFDAT, "MM-DD-YYYY");
						this.addLogMessage({
							text: this.getTranslation("goodsIssue.messageText.storageUnitHasPastExpirationDate", [oStorageUnit.CHARG, oExpirationDateFormatted.format("L")]),
							type: sap.ui.core.MessageType.Warning
						});
						oSource.setValueState(sap.ui.core.ValueState.Warning);
					}

					if (oStorageUnit.ISTME <= 0) {
						this.addLogMessage({
							text: this.getTranslation("goodsIssue.messageText.storageUnitIsEmpty", [sStorageUnitNumber])
						});
						oSource.setValueState(sap.ui.core.ValueState.Error);
						bStorageUnitValid = false;
					}

					// merge data from storage unit with main model
					oDataModel.setData(oStorageUnit, bMergeData);
					// map data from storage unit to main model if neccessary
					oDataModel.setProperty("/storageUnit", oStorageUnit.LENUM);
					oDataModel.setProperty("/storageLocation", oStorageUnit.LGORT);
					oDataModel.setProperty("/unitOfMeasure", oStorageUnit.MEINH);
					oDataModel.setProperty("/materialNumber", oStorageUnit.MATNR);

					// set actual from storage unit as entry quantity, if nothing has been entered yet
					if (!oDataModel.getProperty("/entryQuantity") || oDataModel.getProperty("/entryQuantity") === "") {
						oDataModel.setProperty("/entryQuantity", oStorageUnit.ISTME);
					}

				} else {
					this.addLogMessage({
						text: this.getTranslation("goodsIssue.messageText.storageUnitNotFound", [sStorageUnitNumber])
					});
					oSource.setValueState(sap.ui.core.ValueState.Error);
					bStorageUnitValid = false;
				}

				this.getModel("view").setProperty("/bStorageUnitValid", bStorageUnitValid);

			}.bind(this);

			fnReject = function(oError) {
				MessageBox.error(oError.message, {
					title: this.getTranslation("error.miiTransactionErrorText", ["StorageUnitNumberRead"])
				});
			}.bind(this);

			/* Perform service call, Hide Busy Indicator, Update View Controls */
			this.requestStorageUnitInfoService(sStorageUnitNumber)
				.then(fnResolve, fnReject)
				.then(function() {
					this.hideControlBusyIndicator(oSource);
				}.bind(this))
				.then(function() {
					this.updateViewControls(this.getModel("data").getData());
				}.bind(this));
		},

		onOrderNumberInputChange: function(oEvent) {
			var oSource = oEvent.getSource(),
				sOrderNumber = oEvent.getParameter("value"),
				fnResolve,
				fnReject;

			/* Prepare UI: busy, value states, log messages */
			this.showControlBusyIndicator(oSource);
			oSource.setValueState(sap.ui.core.ValueState.None);
			this.clearLogMessages();

			/* Prepare Data */
			// Order number could come like 1234567/0012 or 000001234567/001 -> need to clean it
			sOrderNumber = this.cleanScannedOrderNumberString(sOrderNumber);

			fnResolve = function(oData) {
				var oOrder,
					aRows = oData.d.results[0].Rowset.results[0].Row.results,
					bOrderNumberValid = true,
					oModel = this.getModel("data");

				/* Check if oData contains required results: extract value, evaluate value, set UI, set model data */
				if (aRows.length === 1) {
					oOrder = aRows[0];
					oSource.setValueState(sap.ui.core.ValueState.Success);

					oModel.setProperty("/orderNumber", oOrder.AUFNR);

					this.validateComponentWithdrawal(oModel.getProperty("/orderNumber"), oModel.getProperty("/materialNumber"), oSource);

				} else {
					this.addLogMessage({
						text: this.getTranslation("goodsIssue.messageText.orderNumberNotFound", [sOrderNumber])
					});
					oSource.setValueState(sap.ui.core.ValueState.Error);
					bOrderNumberValid = false;
				}

				this.getModel("view").setProperty("/bOrderNumberValid", bOrderNumberValid);

			}.bind(this);

			fnReject = function(oError) {
				MessageBox.error(oError.message, {
					title: this.getTranslation("error.miiTransactionErrorText", ["OrderHeaderNumberRead"])
				});
			}.bind(this);

			/* Perform service call, Hide Busy Indicator, Update View Controls */
			this.requestOrderHeaderInfoService(sOrderNumber)
				.then(fnResolve, fnReject)
				.then(function() {
					this.hideControlBusyIndicator(oSource);
				}.bind(this))
				.then(function() {
					this.updateViewControls(this.getModel("data").getData());
				}.bind(this));

		},

		onQuantityInputChange: function(oEvent) {
			this.updateViewControls(this.getModel("data").getData());
		},

		onUnitOfMeasureInputChange: function(oEvent) {
			var sUnitOfMeasure = oEvent.getParameter("value")
				.toUpperCase(),
				oSource = oEvent.getSource(),
				oDataModel = this.getModel("data");

			oDataModel.setProperty("/unitOfMeasure", sUnitOfMeasure);

			this.validateComponentWithdrawal(oDataModel.getProperty("/orderNumber"), oDataModel.getProperty("/materialNumber"), oSource);

		},

		onMaterialNumberInputChange: function(oEvent) {
			var oSource = oEvent.getSource(),
				oModel = this.getModel("data");

			this.validateComponentWithdrawal(oModel.getProperty("/orderNumber"), oModel.getProperty("/materialNumber"), oSource);
		},

		onStorageLocationInputChange: function(oEvent) {
			var sStorageLocation = oEvent.getParameter("value").toUpperCase(),
				oDataModel = this.getModel("data");

			if (!this.isStorageLocationAllowed(sStorageLocation)) {
				MessageBox.error(this.getTranslation("goodsIssue.messageText.wrongStorageLocation", [sStorageLocation]));
			} else {
				oDataModel.setProperty("/storageLocation", sStorageLocation);
			}

			this.updateViewControls(this.getModel("data").getData());
		},

		setPageTitle: function(sType) {
			var sTitleText = "titleGoodsIssue";
			return this.getTranslation(sTitleText + (sType || ""));
		}

	});

});