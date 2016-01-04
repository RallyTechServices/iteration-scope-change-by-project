Ext.define('Rally.technicalservices.IterationScopeChange.AggregateDataTemplate',{
    extend: 'Ext.XTemplate',

    constructor: function(config) {
        var templateConfig = [
            '<tpl><table><tr>',
            '<td width=20></td><td width=140></td><th width=50 align=left><b>Count</th>',
            '<th width=100 align=left><b>{planEstimateLabel}</b></th>',
            '<tr><td width=20 align=right><img src="/slm/mashup/1.11/images/plus.gif"></td>',
            '<th width=140 align=left>Total Added </th>',
            '<td width=50 align=left>{added}</td>',
            '<td width=100 align=left>{[this.getAddedEstimate(values)]}',
            '</td></tr><tr><td width=20 align=right><img src="/slm/mashup/1.11/images/minus.gif"></td>',
            '<th width=140 align=left>   Total Removed </th>',
            '<td width=50 align=left>{removed}</td>',
            '<td width=100 align=left>{[this.getRemovedEst(values)]}',
            '</td></tr><tr><td width=20 align=right></td>',
            '<th width=140 align=left><b>Net </b></th>',
            '<td width=50 align=left><b>{net}</b></td>',
            '<td width=100 align=left><b>{[this.getNetEst(values)]}',
            '</b></td></tr></table></tpl>',
            {
                getRemovedEst: function(recordData){
                    return 30;
                },
                getAddedEst: function(recordData) {
                    return 20;
                },
                getNetEst: function(recordData){
                    return 10;
                }
            },
            config
        ];

        return this.callParent(templateConfig);
    }
});
