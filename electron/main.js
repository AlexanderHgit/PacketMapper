const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const { dialog } = require('electron');
const fs = require('fs');
let mainWindow;
let pythonProcess;
let lastPacket="pops";
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 700,
        height: 600,
        webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
        }
    });

    mainWindow.loadFile('electron/index.html');

    pythonProcess = spawn('python', ['backend/usb_backend.py']);

    pythonProcess.stdout.on('data', (data) => {
        if (data.toString()!==lastPacket){
        lastPacket=data.toString();
        console.log("PYTHON:", data.toString());
        }
        try{
        const message = JSON.parse(data.toString());
        mainWindow.webContents.send('python-message', message);
        } catch(error){
            console.error(error);
        }

    });
ipcMain.on('load-mappings', async () => {

    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (!result.canceled && result.filePaths.length > 0) {

        pythonProcess.stdin.write(JSON.stringify({
            type: "load_mappings",
            path: result.filePaths[0]
        }) + "\n");
    }
});
    ipcMain.on('connect-device', (event, device) => {
        pythonProcess.stdin.write(JSON.stringify({
            type: "connect",
            vendor_id: device.vendor_id,
            product_id: device.product_id
        })+ "\n");
        
    });
        ipcMain.on('remove-input', (event, index) => {
        pythonProcess.stdin.write(JSON.stringify({
            type: "remove_input",
            input: index
        })+ "\n");
        
    });
    ipcMain.on('add-mapping', (event, mapping) => {
    pythonProcess.stdin.write(JSON.stringify({
        type: "add_mapping",
        byte: mapping.byte,
        bit: mapping.bit,
        key: mapping.key
    }) + "\n");
});
ipcMain.on('save-mappings', async () => {

    const result = await dialog.showSaveDialog(mainWindow, {
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        defaultPath: 'mappings.json'
    });

    if (!result.canceled && result.filePath) {

        pythonProcess.stdin.write(JSON.stringify({
            type: "save_mappings",
            path: result.filePath
        }) + "\n");
    }
});
}

app.whenReady().then(createWindow);