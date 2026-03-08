const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    onPythonMessage: (callback) =>
        ipcRenderer.on('python-message', (event, msg) => callback(msg)),

    connectDevice: (device) =>
        ipcRenderer.send('connect-device', device),
    removeInput: (index)=>
        ipcRenderer.send('remove-input',index),
    addMapping: (mapping) =>
        ipcRenderer.send('add-mapping', mapping),
    loadMappings: () =>
        ipcRenderer.send('load-mappings'),
    saveMappings: (mappings) =>
        ipcRenderer.send('save-mappings', mappings),
});