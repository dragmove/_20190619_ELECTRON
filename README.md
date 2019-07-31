# TEST ELECTRON + SERVICE WORKER
Test serviceworker on web, electron environment.

## About
* Test Electron App that load localhost web page and install service worker


## Run

```sh
npm i -g @electron-forge/cli // https://www.electronforge.io/cli
npm install

// If you try to connect socket only on index.html, run socket server by nodemon
// npm run start:socket-server

// Web App
npm run start:web // run and connect http://localhost:9001 Web App

// Electron App
npm run start:web // run http://localhost:9001 Web App
npm run start // run Electron App and load http://localhost:9001/index.js

npm run make // build Electron App to /out/make/squirrel.windows/x64/my-app-0.0.1 Setup.exe file. install this file on windows env.
```


## Contact
* @Website : http://www.dragmove.xyz
* @Blog : https://blog.naver.com/dragmove
* @LinkedIn : https://www.linkedin.com/in/hyun-seok-kim-99748295/
* @E-mail : dragmove@gmail.com


## License
[MIT license](http://danro.mit-license.org/).