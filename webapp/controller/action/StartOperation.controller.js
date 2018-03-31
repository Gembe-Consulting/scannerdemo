sap.ui.define([
	"./ActionBaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"com/mii/scanner/model/sapType"
], function(ActionBaseController, JSONModel, MessageBox, sapType) {
	"use strict";

	return ActionBaseController.extend("com.mii.scanner.controller.action.StartOperation", {

		sapType: sapType,

		_oInitData: {
			AUFNR: null,
			dateTimeValue: null
		},

		_oInitView: {
			bValid: false,
			bOrderOperationValid: false
		},

		onInit: function() {
			//call super class onInit to apply user login protection. DO NOT DELETE!
			ActionBaseController.prototype.onInit.call(this);

			this.setModel(new JSONModel(jQuery.extend({}, this._oInitData)), "data");

			this.setModel(new JSONModel(jQuery.extend({}, this._oInitView)), "view");

			this.getView().addEventDelegate({
				onBeforeShow: this._refreshDateValue
			}, this);

		},

		onSave: function() {

		},

		updateViewControls: function(oData) {
			var oViewModel = this.getModel("view"),
				oDataModel = this.getModel("data"),
				bOrderOperationValid = oDataModel.getProperty("/bOrderOperationValid"),
				bDateTimeEntryValid = oDataModel.getProperty("/bDateTimeEntryValid"),
				bInputValuesComplete,
				bNoErrorMessagesActive,
				bReadyForPosting;

			// check if all required input data is present
			bInputValuesComplete = this.isInputDataValid(oData);

			// check if all input data has proper format
			bNoErrorMessagesActive = this.isMessageModelClean();

			// we are ready for posting once we have complete and proper formatted input
			bReadyForPosting = bOrderOperationValid && bDateTimeEntryValid && bNoErrorMessagesActive && bInputValuesComplete;

			oViewModel.setProperty("/bValid", bReadyForPosting);
		},

		isInputDataValid: function(oData) {
			return !!oData.dateTimeEntry && !!oData.orderNumber && !!oData.OperationNumber;
		},

		onOrderChange: function(oEvent) {
			var oSource = oEvent.getSource(),
				oOrderNumberInput = this.byId("orderNumberInput"),
				oOperationNumberInput = this.byId("operationNumberInput"),
				oDataModel = this.getModel("data"),
				sOrderNumber = oDataModel.getProperty("/orderNumber"),
				sOperationNumber = oDataModel.getProperty("/operationNumber"),
				fnResolve,
				fnReject;

			/* check if current input is valid */
			if (!sOrderNumber || !sOperationNumber) {
				return;
			}
			if (this.controlHasValidationError(oSource)) {
				return;
			}

			/* Prepare UI: busy, value states, log messages */
			this.showControlBusyIndicator(oOrderNumberInput);
			this.showControlBusyIndicator(oOperationNumberInput);
			oSource.setValueState(sap.ui.core.ValueState.None);

			/* Prepare Data */

			/* Prepare success callback */
			fnResolve = function(oData) {
				var oOrderOperation,
					aRows,
					bOrderOperationValid = true;

				try {
					aRows = oData.d.results[0].Rowset.results[0].Row.results;
				} catch (oError) {
					aRows = [];
				}

				/* Check if oData contains required results: extract value, evaluate value, set UI, set model data */
				if (aRows.length === 1) {
					oOrderOperation = aRows[0];

					if (!oOrderOperation.STATUS === this.oProcessOrderStatus.released.STATUS && !oOrderOperation.STATUS === this.oProcessOrderStatus.paused.STATUS) {
						this.addUserMessage({
							text: this.getTranslation("startOperation.messageText.wrongCurrentStatus", [sOrderNumber, sOperationNumber, oOrderOperation.STATUS_TXT])
						});

						bOrderOperationValid = false;
					}

				} else {
					this.addUserMessage({
						text: this.getTranslation("startOperation.messageText.orderNotFound", [sOrderNumber, sOperationNumber])
					});

					bOrderOperationValid = false;
				}

				this.getModel("view").setProperty("/bOrderOperationValid", bOrderOperationValid);

				oDataModel.setData(oOrderOperation, true);

			}.bind(this);

			/* Prepare error callback */
			fnReject = function(oError) {
				MessageBox.error(oError.responseText || oError.message, {
					title: this.getTranslation("error.miiTransactionErrorText", ["OrderOperationRead"]),
					contentWidth: "500px"
				});
				//oSource.setValueState(sap.ui.core.ValueState.Error).setValue("");
				this.getModel("view").setProperty("/bOrderOperationValid", false);
			}.bind(this);

			/* Perform service call, Hide Busy Indicator, Update View Controls */
			this.requestOrderOperationInfoService(sOrderNumber, sOperationNumber)
				.then(fnResolve, fnReject)
				.then(function() {
					this.hideControlBusyIndicator(oOrderNumberInput);
					this.hideControlBusyIndicator(oOperationNumberInput);
				}.bind(this))
				.then(function() {
					//this.updateViewControls(this.getModel("data").getData());
				}.bind(this));
		},

		onOrderNumberInputChange: function(oEvent) {
			this.onOrderChange(oEvent);
		},

		onOperationNumberInputChange: function(oEvent) {
			this.onOrderChange(oEvent);
		},

		_refreshDateValue: function() {
			this.getModel("data").setProperty("/dateTimeValue", new Date());
		}

	});

});