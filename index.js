const express = require('express');
const bodyParser = require('body-parser');
const tmp = require('tmp');
const fs = require('fs');
const crypto = require('crypto');
var app = express();

let md5sum = crypto.createHash('md5');
let sketchCache = {};

function rawBody(req, res, next) {
  req.setEncoding('utf8');
  req.rawBody = '';
  req.on('data', function(chunk) {
    req.rawBody += chunk;
  });
  req.on('end', function(){
    next();
  });
}

app.use(express.static('/home/ubuntu/public/build/'));

app.use(rawBody);

app.get(
  '/sketches/:id',
  (req, res, next) => {
    let prelude = `
      (function(){
        var oldLog = console.log;
        console.log = function (message) {
          var logTarget = document.getElementById('logMessages');
          var newEl = document.createElement('div');
          newEl.innerText = message;
          newEl.className = 'logMessage';
          logTarget.appendChild(newEl);
          oldLog.apply(console, arguments);
        };
      })();`;
    let errorMessages = '';
    if (sketchCache[req.params.id].errors) {
      errorMessages =
        sketchCache[req.params.id].errors.map(
          msg =>
            ` <div class="errorMessage">
                ${msg.replace(/\[[0-9]?[0-9]m/gi, '')}
              </div>`).join('\n');
      console.log(`Serving ${sketchCache[req.params.id].errors.length}.`)
      console.log(errorMessages)
    }
    let responseFormat = `
      <html>
        <head>
          <style>
            #logMessages {
              border-top: solid black 1px;
              font-size: 0.5em;
              font-family: Mono;
            }
            .logMessage {
              color: orange;
            }
            .errorMessage {
              color: rgb(255, 0, 0);
              background-color: rgba(255, 0, 0, 0.25);
              text-decoration: italic;
            }
          </style>
        </head>
        <body>
          <div style="display: flex; flex-direction: column">
            <canvas style="flex: 4" height="250" id="jbt"></canvas>
            <div id="logMessages" style="flex: 1">
              ${errorMessages}
            </div>
          </div>
          <script>
            ${prelude}
            ${sketchCache[req.params.id].bundle}
          </script>
        </body>
      </html>
    `;
    res.send(responseFormat);
  }
);

app.post(
  '/run-code',
  (req, res, next) => {
    console.log(req.rawBody);
    let hash = crypto.createHash('md5').update(new Buffer(req.rawBody)).digest('hex');
    console.log('Got hash ' + hash);
    if (sketchCache[hash]) {
      res.send(hash);
    } else {
      tmp.file(
        (err, path, fd, cleanup) => {
          fs.write(fd, req.rawBody, (_) => 0);
          console.log('Using tmp file ' + path);
          // 'execute' function stolen from https://stackoverflow.com/a/12941186
          function execute(command, callback){
            var exec = require('child_process').exec;
            exec(
              command,
              function(error, stdout, stderr){
                callback(stdout, stderr);
              }
            );
          };
          execute(
            'docker run -v ' + path + ':/home/test/src/main.re reasonml-graphics-playground-sandbox:latest',
            (bundle, error) => {
              let acc = {};
              acc.bundle = bundle;
              if (error) {
                acc.errors = error.split(/\r?\n/i);
                console.log('Logging errors...');
                console.log(acc.errors);
              }
              sketchCache[hash] = acc;
              res.send(hash);
            }
          )
        }
      )
    }
  });

app.listen(80);