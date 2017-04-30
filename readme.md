I was using the tp-link smart switches with the hs100-api without problems until I added a tplink smart bulb.
It looks like the packets are not the sams as for the smart switch. So I decided to write my own
program interface to handle this in nodejs. It can be use to switch a tp-link smart plug (HS100) or 
smart bulb (LB100) on and off. I also added the ability to set the hue on color smart bulb (LB130).

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
			-H set hue on smartplug (also turns bulb on)
			-J return JSON string
			-T=n set time-out to n on mili-seconds, default is 500
			
		the program returns the following
			ip-address=0 to indicate that the switch is off
			ip-address=1 to indicate that the switch is on
			ip-address=? to indicate that the switch istate is unknown
			ip-address=hue to indicate the hue when -H is set

		examples:

			node tplink-handler -B 192.168.0.124=1 (turns smartbulb on) 
			node tplink-handler 192.168.0.123 off  (turns smartplug off)
			node tplink-handler -h 192.168.0.124 320 (sets smartbulb hue to 320)

OpenHAB configuration samples:
			
ITEMS

	String Light_BR "Bedroom Lamp" 
	String Light_LR "Living Room Lamp" 
    Number Light_Hue "Light Hue"   

SITEMAP

	Switch item=Light_BR  
	Switch item=Light_LR  
    Slider item=Light_Hue 

RULES

    var TPLINK_HANDLER = "node g:/apps/automation/openhab-2.0.0/conf/scripts/tplink-handler"
    // Note - set TPLINK_HANDLER to point to your tplink-handler location 

	rule "Switch bedroom lamp rule"
	when 
		Item Light_BR received update
	then
		var state = "?"
		switch(Light_BR.state.toString.toUpperCase)
		{
			case "ON":   state = "1"
			case "OFF":  state = "0"
		}	
		executeCommandLine(TPLINK_HANDLER+" 192.168.0.101="+state)
	end

	rule "Switch living room lamp rule"
	when 
		Item Light_LR received update
	then
		executeCommandLine(TPLINK_HANDLER+" -B 192.168.0.123 "+Light_LR.state)
	end

	rule "Light Hue rule"
	when 
		Item Light_Hue received command
	then
		if (Light_Hue.state instanceof DecimalType) 
		{
			var int hue = (Light_Hue.state as DecimalType).intValue
			hue = (hue * 3.6).intValue 
			executeCommandLine(TPLINK_HANDLER + " -H 192.168.0.120 "+hue)
		}
	end

Credits & references	

	plasticrake (https://www.npmjs.com/package/hs100-api)
	DaveGut (https://github.com/DaveGut/TP-Link-to-SmartThings-Integration}
