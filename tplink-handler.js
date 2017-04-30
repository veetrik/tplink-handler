var fs = require('fs');
const PROG = "tplink-handler";
const dgram = require('dgram');
const PORT = 9999;
var TIME_OUT = 500;
var DEBUG = false, USE_CMD = false, USE_JSON = false, USE_BULB = false, USE_HUE = false;
const GET_INFO = '{"system":{"get_sysinfo":{}}}';
const LOG_FILE = "g:/Apps/Automation/openhab-2.0.0/userdata/logs/handler.log";
var unit="", addr="", cmd="";

if (getParms() == false) return;

var client = dgram.createSocket('udp4');

setTimeout(finish, TIME_OUT);

if (USE_HUE)
   setHue(addr, cmd)
else   
if (USE_CMD)
   sendCommand(addr, cmd);
else
if (cmd == '?')
    getState(addr);
else
	setState(addr, cmd);
  
//-------------------------------------------------------------------------
function log(msg)
{
    fs.appendFile(LOG_FILE, new Date().toLocaleString() + " " + msg + "\n"); 
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
	var hue = "";
	
	if (model=="HS100(US)")
	{
		dev = sysinfo.dev_name;
		mac = sysinfo.mac.replace(/:/g,"");
		state = sysinfo.relay_state;
		hue = "0";
	}
	if (model=="LB100(US)")
	{
		dev = sysinfo.mic_type;
		mac = sysinfo.mic_mac;
		state = sysinfo.light_state.on_off;
		hue = sysinfo.light_state.dft_on_state.hue;
	}
	if (model=="LB130(US)")
	{
		dev = sysinfo.mic_type;
		mac = sysinfo.mic_mac;
		state = sysinfo.light_state.on_off;
		hue = sysinfo.light_state.dft_on_state.hue;
	}
		
	if (USE_JSON) 
	{
	    console.log('{\n' +
        ' "model":"'+model +'",\n' +
        ' "name":"' +name +'",\n' +
        ' "dev":"'  +dev +'",\n' +
        ' "mac":"'  +mac +'",\n' +
        ' "unit":"' +unit +'",\n' +
		' "hue":"'  +hue + '",\n' +
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
function setHue(addr, hue) 
{
  var powerState = 
        '{"smartlife.iot.smartbulb.lightingservice":{"transition_light_state":{"ignore_default":1,'+
    	'"on_off":1,"color_temp":0,"hue":'+hue+',"saturation":100}}}}';
  if(DEBUG) console.log(" cmd="+powerState);

  var msgBuf = encrypt(powerState);
  var message = new Buffer(msgBuf);
  client.send(message, 0, message.length, PORT, addr, function(err, bytes) 
  {
	if (err) throw err;
    log(' setHue '+hue+' sent to ' + addr); 
  });
	client.on('message', function (msg, remote) 
	{
		const decryptedMsg = decrypt(msg).toString('ascii');
        
		if (DEBUG)
			console.log('\n ' + decryptedMsg.toString('ascii') + ' from ' + remote.address);

		log('\n ' + decryptedMsg.toString('ascii') + ' from ' + remote.address);

		var p=decryptedMsg.indexOf('"err_code":0');
		 
		if (p<0) state="?";

		console.log(unit+"="+hue);
	});
}
//-------------------------------------------------------------------------
function setState(addr, state) 
{
  var powerState = (USE_BULB)
      ? '{"smartlife.iot.smartbulb.lightingservice":{"transition_light_state": {'+
        '"on_off":'+state+',"transition_period":0}}}'         // for smartbulb 
      : '{"system":{"set_relay_state":{"state":'+state+'}}}'; // for smartplug
	  
  if(DEBUG) console.log(" cmd="+powerState);

  var msgBuf = encrypt(powerState);
  var message = new Buffer(msgBuf);
  client.send(message, 0, message.length, PORT, addr, function(err, bytes) 
  {
	if (err) throw err;
    log(' setState '+state+' sent to ' + addr); 
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
function sendCommand(addr, cmd) 
{
  if(DEBUG) console.log(" sendCommand: "+cmd);
  var msgBuf = encrypt(cmd);
  var message = new Buffer(msgBuf);
  client.send(message, 0, message.length, PORT, addr, function(err, bytes) 
  {
	if (err) throw err;
    console.log(' sendCommand error: '+err); 
  });
	client.on('message', function (msg, remote) 
	{
		var decryptedMsg = decrypt(msg).toString('ascii');
		console.log('\n ' + decryptedMsg.toString('ascii') + ' from ' + remote.address);
	});
}
//-------------------------------------------------------------------------
function getParms()
{
	var a, v, p, request="";
	if (process.argv.length<3)
	{
		console.log("Usage: node "+ PROG + " {-B} {-C} {-D} {-H} {address} {=} {0|1|?|ON|OFF|hue|command}\n" +
			" address: ip address for smartplug or smartbulb\n" +
			" switches:  -D=debug,  -B=smartbulb,  -C=command mode -H=smartbulb hue");
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
			case "-B": USE_BULB = true; continue; // (v=="") ? 0 : v; continue;
			case "-T": TIME_OUT = v; continue;
			case "-J": USE_JSON = true; continue;
			case "-C": USE_CMD = true; continue;
			case "-H": USE_HUE = true; continue;
			default:
			    if (addr=="")
				{
					//a = (p+"=").split('=');
				    addr = unit = a[0];
				    cmd = a[1];
				   continue;
				}   
				if (cmd>"")
				{
					console.log("*unknown argument: "+ p + "!"); 
					return false;
				}	

				cmd = p;
		} // switch	
	} // for

	if (DEBUG)
	   console.log(" D="+DEBUG+" B="+USE_BULB+" T="+TIME_OUT+" J="+USE_JSON+" C="+USE_CMD+" H="+USE_HUE); 
	
	if (cmd.length<1) 
	{
		console.log("*Missing command!");
		return false;
	}

	//-------------------------------------------------
	// the following lines are optional, They are used to
	// convert a friednly name to the actual ip address
	// on local network
	//-------------------------------------------------
	//unit=unit.toUpperCase();
	//if (unit=="AP") addr="192.168.0.108"; // Audio Power smartplug
	//if (unit=="BR") addr="192.168.0.101"; // Bedroom smartplug
	//if (unit=="CL") addr="192.168.0.120"; // Color Light smartbulb
	//if (unit=="LR") addr="192.168.0.123"; // Living Room smartbulb
    //if (unit=="LR" || unit=="CL") USE_BULB=1; // force smartbulb
	//-------------------------------------------------

	if (addr.length<7)
	{
		console.log(unit+"=?");
		console.log("*Invalid unit address: "+addr+"!");
	    return false;
	}   

    if (cmd.toUpperCase()=="ON") cmd="1";
    if (cmd.toUpperCase()=="OFF") cmd="0";
    if (cmd.toUpperCase()=="QUERY") cmd="?";
	
	log(" unit=" + unit + " addr=" + addr + " cmd=" + cmd);
	return true;
}
//--------------------------------------------------------------------------
//-------------------------------------------------------------------------
//-------------------------------------------------------------------------
//-------------------------------------------------------------------------
