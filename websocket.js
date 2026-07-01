import { requestId, src, readyState, rebootAlert, auth_en, auth, isNotify } from "../store";
import { push } from "svelte-spa-router";
import { generateRandomHex } from '../utils/common'
import { notifyStatus, notifyEvent } from './notify'

let interval;
let requestQueue = new Map(); // *存储ws事件id和事件回调函数
let id;
let autoRefresh;

/**
 * *websocket请求类。
 * *构造函数中创建 ws；提供 request 方法，用于发起请求。
 */
class WebsocketClient {
  constructor() {
    createWS();
  }

  /**
   * 
   * @param {String} method 事件名称，即接口url
   * @param {Object / String} params 参数
   * @returns Promise
   */
  request(method, params) {
    return new Promise((resolve) => {
      if (window.socket.readyState === 1) { // *open，可直接发起请求
        sendWs(method, params, resolve)
      }
      window.socket.addEventListener("open", (event) => { // *页面首次加载监听open状态
        readyState.set(window.socket.readyState)
        sendWs(method, params, resolve)
      });
    })
  }
}

/**
 * *websocket发起请求。
 * *每次发起请求都需要设置请求 id，id依次加 1，并以 id 为 key 放在请求队列中，请求成功后再将其从队列中删除。
 * @param {String} method 事件名称，即接口url
 * @param {Object / String} params 参数
 * @param resolve 请求的回调事件
 */
function sendWs(method, params, resolve) {
  requestId.subscribe(value => {
    id = value; // *获取 store 中的请求 id
  });
  readyState.set(window.socket.readyState)
  const option = { // *ws事件发送
    id: id,
    src: src,
    method: method,
  }
  if (params) {
    option['params'] = params;
  }
  let authEn = false;
  auth_en.subscribe(value => {
    authEn = value
  })
  if (authEn) {
    let isLogin = false;
    auth.subscribe((value) => {
      if (value.response) {
        isLogin = true;
      }
    });
    // *需要登录
    if (!isLogin) {
      // *未登录，跳转到 login 页面
      const url = window.location.hash.replace('#', '')
      if (url !== '/login') {
        sessionStorage.setItem('refoss_route', url)
      }
      push(`/login`);
    } else {
      // *已登录，接口传参增加 auth 参数
      auth.subscribe(value => {
        option['auth'] = value;
      })
    }
  }
  window.socket.send(JSON.stringify(option))
  requestQueue.set(id, (data) => { // *存储ws事件id和回调函数
    resolve(data.result || data.error); // *成功返回result，失败返回error
  })
  requestId.update(n => n + 1); // *每次send后id自动加1
}
// *设置 auth 需要的参数
function setAuth(message) {
  const res = JSON.parse(message);
  const cnonce = generateRandomHex(16);
  const nonce = res.nonce;
  const nc = res.nc;
  auth.update(value => {
    value.nonce = nonce;
    value.cnonce = cnonce;
    value.nc = nc;
    return value;
  })
}
/**
 * *创建连接，并监听 websocket 的 open、message、close、error 状态。
 */
function createWS() {
  if (!window.socket) {
    // window.socket = new WebSocket('ws://192.168.4.20/rpc');
    // window.socket.addEventListener('message', (e) => {
    //   console.log('Mock 返回:', JSON.parse(e.data));
    // });
    window.socket = new WebSocket(`ws://192.168.4.20/rpc`); // *EM06
    // window.socket = new WebSocket(`http://10.10.10.1/rpc`);
    // window.socket = new WebSocket(`ws://${window.location.hostname}/rpc`); // *打包给固件用
  }
  window.socket.addEventListener("open", (event) => { // *页面首次加载监听open状态
    readyState.set(window.socket.readyState)
    window.socket.send(JSON.stringify({
        id: 0,
        method: 'Refoss.DeviceInfo.Get',
        params: {}
      }));
  });
  window.socket.addEventListener('message', (event) => {// *监听ws返回事件
    isNotify.subscribe(value => {
      autoRefresh = value;
    })
    readyState.set(window.socket.readyState)
    const { data } = event;
    const res = JSON.parse(data);
    const { id } = res;
    if (id !== undefined) {
      const callback = requestQueue.get(id); // *普通请求：根据id定位接口返回数据
      callback?.(res);
      requestQueue.delete(id); // *回调之后删掉请求队列
      if (res?.result) {
        // *请求通过
        if (res?.result?.restart_required) {
          rebootAlert.set(res?.result?.restart_required); // *重启处理
        }
      } else if (res?.error) {
        if (res.error.code === 401) {
          // *需要登录，跳转到登录页，参数保留原路径
          auth_en.set(true);
          // *401，需要取 message 中的数据存在 auth 中
          setAuth(res.error.message);
          push(`/login`);
        }
      }
    } else if (res?.method === 'NotifyStatus') {
      if (autoRefresh && res.params && Object.keys(res.params).length) {
        notifyStatus(res.params)
      }
    } else if (res?.method === 'NotifyEvent') {
      if (autoRefresh && res?.params?.events?.length) {
        notifyEvent(res.params.events);
      }
    }
  })
  window.socket.addEventListener("close", (event) => { // *监听close状态
    console.log('close------');

    clearInterval(interval)
    readyState.set(window.socket.readyState);
    // *10s循环重启
    reconnect();
  });
  window.socket.addEventListener("error", (event) => { // *监听error状态
    console.log('error------');

    window.socket.close()
    readyState.set(window.socket.readyState);
  });
}

/** 
 * *重连 --- 10s未连接又重连，直到监听到 open 为止
*/
function reconnect() {
  interval = setInterval(() => {
    if (window.socket.readyState === 2 || window.socket.readyState === 3) {
      console.log('重启----');
      window.location.reload()
    }
  }, 10 * 1000)
}
export default WebsocketClient;