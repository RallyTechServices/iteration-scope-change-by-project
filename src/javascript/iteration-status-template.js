Ext.define('Rally.technicalservices.IterationStatusTemplate',{
    extend: 'Ext.XTemplate',

    constructor: function(config) {
        var templateConfig = [
            '<tpl if="this.isNotEmpty(values)">',
            '<div class="iterationinfo">{Name} ({[this.getDuration(values)]} Days, {[this.getStatus(values)]})</div>',
            '</tpl>',
            {
                isNotEmpty: function(recordData){
                    if (recordData && recordData.Name && recordData.EndDate && recordData.StartDate){
                        return true;
                    }

                    return false;
                },
                getStatus: function(recordData) {
                    var today = new Date();

                    if (recordData.EndDate < today){
                        return "Done";
                    }

                    if (recordData.StartDate > today){
                        return "Not Started";
                    }

                    return this.getRemainingDays(recordData) + " Days remaining";
                },
                getRemainingDays: function(recordData){
                    return Rally.util.DateTime.getDifference(recordData.EndDate, new Date(), 'day');
                },
                getDuration: function(recordData){
                    return Rally.util.DateTime.getDifference(recordData.EndDate, recordData.StartDate, 'day');
                }
            },
            config
        ];

        return this.callParent(templateConfig);
    }
});
