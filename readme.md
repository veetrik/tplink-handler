I was using the tp-link smart switches with the is link without problems until I added a tplink smart bulb.
It looks like the packets are not the sams as for the smart switch. So I decided to write my own
program interface to handle this in nodejs. It can be use to switch a tp-link smart plug (HS100) or 
smart bulb (LB100) on and off.

In order to use it you must download and install nodeJS (https://nodejs.org/en/download/).
Once install you can execute this program on the command line by entering:

	node tplink-handler {switches} [ip-address]=state {-B} 
		where:
			ip-addess is the local network address of the smart plug or bulb
			state is 0 to turn the switch off
			state is 1 to turn the switch on
			state is ? to query the state of the switch

		switches:	
			-B indicates that the switch is a smart bulb
			-J return JSON string
			-T=n set time-out to n on mili-seconds, default is 500
			
		the program returns the following
			ip-address=0 to indicate that the switch is off
			ip-address=1 to indicate that the switch is on
			ip-address=? to indicate that the switch istate is unknown

		example:

			node tplink-handler 192.168.0.124=1 -B

OpenHAB configuration samples:
			
ITEMS

	String Light_BR "Light BR" 
	String Light_LR "Light LR" 

SITEMAP

	Switch item=Light_BR  label="Bedroom Lamp"     
	Switch item=Light_LR  label="Living Room Lamp" 

RULES

	rule "Switch bedroom lamp rule"
	when 
		Item Light_BR received update
	then
		var state = "?"
		switch(Light_BR.state.toString.toUpperCase)
		{
			case "ON":   state = "1"
			case "OFF":  state = "0"
			default: TalkMessage.sendCommand("unknown bedroom lamp")
		}	
		executeCommandLine("g:/apps/nodejs/node g:/apps/homecontrol/node/tplink-handler 192.168.0.101="+state)
	end

	rule "Switch living room lamp rule"
	when 
		Item Light_LR received update
	then
		var state = "?"
		switch(Light_LR.state.toString.toUpperCase)
		{
			case "ON":   state = "1"
			case "OFF":  state = "0"
			default: TalkMessage.sendCommand("unknown livingroom lamp")
		}	
		executeCommandLine("g:/apps/nodejs/node g:/apps/homecontrol/node/tplink-handler -B 192.168.0.123="+state)
	end

