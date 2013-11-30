var util = require('util');
var fs = require('fs');
var xmpp = require('node-xmpp');

eval(fs.readFileSync('config.js').toString());

var online = {};
var greeted = {};

var talkingwith = null;

function talkWith(nick) {
	console.log('talking with ' + nick);
	talkingwith = nick;
}

function talkingWith(nick) {
	return talkingwith == nick;
}

function processPrivate(message, from) {
	var parts = message.split(' ');
	if(parts.length == 1) {
		switch(parts[0]) {
			case 'ping':
				return { sendPublic: false, text: 'pong' };
		}
	} else if(parts.length > 1) {
		switch(parts[0]) {
			case 'say':
				return {
					sendPublic: true,
					text: message.substring(message.indexOf('say') + 4).trim()
				};
		}
	}
	return null;
}

function process(message, from) {
	if(isMentation(message)) {
		var msg = message.substring(config.room_nick.length + 1);
		if(msg.charAt(0) == ':')
			msg = message.substring(1);
		msg = msg.trim();

		talkWith(getNick(from));

		if(/^bist du ein bot\??$/i.test(msg))
			return 'Nein';
		if(/^was machst du\??$/i.test(msg))
			return 'existieren';
		if(/^(wer|was) bist du\??$/i.test(msg))
			return config.room_nick;

		var parts = msg.split(' ');
		if(parts.length == 1) {
			switch(parts[0]) {
				case 'hä?':
					return 'Wos is?';
				case 'hallo':
				case 'moin':
				case 'hi':
				case 'hai':
				case 'servus':
					return 'hallo';
				default:
					return null;
			}
		} else {
			return null;
		}
	} else {
		var fromnick = getNick(from);
		if(message.toLowerCase() == config.room_nick.toLowerCase() + '?') {
			talkWith(fromnick);
			return 'ja';
		}
		// greet - self
		var greetings = /^(hallo|moin|hi|hai|servus|aloha)/i;
		var greetingme = new RegExp('(hallo|moin|hi|hai|servus|aloha) ' + config.room_nick.toLowerCase(), 'gi');
		if(greetingme.test(message)) {
			talkWith(fromnick);
			if(!greeted[fromnick]) {
				greetingme.exec(message);
				return RegExp.$1 + ' ' + fromnick;
			}
		} else if(greetings.test(message)) {
			// do nothing
		} else {
			// talking with someone else?
			//talkWith(null);
		}

		// questions
		var diggah = /was los (ihr säcke|diggah?)|diggah? was geht|was geht diggah?/gi;
		var badwords = /hurensohn|hurensöhne|wichs(a|er)|fick|geh (kacken|scheißen)/gi;
		var gehen = /ich gehe? jetzt|(dann )?gehe? ich jetzt/gi;
		var hoam = /(\/me|i) mog hoam/gi;
		if(diggah.test(message)) {
			talkWith(fromnick);
			return 'was is mit dir los alter?';
		} else if(badwords.test(message)) {
			// benimm dich!
			if(talkingWith(fromnick) || new RegExp(config.room_nick).test(message)) {
				return 'pass auf was du sagst!';
			}
			return null;
		} else if(hoam.test(message)) {
			talkWith(fromnick);
			return '/me is dahoam :P';
		} else if(talkingWith(fromnick)) {
			if(gehen.test(message)) {
				return 'mach das';
			}
		}
		if(message.indexOf('?') !== -1) {
			var alive = /^((hi|hallo) )?(ist )?(gerade )?(wer|jemand|irgendwer) (da|hier)$/i;
			var wasmachstdu = /^was machst du( gerade)?/i;
			var limadown = /ist lima-?city (gerade )?down/g;
			var whylimadown = /(warum|weshalb) ist lima-?city (gerade ?)down/g;
			var wiegehts = /^wie gehts( dir)?/gi;
			var questions = message.split('?');
			var talk = false;
			for(var i = 0; i < questions.length; i++) {
				var notalk = false;
				var question = questions[i];
				if(alive.test(question)) {
					talkWith(fromnick);
					return 'nein';
				} else if(whylimadown.test(question)) {
					return 'es ist Bestimmung!';
				} else if(limadown.test(question)) {
					return 'schau mal auf http://lima-status.de/';
				} else if(talkingWith(fromnick)) {
					if(wasmachstdu.test(question)) {
						return 'nichts';
					} else if(wiegehts.test(question)) {
						return 'so wie immer';
					} else {
						notalk = true;
					}
				} else {
					notalk = true;
				}
				if(!talk && !notalk)
					talk = true;
			}
			if(talk)
				talkWith(fromnick);
		}
	}
	return null;
}

