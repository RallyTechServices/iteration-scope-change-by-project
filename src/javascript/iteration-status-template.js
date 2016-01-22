Ext.define('Rally.technicalservices.IterationStatusTemplate',{
    extend: 'Ext.XTemplate',

    constructor: function(config) {
        var templateConfig = [
            '<tpl if="this.isNotEmpty(values)">',
            '<div class="iterationinfo"><b>{Name} ({[this.getDuration(values)]} Days, {[this.getStatus(values)]})</b></div>',
            '<table class="summary"><tr>',
            '<td width=100 border="0"></td>',
            '<th width=100 align=right class="summary"><b>Count</b></th>',
            '<th width=100 align=right class="summary"><b>Points</b></th>',
            '</tr>',
            '<tr>',
            '<td width=100 align=right><span class="added"><b>+</b></span>&nbsp;Added</td>',
            '<td width=100 align=right>{[this.getAddedCount(values)]}</td>',
            '<td width=100 align=right>{[this.getAddedPoints(values)]}',
            '</td>',
            '</tr><tr>',
            '<td width=100 align=right><span class="removed"><b>-</b></span>&nbsp;Removed</td>',
            '<td width=100 align=right>{[this.getRemovedCount(values)]}</td>',
            '<td width=100 align=right>{[this.getRemovedPoints(values)]}</td>',
            '</tr><tr>',
            '<th width=100 align=right class="net summary"><b>Net</b></th>',
            '<td width=100 align=right><b>{[this.getNetCount(values)]}</b></td>',
            '<td width=100 align=right><b>{[this.getNetPoints(values)]}</b></td>',
            '</tr></table>',
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
                },
                getRemovedCount: function(recordData){
                    return recordData.Removed.Count;
                },
                getRemovedPoints: function(recordData){
                    return recordData.Removed.Points.toFixed(1);
                },
                getAddedCount: function(recordData){
                    return recordData.Added.Count;
                },
                getAddedPoints: function(recordData){
                    return recordData.Added.Points.toFixed(1);
                },
                getNetCount: function(recordData){
                    var net = recordData.Added.Count - recordData.Removed.Count;
                    if (net > 0){
                        return this.getAddedSpan(net);
                    }
                    if (net === 0){
                        return '0';
                    }
                    return this.getRemovedSpan(net);

                },
                getNetPoints: function(recordData){
                    var net = Number(recordData.Added.Points - recordData.Removed.Points).toFixed(1);
                    if (net > 0){
                        return this.getAddedSpan(net);
                    }
                    if (net === 0){
                        return '0';
                    }
                    return this.getRemovedSpan(net);
                },
                getAddedSpan: function(additionalText){
                    return Ext.String.format('<span class="added"><b>+</b></span>&nbsp;{0}',additionalText || '');
                },
                getRemovedSpan: function(additionalText){
                    return Ext.String.format('<span class="removed"><b>-</b></span>&nbsp;{0}',additionalText || '');
                }
            },
            config
        ];

        return this.callParent(templateConfig);
    }
});
