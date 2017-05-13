I was using the tp-link smart switches with the hs100-api without problems until I added a tplink smart bulb.
It looks like the packets are not the sams as for the smart switch. So I decided to write my own
program interface to handle this in nodejs. It can be use to switch a tp-link smart plug (HS100) or 
smart bulb (LB100) on and off. I also added the ability to set the hue on color smart bulb (LB130)
and the brigthness on LB100, LB110 & LB130.

In order to use it you must download and install nodeJS (https://nodejs.org/en/download/).
Once install you can execute this program on the command line by entering:

	node tplink-handler {switches} [ip-address] [command] 
		where:
			ip-addess is the local network address of the smart plug or bulb
			command is 0 or off, to turn the switch off
			command is 1 or on, to turn the switch on
			command is ? or query, to query the state of the switch
			command is the hue value if the -H switch is set

		switches:	
			-B indicates that the switch is a smart bulb
			-H set hue on LB130 smartplug (also turns bulb on)
			-J return JSON string
			-T=n set time-out to n on mili-seconds, default is 500
			-D set debug mode (returns entire JSON packet from device)
			-L set the light brightness level 
			
		the program returns the following
			ip-address=0 to indicate that the switch is off
			ip-address=1 to indicate that the switch is on
			ip-address=? to indicate that the switch istate is unknown
			ip-address=hue to indicate the hue when -H is set

		examples:

			node tplink-handler -B 192.168.0.124=1 (turns smartbulb on) 
			node tplink-handler 192.168.0.123 off  (turns smartplug off)
			node tplink-handler -h 192.168.0.124 320 (sets color smartbulb hue to 320)
			node tplink-handler -l 192.168.0.124 50 (sets smartbulb brightness to 50)

OpenHAB configuration samples:
			
ITEMS

	String Light_BR "Bedroom Lamp" 
	String Light_LR "Living Room Lamp" 
    Number Light_Hue "Light Hue"   
    Number Light_Dim "Light Dim"   

SITEMAP

	Switch item=Light_BR  // smartplug
	Switch item=Light_LR  // smartbulb 
    Slider item=Light_Hue 
    Slider item=Light_DIM 

RULES

    var TPLINK_HANDLER = "node g:/apps/automation/openhab-2.0.0/conf/scripts/tplink-handler"
    // Note - set TPLINK_HANDLER to point to your tplink-handler location 

	rule "BR Light on/off rule"
	when 
		Item Light_BR received update
	then
		executeCommandLine(TPLINK_HANDLER+" 192.168.0.101 "+Light_BR.state)
	end

	rule "LR Light on/off rule"
	when 
		Item Light_LR received update
	then
		executeCommandLine(TPLINK_HANDLER+" -B 192.168.0.120 "+Light_LR.state)
	end

	rule "Light Hue rule"
	when 
		Item Light_Hue received command
	then
		if (Light_Hue.state instanceof DecimalType) 
		{
			var int v = (Light_Hue.state as DecimalType).intValue
			v = (v * 3.6).intValue 
			executeCommandLine(TPLINK_HANDLER + " -H 192.168.0.120 " + v)
		}
	end

	rule "Light Dim rule"
	when 
		Item Light_Dim received command
	then
		if (Light_Dim.state instanceof DecimalType) 
		{
			var int v = (Light_Dim.state as DecimalType).intValue
			executeCommandLine(TPLINK_HANDLER + " -L 192.168.0.120 " + v)
		}
	end

Credits & references	

	plasticrake (https://www.npmjs.com/package/hs100-api)
	DaveGut (https://github.com/DaveGut/TP-Link-to-SmartThings-Integration}
