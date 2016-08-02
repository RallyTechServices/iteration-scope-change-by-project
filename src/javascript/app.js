Ext.define("iteration-scope-change-by-project", {
    extend: 'Rally.app.TimeboxScopedApp',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    scopeType: 'iteration',

    config: {
        defaultSettings: {
            hoursOffset: 0
        }
    },

    onTimeboxScopeChange: function(timebox){
        this.logger.log('onTimeboxScopeChange', timebox.getQueryFilter().toString());
        this.getContext().setTimeboxScope(timebox);

        this._addComponents(timebox);

        this._clearData();
        this._loadMatchingIterations(timebox);
    },
    _clearData: function(){
        this.timeboxParser = null;
        if (this.down('rallygrid')){
            this.down('rallygrid').destroy();
        }
    },

    _addComponents: function(timebox){
        this.logger.log('_addComponents', timebox);

        var labelWidth = 100,
            boxWidth= 150;

        if (!this.down('#header-container')){
            this.add({
                xtype: 'container',
                itemId: 'header-container',
                layout: {type: 'hbox'},
                items: [
                    this._getIterationStatusTemplate(),
                 //   this._getShowWorkRadioGroupConfig(labelWidth, boxWidth),
                    this._getOrganizeByType(labelWidth, boxWidth),
                    {
                        xtype: 'container',
                        flex: 2
                    },{
                        xtype: 'rallybutton',
                        text: 'Export',
                        listeners: {
                            scope: this,
                            click: this._export
                        }
                    }
                    ]
            });
        }

    },
    _getIterationStatusTemplate: function(){
        var iterationTemplate = Ext.create('Rally.technicalservices.IterationStatusTemplate',{});
        return {
            xtype: 'container',
            tpl: iterationTemplate,
            itemId: 'iterationStatusTemplate',
            flex: 1,
            margin: 15
        };
    },
    _getShowWorkRadioGroupConfig: function(labelWidth, boxWidth){

        return {
            xtype: 'radiogroup',
            fieldLabel: 'Show Work',
            columns: 3,
            itemId: 'selectedShowWorkScope',
            allowBlank: false,
            vertical: false,
            labelWidth: labelWidth,
            margin: '25 0 10 0',
            padding: 5,
            flex: 1,
            labelAlign: 'right',
            layout: 'fit',
            items: [{
                boxLabel: "All",
                inputValue: 'all',
                name: 'showWorkScope',
                disabled: false,
                margin: '0 10 0 10',
                checked: true
            },{
                boxLabel: "Added",
                name: 'showWorkScope',
                inputValue: 'added',
                disabled: false,
                margin: '0 10 0 10',
                checked: false

            },{
                boxLabel: "Removed",
                name: 'showWorkScope',
                inputValue: 'removed',
                disabled: false,
                margin: '0 10 0 10',
                checked: false

            }],
            listeners: {
                scope: this,
                change: this._updateApp
            }
        };
    },
    _getOrganizeByType: function(labelWidth, boxWidth){
        return {
            xtype: 'radiogroup',
            fieldLabel: 'Organize By',
            itemId: 'selectedOrganizeBy',
            columns: 3,
            style: {
                align: 'left'
            },
            allowBlank: false,
            vertical: false,
            labelWidth: labelWidth,
            margin: '25 0 10 0',
            padding: 5,
            layout: 'fit',
            labelAlign: 'right',
            items: [{
                boxLabel: "Project",
                inputValue: 'Project',
                margin: '0 10 0 10',
                name: 'organizeBy',
                disabled: false,
                checked: true
            },{
                boxLabel: "Day",
                inputValue: 'Day',
                name: 'organizeBy',
                disabled: false,
                margin: '0 10 0 10',
                checked: false

            }],
            listeners: {
                scope: this,
                change: this._updateApp
            }
        };
    },
    _loadMatchingIterations: function(timebox){
        if (!timebox || !timebox.getRecord()){
            //Todo add message that there is no selected iteration;
            this.logger.log('_loadMatchingIterations no timebox selected');
            return;
        }

        var filters = [{
            property: 'Name',
            value: timebox.getRecord().get('Name')
        },{
            property: 'StartDate',
            value: timebox.getRecord().get('StartDate')
        },{
            property: 'EndDate',
            value: timebox.getRecord().get('EndDate')
        }];

        this.logger.log('_loadScopeRevisions', filters);

        var store = Ext.create('Rally.data.wsapi.Store',{
            model: 'Iteration',
            filters: filters,
            context: {
                project: this.getContext().getProject()._ref,
                projectScopeDown: this.getContext().getProjectScopeDown(),
                projectScopeUp: false
            },
            fetch: ['StartDate','Name','EndDate','RevisionHistory','Project'],
            limit: 'Infinity'
        });
        store.load({
            callback: this._loadScopeRevisions,
            scope: this
        });

    },
    _loadScopeRevisions: function(records, operation){
        var promises = [];

        if (!operation.wasSuccessful()){
            this.logger.log('_loadMatchingIterations failed', operation)
            //Todo alert the user and put a message up
            return;
        }
        this.logger.log('_loadMatchingIterations', records, operation);
        if (records.length === 0){
            this.logger.log('_loadScopeRevisions 0 records');
            return;
        }

        _.each(records, function(r){
            promises.push(this._fetchHistory(r));
        }, this);

        Deft.Promise.all(promises).then({
            success: function(revisions){
                this.logger.log('_loadScopeRevisions success', revisions);
                this.timeboxParser = Ext.create('Rally.technicalservices.TimeboxHistoryParser',{
                    timeboxRecords: records,
                    historyRecords: revisions,
                    hoursOffset: this.getSetting('hoursOffset')
                });
                var formattedIDs = this.timeboxParser.getArtifactFormattedIDs();

                this.logger.log('parsed histories', this.timeboxParser, formattedIDs);
                if (formattedIDs.length > 0){
                    this._fetchArtifactData(this.timeboxParser.getArtifactFormattedIDs()).then({
                        success: function(artifacts){
                            this.timeboxParser.aggregateArtifactData(artifacts);
                            this._updateApp();
                        },
                        failure: function(msg){},
                        scope: this
                    });
                } else {
                    this._updateApp();
                }

            },
            failure: function(msg){
                this.logger.log('_loadScopeRevisions failure', msg);
            },
            scope: this
        });
    },
    _fetchHistory: function(record){
        var deferred = Ext.create('Deft.Deferred');

        var filter = Ext.create('Rally.data.wsapi.Filter',{
            property:"RevisionHistory",
            value: record.get('RevisionHistory')._ref
        });
        this.logger.log('_fetchHistory', filter.toString());
        var store = Ext.create('Rally.data.wsapi.Store',{
            model:'Revision',
            filters: filter,
            limit: Infinity,
            fetch: ['Description','CreationDate','User'],
            sorters: [{property:'CreationDate',direction:'ASC'}]
        });

        store.load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    deferred.resolve(records);
                } else {
                    deferred.reject(operation.error.errors.join(','));
                }
            }
        });
        return deferred;
    },
    _updateApp: function(){

        if (this.down('rallygrid')){
            this.down('rallygrid').destroy();
        }

        var timebox = this.getContext().getTimeboxScope().getRecord(),
            showWorkScope = 'all', // this.down('#selectedShowWorkScope').getValue().showWorkScope,
            organizeBy = this.down('#selectedOrganizeBy').getValue().organizeBy;

        this.logger.log('_updateApp', showWorkScope, organizeBy, timebox);

        var data = this.timeboxParser.getActivityData(),
            summary = this.timeboxParser.getSummary();

        this.down('#iterationStatusTemplate').update(Ext.merge(summary, timebox.getData()));

        this._buildGrid(data, organizeBy);
    },

    _buildGrid: function(data, organizeBy){
        if (organizeBy !== 'Day' && organizeBy !== 'Project'){
            organizeBy = 'Day';
        }

        this.logger.log('_buildGrid', data, organizeBy, this._getColumnCfgs());
        var store = Ext.create('Rally.data.custom.Store', {
            data: data,
            groupField: organizeBy,
            groupDir: 'ASC',
            pageSize: data.length
        });
        this.add({
            xtype: 'rallygrid',
            features: [{
                ftype: 'groupingsummary',
                groupHeaderTpl: '{name} ({rows.length})',
                startCollapsed: true
            }],
            showPagingToolbar: false,
            emptyText: '<p>No Scope Changes found.</p>',
            store: store,
            columnCfgs: this._getColumnCfgs()
        });

    },
    _statusRenderer: function(value){
        if (value === 'Added'){
            return '<span class="added"><b>+</b></span>';
        }
        if (value === 'Removed'){
            return '<span class="removed"><b>-</b></span>';
        }
        return value;
    },
    _getColumnCfgs: function(){
        return [{
            text: 'Status',
            dataIndex: 'Status',
            flex: 1,
            renderer: this._statusRenderer
            },{
            text: 'ID',
            dataIndex: 'FormattedID',
            flex: 1,
            renderer: function (value, metaData, record) {
                if (record.get('_ref')){
                    return Ext.create('Rally.ui.renderer.template.FormattedIDTemplate',{}).apply(record.data);
                }
                return value;

            }
        },{
            text: 'Name',
            dataIndex: 'Name',
            flex: 2
        },{
            text: 'Project',
            dataIndex: 'Project',
            flex: 2
        },{
            text: 'Day',
            dataIndex: 'Day',
            flex: 1
        },{
            text: 'Parent',
            dataIndex: 'Parent',
            flex: 3,
            renderer: function (value, metaData, record) {
                if (record.get('Parent')){
                    return Ext.create('Rally.ui.renderer.template.ParentTemplate').apply(record.data);
                }
                return '';

            }
        },{
            text: 'Est',
            dataIndex: 'PlanEstimate',
            flex: 1
        },{
            text: 'User',
            dataIndex: 'User',
            flex: 1
        }];
    },
    _fetchArtifactData: function(artifactFormattedIds){
        var deferred = Ext.create('Deft.Deferred');

        var chunked_filters = [], idx = -1, chunkSize = 10;

        for (var i=0; i<artifactFormattedIds.length; i++){
            if (i % chunkSize === 0){
                idx++;
                chunked_filters.push([]);
            }
            chunked_filters[idx].push({property: 'FormattedID', value: artifactFormattedIds[i] });
        }

        var promises = [];
        _.each(chunked_filters, function(chunk){
            promises.push(this._fetchChunk({
                models: ['Defect', 'DefectSuite', 'UserStory','TestSet'],
                fetch: ['FormattedID','Name','Parent','PortfolioItem','Requirement','PlanEstimate'],
                filters: Rally.data.wsapi.Filter.or(chunk),
                limit: 'Infinity',
                context: { project: null }
            }));
        }, this);

        Deft.Promise.all(promises).then({
            success: function(results){
                var records = _.flatten(results);
                deferred.resolve(records);
            },
            failure: function(msg){
                deferred.reject(msg);
            },
            scope: this
        });


        return deferred;
    },
    _export: function(){
        var file_util = Ext.create('Rally.technicalservices.FileUtilities',{});

        var csv = file_util.getCSVFromData(this, this.down('rallygrid'),this._getExportColumnCfgs());
        file_util.saveCSVToFile(csv, 'export.csv');
    },
    _getExportColumnCfgs: function(){
        return [{
            text: 'Status',
            dataIndex: 'Status'
        },{
            text: 'ID',
            dataIndex: 'FormattedID'
        },{
            text: 'Name',
            dataIndex: 'Name'
        },{
            text: 'Project',
            dataIndex: 'Project'
        },{
            text: 'Day',
            dataIndex: 'Day'
        },{
            text: 'Parent ID',
            dataIndex: 'Parent',
            renderer: function (value, metaData, record) {
                if (record.get('Parent')){
                    return record.get('FormattedID');
                }
                return '';

            }
        },{
            text: 'Parent Name',
            dataIndex: 'Parent',
            renderer: function (value, metaData, record) {
                if (record.get('Parent')){
                    return record.get('Name');
                }
                return '';

            }
        },{
            text: 'Est',
            dataIndex: 'PlanEstimate',
            flex: 1
        },{
            text: 'User',
            dataIndex: 'User',
            flex: 1
        }];
    },

    _fetchChunk: function(config){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.artifact.Store', config).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    deferred.resolve(records);
                } else {
                    deferred.reject(Ext.String.format("Error loading artifacts with filter [{0}]: {1}", config.filters.toString(), operation.error.errors.join(',')));
                }

            },
            scope: this
        });

        return deferred;
    },

    _updateIterationStatus: function(timebox){
        var data = timebox && timebox.getRecord() && timebox.getRecord().getData() || {};
        this.down('#iterationStatusTemplate').update(data);

    },
    getSettingsFields: function(){
        return [{
            xtype: 'rallynumberfield',
            minValue: 0,
            name: 'hoursOffset',
            fieldLabel: 'Ignore scope changes for this number of hours after the iteration begins:',
            labelWidth: 400,
            labelAlign: 'right'
        }];
    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        Ext.apply(this, settings);
        this.launch();
    }
});
