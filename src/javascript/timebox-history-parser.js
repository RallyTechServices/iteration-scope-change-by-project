Ext.define('Rally.technicalservices.TimeboxHistoryParser',{
    extend: 'Ext.Base',

    mixins: {
        observable: 'Ext.util.Observable'
    },

    historyRecords: undefined,
    timeboxRecords: undefined,
    prefixes: undefined,
    aggregateBy: undefined,

    constructor: function (config) {
        this.mixins.observable.constructor.call(this, config);
    },
    getTimeboxActivityData: function(timeboxRecords, historyRecords){
        var activityData = [];

        for (var i = 0; i < timeboxRecords.length; i++) {
            var revisions = historyRecords[i],
                record = timeboxRecords[i];

            _.each(revisions, function (rev) {
                console.log('revisions', rev);
                var dataDate = Rally.util.DateTime.fromIsoString(rev.get('CreationDate')),
                    endDate = Rally.util.DateTime.fromIsoString(record.get('EndDate')),
                    startDate = Rally.util.DateTime.fromIsoString(record.get('StartDate')),
                    description = rev.get('Description');

                endDate.setHours(23, 59, 59, 0);

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
                                    PlanEstimate: null
                                });
                            }
                        }
                    }
                }
            }, this);
        }
        return activityData;
    },

    aggregateArtifactData: function(activityData, artifacts){

        var artifactHash = {};
        _.each(artifacts, function(a){
            artifactHash[a.get('FormattedID')] = a;
        });

        _.each(activityData, function(obj){
            obj.isDeleted = false;
            var artifact = artifactHash[obj.FormattedID] || null;
            if (artifact){
                obj.Name = artifact.get('Name');
                obj.Parent = artifact.get('Parent') && artifact.get('Parent')._ref || artifact.get('PortfolioItem') && artifact.get('PortfolioItem')._ref || artifact.get('Requirement') && artifact.get('Requirement')._ref || null;
                obj.PlanEstimate = artifact.get('PlanEstimate') || null;

            } else {
                obj.isDeleted = true;
                obj.Name = "<i>Deleted</i>"
            }
        });
        return activityData;
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