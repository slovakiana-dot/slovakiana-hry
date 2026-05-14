const { app, BrowserWindow } = require('electron')
const ipc = require('electron').ipcMain;
const fs = require('fs');
const net = require('net');

var win;
var config;
var networkClient;
var name = "Zoom";

function initializeNetwork(host, port)
{
    console.log('Connecting to launcher');

    networkClient = net.connect({host:host, port:port},  () => {
      console.log('Connected');
      send("INITIALIZED");
      send("LOADED");
      ping();
    });

    networkClient.on('error', function(ex) {
      console.log(ex);
      setTimeout(() => { initializeNetwork();}, 10000);    

    });

    networkClient.on('data', (data) => {
      receive(data.toString());
    });

    networkClient.on('end', () => {
      console.log('Disconnected from server');
      setTimeout(() => { initializeNetwork();}, 10000);    
    });  
}

function ping()
{
  send("PING");
  setTimeout(() => { ping();}, 1000);
}

function send(message)
{
  if (networkClient)
  {
    message = name + ";" + message + ";@";
    networkClient.write(message);    
  }    
}

function receive(message)
{
  console.log(message);  
}

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    alwaysOnTop: true,
    fullscreen : true,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  win.loadFile('dist/index.html')

  // Open the DevTools in debug mode
  if (config && config.debug) win.webContents.openDevTools()

  // Initialize network
  initializeNetwork("127.0.0.1", 44444);
}

// Read standalone config file
fs.readFile("config.json", function(err, data) {

  config = JSON.parse(data);  
  console.log("Config loaded");

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(createWindow)  
  
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    app.quit() 
})

app.on('activate', () => {
  // // On macOS it's common to re-create a window in the app when the
  // // dock icon is clicked and there are no other windows open.
  // if (BrowserWindow.getAllWindows().length === 0) {
  //   createWindow()
  // }
})

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {  
  console.log("I'm about to quit");
  send("SHOW");
  globalShortcut.unregisterAll();
  if(win) {
      win.removeAllListeners('close');
      win.close();  
  }  
});

ipc.on('close', function (event, arg) {
    win.close();
    app.quit();
});

ipc.on('get-config', function (event, arg) {
  event.returnValue = config;
});