/**
 * Navien WallPad Socket
 * @author Daehwan Kang, JiHun Roh
 * @since 2020-03-15
 */

const net = require('net');
const Delimiter = require('@serialport/parser-delimiter')
const mqtt = require('mqtt');

const CONFIG = require('/data/options.json');  //**** 애드온의 옵션을 불러옵니다. 이후 CONFIG.mqtt.username 과 같이 사용가능합니다. 
const CONST = {
  // 포트이름 설정/dev/ttyUSB0
  portName: process.platform.startsWith('win') ? "COM6" : CONFIG.serial.port,
  // SerialPort 전송 Delay(ms)
  sendDelay: CONFIG.sendDelay,
  // MQTT 브로커
  mqttBroker: 'mqtt://'+CONFIG.mqtt.server, // *************** 환경에 맞게 수정하세요! **************
  // MQTT 수신 Delay(ms)
  mqttDelay: CONFIG.mqtt.receiveDelay,

  mqttUser: CONFIG.mqtt.username,  // *************** 환경에 맞게 수정하세요! **************
  mqttPass: CONFIG.mqtt.password, // *************** 환경에 맞게 수정하세요! **************

  clientID: CONFIG.model+'-homenet',

  // 기기별 상태 및 제어 코드(HEX),
  DEVICES: [
    {name: '거실등1', status: 'ON' ,  commandHex: new Buffer([0xf7, 0x0e, 0x11, 0x41, 0x01, 0x01, 0xa9, 0x02])},
    {name: '거실등1', status: 'OFF',  commandHex: new Buffer([0xf7, 0x0e, 0x11, 0x41, 0x01, 0x00, 0xa8, 0x00])},
    {name: '거실등2', status: 'ON' ,  commandHex: new Buffer([0xf7, 0x0e, 0x12, 0x41, 0x01, 0x01, 0xaa, 0x04])},
    {name: '거실등2', status: 'OFF',  commandHex: new Buffer([0xf7, 0x0e, 0x12, 0x41, 0x01, 0x00, 0xab, 0x04])},
    {name: '복도등',  status: 'ON' ,  commandHex: new Buffer([0xf7, 0x0e, 0x13, 0x41, 0x01, 0x01, 0xab, 0x06])},
    {name: '복도등',  status: 'OFF',  commandHex: new Buffer([0xf7, 0x0e, 0x13, 0x41, 0x01, 0x00, 0xaa, 0x04])},
    {name: '침실등',  status: 'ON',   commandHex: new Buffer([0xf7, 0x0e, 0x21, 0x41, 0x01, 0x01, 0x99, 0x02])},
    {name: '침실등',  status: 'OFF',  commandHex: new Buffer([0xf7, 0x0e, 0x21, 0x41, 0x01, 0x00, 0x98, 0x00])},
    {name: '전열교환기',  status: 'ON',   commandHex: new Buffer([0xf7, 0x32, 0x01, 0x41, 0x01, 0x01, 0x85, 0xf2])},
    {name: '전열교환기',  status: 'OFF',  commandHex: new Buffer([0xf7, 0x32, 0x01, 0x41, 0x01, 0x00, 0x84, 0xf0])},
  ],
  SCENES: [ // 거실등1 - 거실등2 - 복도등
    {devicestatus: [{name: '거실등1', status:  'ON'}, {name: '거실등2', status:  'ON'}, {name: '복도등', status:  'ON'}], sceneHex: new Buffer([0x0e, 0x1f, 0x81, 0x04, 0x00, 0x01, 0x01, 0x01, 0x62, 0x0e])},
    {devicestatus: [{name: '거실등1', status: 'OFF'}, {name: '거실등2', status:  'ON'}, {name: '복도등', status:  'ON'}], sceneHex: new Buffer([0x0e, 0x1F, 0x81, 0x04, 0x00, 0x00, 0x01, 0x01, 0x63, 0x0E])},
    {devicestatus: [{name: '거실등1', status: 'OFF'}, {name: '거실등2', status: 'OFF'}, {name: '복도등', status:  'ON'}], sceneHex: new Buffer([0x0e, 0x1F, 0x81, 0x04, 0x00, 0x00, 0x00, 0x01, 0x62, 0x0C])},
    {devicestatus: [{name: '거실등1', status: 'OFF'}, {name: '거실등2', status: 'OFF'}, {name: '복도등', status: 'OFF'}], sceneHex: new Buffer([0x0E, 0x1F, 0x81, 0x04, 0x00, 0x00, 0x00, 0x00, 0x63, 0x0C])},
    {devicestatus: [{name: '거실등1', status: 'OFF'}, {name: '거실등2', status:  'ON'}, {name: '복도등', status: 'OFF'}], sceneHex: new Buffer([0x0E, 0x1F, 0x81, 0x04, 0x00, 0x00, 0x01, 0x00, 0x62, 0x0C])},
    {devicestatus: [{name: '거실등1', status:  'ON'}, {name: '거실등2', status:  'ON'}, {name: '복도등', status: 'OFF'}], sceneHex: new Buffer([0x0E, 0x1F, 0x81, 0x04, 0x00, 0x01, 0x01, 0x00, 0x63, 0x0E])},
    {devicestatus: [{name: '거실등1', status:  'ON'}, {name: '거실등2', status: 'OFF'}, {name: '복도등', status:  'ON'}], sceneHex: new Buffer([0x0E, 0x1F, 0x81, 0x04, 0x00, 0x01, 0x00, 0x01, 0x63, 0x0E])},
    {devicestatus: [{name: '거실등1', status:  'ON'}, {name: '거실등2', status: 'OFF'}, {name: '복도등', status: 'OFF'}], sceneHex: new Buffer([0x0E, 0x1F, 0x81, 0x04, 0x00, 0x01, 0x00, 0x00, 0x62, 0x0C])},
    {devicestatus: [{name: '침실등',  status:  'ON'}], sceneHex: new Buffer([0x0e, 0x2f, 0x81, 0x02, 0x00, 0x01, 0x54, 0x0c])},
    {devicestatus: [{name: '침실등',  status: 'OFF'}], sceneHex: new Buffer([0x0e, 0x2f, 0x81, 0x02, 0x00, 0x00, 0x55, 0x0c])},
    {devicestatus: [{name: '전열교환기',  status:  'ON'}], sceneHex: new Buffer([0x32, 0x01, 0x81, 0x05, 0x00, 0x01, 0x03, 0x03, 0x00, 0x41, 0xf8])},
    {devicestatus: [{name: '전열교환기',  status: 'OFF'}], sceneHex: new Buffer([0x32, 0x01, 0x81, 0x05, 0x00, 0x00, 0x03, 0x00, 0x00, 0x43, 0xf6])},
  ],
  // 상태 Topic (/homenet/${deviceId}${subId}/${property}/status/ = ${value})
  // 명령어 Topic (/homenet/${deviceId}${subId}/${property}/command/ = ${value})
  TOPIC_PREFIX: 'homenet'
};
var log = (...args) => console.log('[' + new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}) + ']', args.join(' '));

