Ext.define('Rally.technicalservices.FileUtilities', {
    //singleton: true,
    logger: new Rally.technicalservices.Logger(),
    saveCSVToFile:function(csv,file_name,type_object){
            if (type_object == undefined){
                type_object = {type:'text/csv;charset=utf-8'};
            }
            var blob = new Blob([csv],type_object);
            saveAs(blob,file_name);
    },
    saveTextAsFile: function(textToWrite, fileName)
    {
        var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
        var fileNameToSaveAs = fileName;

        var downloadLink = document.createElement("a");
        downloadLink.download = fileNameToSaveAs;
        downloadLink.innerHTML = "Download File";
        if (window.webkitURL != null)
        {
            // Chrome allows the link to be clicked
            // without actually adding it to the DOM.
            downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
        }
        else
        {
            // Firefox requires the link to be added to the DOM
            // before it can be clicked.
            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
            downloadLink.onclick = destroyClickedElement;
            downloadLink.style.display = "none";
            document.body.appendChild(downloadLink);
        }
        downloadLink.click();
    },
    destroyClickedElement: function(event)
    {
        document.body.removeChild(event.target);
    },
    convertDataArrayToCSVText: function(data_array, requestedFieldHash){
       
        var text = '';
        Ext.each(Object.keys(requestedFieldHash), function(key){
            text += requestedFieldHash[key] + ',';
        });
        text = text.replace(/,$/,'\n');
        
        Ext.each(data_array, function(d){
            Ext.each(Object.keys(requestedFieldHash), function(key){
                if (d[key]){
                    if (typeof d[key] === 'object'){
                        if (d[key].FormattedID) {
                            text += Ext.String.format("\"{0}\",",d[key].FormattedID ); 
                        } else if (d[key].Name) {
                            text += Ext.String.format("\"{0}\",",d[key].Name );                    
                        } else if (!isNaN(Date.parse(d[key]))){
                            text += Ext.String.format("\"{0}\",",Rally.util.DateTime.formatWithDefaultDateTime(d[key]));
                        }else {
                            text += Ext.String.format("\"{0}\",",d[key].toString());
                        }
                    } else {
                        text += Ext.String.format("\"{0}\",",d[key] );                    
                    }
                } else {
                    text += ',';
                }
            },this);
            text = text.replace(/,$/,'\n');
        },this);
        return text;
    },
     /*
     * will render using your grid renderer.  If you want it to ignore the grid renderer,
     * have the column set _csvIgnoreRender: true
     */
    getCSVFromData:function(app, grid, exportColumns){
        var data = grid.getStore().data.items;

        var columns = exportColumns || grid.columns;
        var column_names = [];
        var headers = [];

        Ext.Array.each(columns,function(column){
            if ( column.dataIndex || column.renderer ) {
                column_names.push(column.dataIndex);
                if ( column.csvText ) {
                    headers.push(column.csvText);
                } else {
                    headers.push(column.text);
                }
            }
        });

        var csv = [];
        csv.push('"' + headers.join('","') + '"');
        _.each(data, function(item){

            var cell_values = [];
            _.each(columns, function(c){
                var cell_value = item.get(c.dataIndex);
                if (c.renderer || c.exportRenderer) {
                    if (c.exportRenderer){
                        cell_value = c.exportRenderer(cell_value, {}, item);
                    } else {
                        cell_value = c.renderer(cell_value, {}, item);
                    }

                }
                cell_values.push(cell_value);
            });
            csv.push('"' + cell_values.join('","') + '"');
        });
        return csv.join('\r\n');
    }
});