const http = require('http');
const path = require('path');
const Koa = require('koa');
const Router = require('koa-router');
const koaBody = require('koa-body');
const koaStatic = require('koa-static');
const fs = require('fs');
const uuid = require('uuid');
const WS = require('ws');

const fetch = require('node-fetch');

const app = new Koa();

const public = path.join(__dirname, '/public')
app.use(koaStatic(public));

// CORS
app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*', };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({ ...headers });
    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }

    ctx.response.status = 204;
  }
});


app.use(koaBody({
  text: true,
  urlencoded: true,
  multipart: true,
  json: true,
}));

const router = new Router();
const server = http.createServer(app.callback())
const wsServer = new WS.Server({ server });

const arrMessges = [];

let initMsg = false;

router.get('/initmsg', async (ctx, next) => {
  if (!initMsg) {
    initMsg = true;

    const resp = await fetch('http://localhost:7070/msg.json');
    const body = await resp.text();
    // console.log(body);
    const arrInitMsg = JSON.parse(body);
    arrMessges.push(...arrInitMsg);
  
    ctx.response.body = arrMessges[0];
  }
  ctx.response.body = 'ok';
});

// router.get('/msg', async (ctx, next) => {
//   console.log('get index');
//   ctx.response.body = arrMessges;
//   // ctx.response.body = 'hello';
// });

router.get('/msg/:numb', async (ctx, next) => {
  // console.log('get index');
  console.log('get numb', ctx.params.numb);
  // console.log(arrMessges[ctx.params.numb]);
  const endArr = arrMessges.length - ctx.params.numb;
  const startArr = (endArr - 10) < 0 ? 0 : (endArr - 10);
  const returnArr = arrMessges.slice(startArr, endArr).reverse();

  // for (const item of returnArr) {
  //   [...wsServer.clients]
  //     .filter(o => {
  //       return o.readyState === WS.OPEN;
  //     })
  //     .forEach(o => o.send(item));
  // }

  ctx.response.body = returnArr;
  // ctx.response.body = 'hello';
});

router.get('/users', async (ctx, next) => {
  console.log('get index');
  ctx.response.body = clients;
});

router.post('/msg', async (ctx, next) => {

  // create new contact
  const msgOb = {...ctx.request.body};
  arrMessges.push(msgOb);
  // [...wsServer.clients][0].send(JSON.stringify(msgOb));
    [...wsServer.clients]
    .filter(o => {
      return o.readyState === WS.OPEN;
    })
    .forEach(o => o.send(JSON.stringify(msgOb)));
    // console.log({...ctx.request.body});
  ctx.response.status = 204
});

// router.post('/initmsg', async (ctx, next) => {

//   // create new contact
//   const msgOb = {...ctx.request.body};
//   arrMessges.push(msgOb);
//   // [...wsServer.clients][0].send(JSON.stringify(msgOb));
//     [...wsServer.clients]
//     .filter(o => {
//       return o.readyState === WS.OPEN;
//     })
//     .forEach(o => o.send(JSON.stringify(msgOb)));
//     // console.log({...ctx.request.body});
//   ctx.response.status = 204
// });

// router.delete('/users/:name', async (ctx, next) => {
//   // remove contact by id (ctx.params.id)
//   console.log(ctx.params.name);
//   const index = clients.findIndex(({ name }) => name === ctx.params.name);
//   if (index !== -1) {
//     clients.splice(index, 1);
//   };
//   ctx.response.status = 204
// });

wsServer.on('connection', (ws, req) => {
  console.log('connection');
  ws.on('message', (msg) => {
    // console.log(msg);
    // add in arr message
    arrMessges.push(msg);

    [...wsServer.clients]
    .filter(o => {
      return o.readyState === WS.OPEN;
    })
    .forEach(o => o.send(msg));
  });
  ws.on('close', (msg) => {
    console.log('close');
    [...wsServer.clients]

    .filter(o => {
      return o.readyState === WS.OPEN;
    })
    .forEach(o => o.send(JSON.stringify({type: 'del user'})));
    ws.close();
  });
  // new users
  [...wsServer.clients]
    .filter(o => {
      return o.readyState === WS.OPEN;
    })
    .forEach(o => o.send(JSON.stringify({type: 'add user'})));
//  ws.send('welcome');
});

app.use(router.routes()).use(router.allowedMethods());
const port = process.env.PORT || 7070;
server.listen(port);