// 홈컨트롤 상태
var homeStatus = {};
var lastReceive = new Date().getTime();
var mqttReady = false;
var queue = new Array();

// MQTT-Broker 연결
const client  = mqtt.connect(CONST.mqttBroker);
client.on('connect', () => {
    var device_list = Array.from(new Set(CONST.DEVICES.map(function (e) { return e.name } )));
    var topics = new Array();
    device_list.forEach(device_name => { 
      topics.push(CONST.TOPIC_PREFIX + '/' + device_name + '/status');
      topics.push(CONST.TOPIC_PREFIX + '/' + device_name + '/command');
    })
    client.subscribe(topics, (err) => {if (err) log('MQTT Subscribe fail! -', CONST.DEVICE_TOPIC) });
});

// EW11 연결
const sock = new net.Socket();                             
sock.connect(CONFIG.socket.port, CONFIG.socket.deviceIP, function() {
  log('[Socket] Success connect server');                     
}); 
const parser = sock.pipe(new Delimiter({ delimiter: new Buffer([0xf7]) }));   

// 소켓 패킷이 SCENES 내 어떤 scene의 sceneHex와 동일하면 그 scene을 homeStatus와 다를 경우 MQTT PUBLISH
parser.on('data', buffer => {
  var sceneMatched = CONST.SCENES.find(scene => buffer.equals(scene.sceneHex));

  if(sceneMatched && mqttReady) {
    sceneMatched.devicestatus.forEach(device => {
      var topic = CONST.TOPIC_PREFIX + '/' + device.name + '/status';
      if(device.status !== homeStatus[topic]) {
        client.publish(topic, device.status, {retain: true});
        log('[MQTT] (PUBLISH)', topic, ':', device.status);
        return;
      }
    });
  }
});

// MQTT에 메시지가 올 때마다 homeStatus에 저장, 명령 메시지 수행
client.on('message', (topic, message) => {
  if(mqttReady) {
    var topics = topic.split('/');
    var msg = message.toString(); // message is Buffer
    if(topics[2] == 'status') {
      log('[MQTT] (LISTEN)', topic, message, '[homeStatus]', homeStatus[topic], '->', message.toString());
      homeStatus[topic] = message.toString();
      return;
    }
    
    var objFound = CONST.DEVICES.find(e => topics[1] === e.name && topics[2] == 'command' && msg === e.status);
    
    if(objFound == null) return;

    sock.write(objFound.commandHex);
    log('[Socket] (Send)', objFound.name, '->', objFound.status);
  }
});

setTimeout(() => {mqttReady=true; log('MQTT Ready...')}, CONST.mqttDelay);
