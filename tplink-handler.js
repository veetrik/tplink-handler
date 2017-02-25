var fs = require('fs');
const PROG = "tplink-handler";
const dgram = require('dgram');
const PORT = 9999;
var TIME_OUT = 500;
var DEBUG = false;
const JSON_OUT = false;
const GET_INFO = '{"system":{"get_sysinfo":{}}}';
var unit="", addr="", state='?', bulb=-1;

if (getParms() == false) return;

var client = dgram.createSocket('udp4');

setTimeout(finish, TIME_OUT);

if (state == '?')
    getState(addr);
else
	setState(addr, state, bulb);
  
//-------------------------------------------------------------------------
function log(msg)
{
	if (DEBUG) console.log(msg);
}
//-------------------------------------------------------------------------
function finish()
{
    process.exit(0);
}
//--------------------------------------------------------------------------
function encrypt(input, firstKey) 
{
  if (typeof firstKey === 'undefined') firstKey = 0xAB;
  var buf = new Buffer(input.length); // node v6: Buffer.alloc(input.length)

  var key = firstKey;
  for (var i = 0; i < input.length; i++) 
  {
    buf[i] = input.charCodeAt(i) ^ key;
    key = buf[i];
  }
  return buf;
};
//-------------------------------------------------------------------------
function decrypt(input, firstKey) 
{
  if (typeof firstKey === 'undefined') firstKey = 0x2B;
  var buf = new Buffer(input); // node v6: Buffer.from(input)
  var key = firstKey;
  var nextKey;
  for (var i = 0; i < buf.length; i++) 
  {
    nextKey = buf[i];
    buf[i] = buf[i] ^ key;
    key = nextKey;
  }
  return buf;
};
//-------------------------------------------------------------------------
function showInfo(sysinfo)
{
    var name = sysinfo.alias;
    var model = sysinfo.model;
    var mac="";
	var state="";
	var dev = "";
	
	if (model=="HS100(US)")
	{
		dev = sysinfo.dev_name;
		mac = sysinfo.mac.replace(/:/g,"");
		state = sysinfo.relay_state;
	}
	if (model=="LB100(US)")
	{
		dev = sysinfo.mic_type;
		mac = sysinfo.mic_mac;
		state = sysinfo.light_state.on_off;
	}
		
	if (JSON_OUT) 
	{
	    console.log('{\n' +
        ' "model":"'+model +'",\n' +
        ' "name":"' +name +'",\n' +
        ' "dev":"'  +dev +'",\n' +
        ' "mac":"'  +mac +'",\n' +
        ' "unit":"' +unit +'",\n' +
        ' "state":"' +state +'"\n}');
    }
	else
	{
		console.log(unit+"="+state);
	}
}
//-------------------------------------------------------------------------
function getState(addr)
{   
	var msgBuf = encrypt(GET_INFO);
	var message = new Buffer(msgBuf);

	client.send(message, 0, message.length, PORT, addr, function(err, bytes) 
	{
		if (err) throw err;
		log(' get state request sent to ' + addr);
	});

	client.on('message', function (msg, remote) 
	{
		const decryptedMsg = decrypt(msg).toString('ascii');
		log('\n' + decryptedMsg.toString('ascii') + ' from ' + remote.address);
		const jsonMsg = JSON.parse(decryptedMsg);
		const sysinfo = jsonMsg.system.get_sysinfo;
		showInfo(sysinfo);   
	});
}
//-------------------------------------------------------------------------
function setState(addr, state, bulb) 
{
  var powerState = (bulb<0)
      ? '{"system":{"set_relay_state":{"state":'+state+'}}}' // for smartplug
      : '{"smartlife.iot.smartbulb.lightingservice":{"transition_light_state": {'+
        '"on_off":'+state+',"transition_period":0}}}';      // for smartbulb 

  var msgBuf = encrypt(powerState);
  var message = new Buffer(msgBuf);
  setTimeout(finish, TIME_OUT);
  client.send(message, 0, message.length, PORT, addr, function(err, bytes) 
  {
	if (err) throw err;
    log(' set state to '+state+' sent to ' + addr); 
  });
	client.on('message', function (msg, remote) 
	{
		const decryptedMsg = decrypt(msg).toString('ascii');
        
		if (DEBUG)
			console.log('\n ' + decryptedMsg.toString('ascii') + ' from ' + remote.address);

		log('\n ' + decryptedMsg.toString('ascii') + ' from ' + remote.address);

		var p=decryptedMsg.indexOf('"err_code":0');
		 
		if (p<0) state="?";

		console.log(unit+"="+state);
	});
}
//-------------------------------------------------------------------------
function getParms()
{
	var a, v, p, request="";
	if (process.argv.length<3)
	{
		console.log("Usage: node "+ PROG + " {switches} [unit-address]=[state] \n" +
			" unit-address: ip address for smartplug or bulb\n" +
			" state: 0 = OFF, 1 = ON, ? = Query state\n" +
			" switches:  -D = debug,  -B = smartbulb, -J = JSON output");
		return false;
	}
	
	log(" getParms "+process.argv.length);
	for(i=2; i<process.argv.length; i++)
	{
	    p = process.argv[i];
		var a = (p+"=").split('=');
		var v = a[1];
		switch(a[0].toUpperCase())
		{
			case "-D": DEBUG = true; continue;
			case "-J": JSON_OUT = true; continue;
			case "-B": bulb = true; continue;
			case "-T": TIME_OUT = v; continue;
			default:
				if (request>"")
				{
					console.log("*unknown argument: "+p+"\n"); 
					return false;
				}	
				request = p;
				var a = (request+"=").split('=');
				addr = unit = a[0];
				state = a[1];
				continue;
		} // switch	
	} // for

	if (request.length<1) 
	{
		console.log("*Missing request!");
		return false;
	}

	if (addr.length<11)
	{
		console.log(unit+"=?");
		console.log("*Invalid unit address: "+addr+"!");
	    return false;
	}   
	
	log(" unit="+unit+" state="+state+" addr="+addr+" -B="+bulb);
	return true;
}
//--------------------------------------------------------------------------
//-------------------------------------------------------------------------
//-------------------------------------------------------------------------
//-------------------------------------------------------------------------