function isMentation(message) {
	if(message.toLowerCase().substring(0, config.room_nick.length) == config.room_nick.toLowerCase()) {
		var c = message.charAt(config.room_nick.length);
		if(c == ' ' || c == ':')
			return true;
	}
	return false;
}

function rand(max) {
	return Math.floor((Math.random() * max));
}

function getNick(jid) {
	return jid.substring(jid.indexOf('/') + 1);
}

function sendGroupchat(msg) {
	cl.send(new xmpp.Element('message', { to: config.room_jid, type: 'groupchat' })
		.c('body')
		.t(msg));
}

function doGreet(nick) {
	var greetings = [ 'hallo', 'moin', 'hi', 'hai' ];
	var greeting = greetings[rand(greetings.length)];
	sendGroupchat(greeting + ' ' + nick);
}

var cangreet = false;
setTimeout(function() {
	cangreet = true;
}, 1000);

var cl = new xmpp.Client({
	jid: config.jid,
	password: config.password
});

cl.on('online', function() {
	util.log('we are online');

	cl.send(new xmpp.Element('presence', { type: 'available' })
		.c('show')
		.t('chat'));
	cl.send(new xmpp.Element('presence', { to: config.room_jid + '/' + config.room_nick })
		.c('x', { xmlns: 'http://jabber.org/protocol/muc' })
		.c('history', { maxstanzas: 0, seconds: 1 }));

	setInterval(function() {
		cl.send(new xmpp.Message({}));
	}, 30000);
});

var heardOwnPresence = false;
cl.on('stanza', function(stanza) {
	if(stanza.attrs.type == 'error') {
		util.error(stanza);
		return;
	}

	if(stanza.is('presence')) {
		if(stanza.getChild('x') !== undefined) {
			var x = stanza.getChild('x');
			var xmlns = x.attrs.xmlns;
			switch(xmlns) {
				case 'http://jabber.org/protocol/muc#user':
					var item = x.getChild('item');
					var role = item.attrs.role;
					var jid = item.attrs.jid;
					var nick = getNick(stanza.attrs.from);
					if(nick == config.room_nick) {
						if(x.getChild('status') !== undefined) {
							if(x.getChild('status').attrs.code == 110) {
								heardOwnPresence = true;
								sendGroupchat('hi');
								return;
							}
						}
					}
					if(!heardOwnPresence) {
						if(role !== 'none') {
							online[nick] = true;
							greeted[nick] = true;
						}
						return;
					}
					if(role === 'none') {
						// leave
						online[nick] = false;
						greeted[nick] = false;
					} else {
						// join
						if(online[nick])
							return;
						online[nick] = true;
						greeted[nick] = true;
						doGreet(nick);
					}
					break;
			}
		}
		return;
	}

	// non-groupchat
	if(!stanza.is('message') || !stanza.attrs.type == 'groupchat')
		return;

	// self
	if(stanza.attrs.from == config.room_jid + '/' + config.room_nick)
		return;

	var body = stanza.getChild('body');

	if(!body)
		return;

	var message = body.getText();

	var private = stanza.attrs.type == 'chat';

	var response = null;
	if(private) {
		response = processPrivate(message, stanza.attrs.from);
		if(response == null)
			return;
		console.log(stanza.attrs.from + ': "' + message + '" => "' + response.text + '"');
		var params = {};
		if(response.sendPublic) {
			params = {
				to: config.room_jid,
				type: 'groupchat'
			};
		} else {
			params = {
				to: stanza.attrs.from,
				type: 'chat'
			};
		}

		cl.send(new xmpp.Element('message', params)
			.c('body')
			.t(response.text));
		return;
	} else {
		response = process(message, stanza.attrs.from);
	}
	if(response === null)
		return;
	console.log('"' + message + '" => "' + response + '"');

	// is private
	var params = {};
	if(stanza.attrs.from.indexOf(config.room_jid) === 0) {
		params.to = config.room_jid;
		params.type = 'groupchat';
		// mentation?
		if(message.substring(0, config.room_nick.length) == config.room_nick) {
			response = stanza.attrs.from.substring(config.room_jid.length + 1)
				+ ': ' + response;
		}
	} else {
		params.to = stanza.attrs.from;
		params.type = 'chat';
	}

	// send response
	cl.send(new xmpp.Element('message', params)
		.c('body')
		.t(response));
});
