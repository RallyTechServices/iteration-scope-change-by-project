Ext.define('Rally.technicalservices.TimeboxHistoryParser',{
    extend: 'Ext.Base',

    mixins: {
        observable: 'Ext.util.Observable'
    },

    historyRecords: undefined,
    timeboxRecords: undefined,
    activityData: undefined,

    constructor: function (config) {
        this.mixins.observable.constructor.call(this, config);

        this.historyRecords = (config && config.historyRecords) || [];
        this.timeboxRecords = (config && config.timeboxRecords) || [];
        this.activityData = [];

        var hoursOffset = config.hoursOffset || 0;

        this._parseHistories(this.timeboxRecords, this.historyRecords, hoursOffset);
    },
    _parseHistories: function(timeboxRecords, historyRecords, hoursOffset){
        var activityData = [];

        for (var i = 0; i < timeboxRecords.length; i++) {
            var revisions = historyRecords[i],
                record = timeboxRecords[i];

            _.each(revisions, function (rev) {

                var dataDate = Rally.util.DateTime.fromIsoString(rev.get('CreationDate')),
                    endDate = Rally.util.DateTime.fromIsoString(record.get('EndDate')),
                    startDate = Rally.util.DateTime.fromIsoString(record.get('StartDate')),
                    description = rev.get('Description');

                if (hoursOffset > 0){
                    var startHours = startDate.getHours()
                    startDate.setHours(startHours + hoursOffset);
                }
                //endDate.setHours(23, 59, 59, 0);

                if (/Scheduled|Unscheduled/.test(description) &&
                    dataDate >= startDate && dataDate <= endDate) {

                    var splitRevision = description.split(',');
                    for (var num = 0; num < splitRevision.length; num++) {

                        var action = this._getAction(splitRevision[num]);
                        if (action) {

                            var formattedId = this._getFormattedID(splitRevision[num]);

                            if (formattedId !== null) {
                                var wasDeleted = this._getWasDeleted(description);

                                activityData.push({
                                    Status: action,
                                    FormattedID: formattedId,
                                    User: rev.get('User')._refObjectName,
                                    CreationDate: dataDate,
                                    Project: record.get('Project').Name,
                                    isDeleted: wasDeleted,
                                    Name: null,
                                    Day: Rally.util.DateTime.formatWithDefault(dataDate),
                                    Parent: null,
                                    PlanEstimate: 0
                                });
                            }
                        }
                    }
                }
            }, this);
        }
        this.activityData = activityData;
    },
    getArtifactFormattedIDs: function(){
        if (this.activityData.length === 0){
            return [];
        }
        return _.pluck(this.activityData, 'FormattedID');
    },
    getActivityData: function(){
        return this.activityData || [];
    },
    aggregateArtifactData: function(artifacts){

        var artifactHash = {};
        _.each(artifacts, function(a){
            artifactHash[a.get('FormattedID')] = a;
        });

        _.each(this.activityData, function(obj){
            obj.isDeleted = false;
            var artifact = artifactHash[obj.FormattedID] || null;
            if (artifact){
                obj._ref = artifact.get('_ref');
                obj.Name = artifact.get('Name');
                obj.Parent = artifact.get('Parent') || artifact.get('PortfolioItem') || artifact.get('Requirement') || null;
                obj.PlanEstimate = artifact.get('PlanEstimate') || 0;

            } else {
                obj.isDeleted = true;
                obj.Name = "<i>Deleted</i>"
            }
        });
    },
    getSummary: function(){
        var countAdded = 0,
            countRemoved = 0,
            pointsAdded = 0,
            pointsRemoved = 0,
            hash = {
                Added: {
                    Count: 0,
                    Points: 0
                },
                Removed: {
                    Count: 0,
                    Points: 0
                }
            };

        _.each(this.activityData, function(obj){
            hash[obj.Status].Count++;
            hash[obj.Status].Points += obj.PlanEstimate;

            if (obj.Status === 'Added'){
                countAdded++;
                pointsAdded += obj.PlanEstimate || 0;
            }
            if (obj.Status === 'Removed'){
                countRemoved++;
                pointsRemoved += obj.PlanEstimate || 0;
            }

        });

        var data = [];
        data.push({Description: 'Added', Count: countAdded, Points: pointsAdded});
        data.push({Description: 'Removed', Count: countRemoved, Points: pointsRemoved});
        data.push({Description: 'Net', Count: countAdded - countRemoved, Points: pointsAdded - pointsRemoved});

        return hash;
    },
    _getPrefix: function(formattedID){
        return formattedID.replace(/[0-9]/g, "");
    },
    _getWasDeleted: function(description){
        if (/Unscheduled/.test(description) && /\(Moved to Recycle Bin\)]$/.test(description)) {
            return true;
        }
        return false;
    },
    _getAction: function (description) {
        if (/Unscheduled/.test(description)) {
            return "Removed";
        }

        if (/Scheduled/.test(description)) {
            return "Added";
        }
        return null;
    },
    _getFormattedID: function(description){
        var artifactName = description.split("[");

        if (typeof artifactName[1] === 'undefined') {
            artifactName = description.split(":");
        }

        if (typeof artifactName[1] === 'undefined') {
            return null;
        }

        var formattedID = artifactName[1].split(":");
        formattedID = formattedID[0].replace(/^\s*|\s*$/g, '');

        return formattedID;
    },


});