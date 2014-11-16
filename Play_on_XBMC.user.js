// ==UserScript==
// @name        Play on XBMC
// @namespace   user@violet.local
//
// @description Resolve and play media on XBMC
// @description Use with AnyURL plugin from:
// @description         https://github.com/VioletRed/script.video.anyurl
//
// @date        2014-11-16
// @version     10.5
// @include     *
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// @grant       GM_log
// @updateURL   https://gist.github.com/VioletRed/9577d8c062f3ff056c59/raw/Play_on_XBMC.user.js

// ==/UserScript==
// Simple script to send media to XBMC. 
// It uses AnyURL plugin so it should be installed to make it work.

/* ============================================================================
 * Global config
 * */

var xbmc_address = GM_getValue('XBMC_ADDRESS');
var xbmc_playlist = GM_getValue('XBMC_PLAYLIST');
var xbmc_queued = null;

GM_registerMenuCommand('Modify the XBMC address', modify_xbmc_address);
GM_registerMenuCommand('XBMC partymode playlist', modify_xbmc_playlist);

if (xbmc_address === undefined)
	modify_xbmc_address();

if (xbmc_playlist === undefined)
	modify_xbmc_playlist();

function modify_xbmc_address() {
	xbmc_address = window
			.prompt(
					'Enter the address for the XBMC web interface\n(username:password@address:port)',
					xbmc_address);
	GM_setValue("XBMC_ADDRESS", xbmc_address);
}

function modify_xbmc_playlist() {
	xbmc_playlist = window.prompt('Set the PARTYMODE playlist number (0 or 1)',
			xbmc_playlist);
	GM_setValue("XBMC_PLAYLIST", xbmc_playlist);
}

// ==/UserScript==
// Add a "Send to XBMC" on a webpage
// It uses the old GM_*** API, and needs cleaning.

// const GM_log = console.log;

/*
 * ============================================================================
 * Site independent code here!!!!
 */


function xbmc_json_error(response) {
	consoloe.log("XBMC JSON Error")
}

function xbmc_json_timeout(response) {
	consoloe.log("XBMC JSON Timeout")
}

function json_command_answer(command, logmsgok, logmsgerr) {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : command,
		onload : function(response) {
			console.log(logmsgok);
			return response;
		}
	});
	console.log(logmsgerr);
	return -1;
}

function play_movie_directly(video_url) {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Player.Open", '
				+ '"params":{"item": { "file" : "'
				+ encode_video_url(video_url) + '" }}, "id" : 1}',
		onload : function(response) {
			console.log('Playing video');
		}
	});
}

function open_playlist(xbmc_playlist) {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		timeout: 3000,
		data : '{"jsonrpc": "2.0", "method": "Player.Open", '
				+ '"params":{"item": { "playlistid" : ' + xbmc_playlist 
				+ ' }}, "id" : 1}',
		onload : function(response) {
			console.log('Playing video');
		}
	});
}

function dont_open_playlist(xbmc_playlist) {
	return 0;
}

function play_in_new_playlist(video_url) {
	/* Clear playlist */
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		timeout: 3000,
		data : '{"jsonrpc": "2.0", "method": "Playlist.Clear", '
			+ '"params":{"playlistid" : 1}, "id" : 1}',
		onload : function(response) {
			/* Add movies to Video playlist */
			queue_movie_last(video_url, 1, open_playlist); 
		},
		onerror: xbmc_json_error,
		ontimeout: xbmc_json_timeout,
	});
}

function queue_movie_at(video_url, xbmc_playlist, xbmc_queue_depth) {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Playlist.Insert", '
				+ '"params":{"item": { "file" : "'
				+ encode_video_url(video_url)
				+ '" }, "playlistid" :'
				+ xbmc_playlist
				+ ', "position" : '
				+ xbmc_queue_depth
				+ ' }, "id" : 1}',
		onerror: xbmc_json_error,
		ontimeout: xbmc_json_timeout,
		onload : function(response) {
			xbmc_queued = video_url;
			/*
			GM_addStyle('#xbmc { opacity:0.4; width:90px; position:fixed; '
					+ 'z-index:100; bottom:0; right:0; display:block; '
					+ 'background:#400808; -moz-border-radius-topleft: '
					+ '20px; -moz-border-radius-bottomleft:20px; '
					+ '-webkit-border-top-left-radius:20px;  '
					+ '-webkit-border-bottom-left-radius:20px; } ')
			*/
			console.log('Queueing video');
		}
	})
}

function queue_movie_last(video_url, xbmc_playlist, next_step) {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		timeout: 3000,
		data : '{"jsonrpc": "2.0", "method": "Playlist.Add", '
				+ '"params":{"item": { "file" : "'
				+ encode_video_url(video_url) + '" }, "playlistid" :'
				+ xbmc_playlist + ' }, "id" : 1}',
		onload : function(response) {
			var result = JSON.parse(response.responseText);
			if (result.result == "OK") {
					xbmc_queued = video_url;
					console.log('Queued video at the end');
					next_step(xbmc_playlist);
					return 0;
			}
		},
		onerror: xbmc_json_error,
		ontimeout: xbmc_json_timeout
/*			GM_addStyle('#xbmc { opacity:0.4; width:90px; position:fixed; '
					+ 'z-index:100; bottom:0; right:0; display:block; '
					+ 'background:#400808; -moz-border-radius-topleft: '
					+ '20px; -moz-border-radius-bottomleft:20px; '
					+ '-webkit-border-top-left-radius:20px;  '
					+ '-webkit-border-bottom-left-radius:20px; } ')
*/
	});
	return -1;
}


function play_movie() {
	video_url = document.documentURI
	console.log('Trying to queue movie');
	var xbmc_queue_depth = undefined;

	/*
	 * Logic goes like this: First, try to queue the video. If it fails, play
	 * video directly. Because AJAX is asynchronous, we use a timer for "direct
	 * play", and cancel it if we succeed to queue the video where we want
	 */
	if (video_url == undefined || xbmc_queued == video_url) {
		return;
	}
	// Get the current playlist
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Player.GetActivePlayers",'
				+ '"params":{}, "id" : 1}',
		onload : function(response) {
			var xbmc_active = JSON.parse(response.responseText);
			if (xbmc_active.result == undefined
					|| xbmc_active.result.length == 0) {
				console.log("No active players, create a new queue");
				play_movie_directly(video_url)
				return; // No active players
			}
			GM_xmlhttpRequest({
				method : 'POST',
				url : 'http://' + xbmc_address + '/jsonrpc',
				headers : {
					"Content-type" : "application/json"
				},
				data : '{"jsonrpc": "2.0", "method": "Player.GetProperties",'
						+ '"params":{"playerid" : '
						+ xbmc_active.result[0].playerid
						+ ', "properties" :  [ "playlistid" , "partymode" ] }, "id" : 1}',
				onload : function(response) {
					var xbmc_properties = JSON.parse(response.responseText);
					if (xbmc_properties.result.partymode != true) {
						console.log("Not in party mode, queueing last");
						play_movie_directly(video_url);
						return;
					}
					GM_xmlhttpRequest({
						method : 'POST',
						url : 'http://' + xbmc_address + '/jsonrpc',
						headers : {
							"Content-type" : "application/json"
						},
						data : '{"jsonrpc": "2.0", "method": "Playlist.GetItems",'
								+ '"params":{"playlistid" : '
								+ xbmc_playlist
								+ '}, "id" : 1}',
						onload : function(response) {
							var xbmc_response = JSON
									.parse(response.responseText);
							if (xbmc_response.result.limits == undefined) {
								console
										.log("Error: Playlist.GetItems bad response");
								return;
							}
							// Queue exist, enqueue media at the end of user
							// selection
							xbmc_queue_depth = xbmc_response.result.limits.end - 9;
							console.log("XBMC queue size is "
									+ xbmc_queue_depth);
							GM_xmlhttpRequest({
								method : 'POST',
								url : 'http://' + xbmc_address + '/jsonrpc',
								headers : {
									"Content-type" : "application/json"
								},
								data : '{"jsonrpc": "2.0", "method": "Playlist.Insert", '
										+ '"params":{"item": { "file" : "'
										+ encode_video_url(video_url)
										+ '" }, "playlistid" :'
										+ xbmc_playlist
										+ ', "position" : '
										+ xbmc_queue_depth
										+ ' }, "id" : 1}',
								onload : function(response) {
									xbmc_queued = video_url;
									/*
									GM_addStyle('#xbmc { opacity:0.4; width:90px; position:fixed; '
											+ 'z-index:100; bottom:0; right:0; display:block; '
											+ 'background:#400808; -moz-border-radius-topleft: '
											+ '20px; -moz-border-radius-bottomleft:20px; '
											+ '-webkit-border-top-left-radius:20px;  '
											+ '-webkit-border-bottom-left-radius:20px; } ')
									*/
									console.log('Queueing video');
								}
							})
						}
					})
				}
			});
		}
	});
}

function pause_movie() {
	setTimeout(
			function() {
				GM_xmlhttpRequest({
					method : 'POST',
					url : 'http://' + xbmc_address + '/jsonrpc',
					headers : {
						'Content-Type' : 'application/json'
					},
					data : '{"jsonrpc":"2.0", "method":"Player.PlayPause", "params":{"playerid":1}, "id" : 1}'
				})
			}, 250);
}

function stop_movie() {
	setTimeout(
			function() {
				GM_xmlhttpRequest({
					method : 'POST',
					url : 'http://' + xbmc_address + '/jsonrpc',
					headers : {
						'Content-Type' : 'application/json'
					},
					data : '{"jsonrpc":"2.0", "method": "Player.Stop", "params":{"playerid":1}, "id" : 1}'
				})
			}, 250);
}

function add_play_on_xbmc_buttons() {
	console.log('Found clip ' + document.documentURI);
	var xbmc = document.createElement('div');
	xbmc.setAttribute('id', 'xbmc');

	var xbmc_play_control = document.createElement('div');
	xbmc_play_control.setAttribute('id', 'playControl');

	var xbmc_other_control = document.createElement('div');
	xbmc_other_control.setAttribute('id', 'otherControl');

	var xbmc_playback_control = document.createElement('div');
	xbmc_playback_control.setAttribute('id', 'playbackControl');

	// Will have image here later, I guess
	var xbmc_title = document.createElement('div');
	xbmc_title.setAttribute('id', 'xbmcText');
	xbmc_title.innerHTML = 'MENU';

	var xbmc_play = document.createElement('span');
	xbmc_play.addEventListener('click', function() {
		play_movie()
	}, false);
	xbmc_play.setAttribute('id', 'btPlay');
	xbmc_play.setAttribute('title', 'Start playback');

	var xbmc_pause = document.createElement('span');
	xbmc_pause.addEventListener('click', pause_movie, false);
	xbmc_pause.setAttribute('id', 'btPause');
	xbmc_pause.setAttribute('title', 'Pause playback');

	var xbmc_stop = document.createElement('span');
	xbmc_stop.addEventListener('click', stop_movie, false);
	xbmc_stop.setAttribute('id', 'btStop');
	xbmc_stop.setAttribute('title', 'Stop video');

	xbmc_play_control.appendChild(xbmc_play);	var xbmc_next = document.createElement('span');
	xbmc_next.addEventListener('click', stop_movie, false);
	xbmc_next.setAttribute('id', 'btNext');
	xbmc_next.setAttribute('title', 'Play next video');

	var xbmc_queue = document.createElement('span');
	xbmc_queue.addEventListener('click', stop_movie, false);
	xbmc_queue.setAttribute('id', 'btQueue');
	xbmc_queue.setAttribute('title', 'Queue video');

	xbmc_play_control.appendChild(xbmc_play);
	//xbmc_other_control.appendChild(xbmc_title);
	xbmc_playback_control.appendChild(xbmc_queue);
	xbmc_playback_control.appendChild(xbmc_next);
	xbmc_playback_control.appendChild(xbmc_pause);
	xbmc_playback_control.appendChild(xbmc_stop);

	xbmc_other_control.appendChild(xbmc_playback_control);
	xbmc.appendChild(xbmc_play_control);
	xbmc.appendChild(xbmc_other_control);

	document.body.parentNode.insertBefore(xbmc, document.body);

	GM_addStyle('#xbmc { opacity:0.4; width:90px; position:fixed; z-index:100; bottom:0; right:0; display:block; background:#080808; -moz-border-radius-topleft: 20px; -moz-border-radius-bottomleft:20px; -webkit-border-top-left-radius:20px;  -webkit-border-bottom-left-radius:20px; } ')
	GM_addStyle('#xbmc:hover { opacity: 0.6; } ')

	GM_addStyle('#xbmcText { font-family:Terminal; font-size:12px; font-weight:bold; color:#a0a0a0 } ')

	// Play control
	GM_addStyle('#playControl span, #playbackPlay span:hover { width:40px; height:40px; float:left; display:block; padding-bottom:0px; -moz-background-size:40px; background-size:40px; -webkit-background-size:40px; -o-background-size:40px; -khtml-background-size:40px; cursor:pointer; } ')

	GM_addStyle('#btPlay { background: url("data:image/png;base64,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") no-repeat; } ')
	GM_addStyle('#btPlay:hover { background: url("data:image/png;base64,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") no-repeat; } ')

	// Other control
	// "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"
	// "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"

	GM_addStyle('#playbackControl span, #playbackControl span:hover { width:20px; height:20px; bottom:0; float:left; display:block; margin-left:3px; -moz-background-size:20px; background-size:20px; -webkit-background-size:20px; -o-background-size:20px; -khtml-background-size:20px; cursor:pointer; } ')

	GM_addStyle('#btNext { background: url("data:image/png;base64,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") no-repeat; } ')
	GM_addStyle('#btNext:hover { background: url("data:image/png;base64,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") no-repeat; } ')

	GM_addStyle('#btStop { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAARtSURBVFiF1Zmxb9tGFMbfvdNJR5FWZMlSwkZGA8FovWTo2AzdSsVAvQTJ4v4BDToUmbJk6dIMnoJ2aQt0zeIiS1rYItCOWTsYCIzCCtDGhmwzkmWHNE868a5DZcNRFVuyrFj9AC7Hd3g/kYfH9z4ROKNKpdKMUuoWpfQGIaSgtb6ilMoCACBijRCypbXeiKLoGSI+KZfL62fJQwYJnpubyyml7gHAAiHkEuf8dSKRaMVisaMLAKDdbscPr2azGRdCTGit9wDgMSI+Wl5e9s4V0HEckxByHwC+Mk2zYVnWPmMsHOTHSSkN3/dTQRCkAeBbrfWi67rB0ICO49wmhHxvGIafTqdrlFI5CFi3oihijUYjG4ahpbW+67ruzyfF0xPuEcdxHlJKv87n85uWZTUQUQ0DBwCAiCqZTPqGYYRhGH5eLBbTlUrl97dC9Fqcn59PSimXGGMfTU1NbSJiNCxYLyml6KtXr65KKf9gjN15+vTpQXcM9thHpJRLnPPr+Xz+5ajgAAAQMcrn8y8559ellEvQ44H95xU7jvMwHo/P5XK5TQDQo4I7rmQy6QshPrx27Vq2Uqn89lZAx3Fud87c34SQoc/bIDIMwz84OPi0WCy+qFQqzw/Xjx5pp5T8dfny5c1BS8h5SUppbG9vX9Vav39Ygo7OICHkvmEY/kXBAQAwxkLDMPxOzf2XC+DoC/Gnbdsvhq1zwyqKIlatVouI+MHy8rIXAwBQSt0zTbPRD5wQIiWESJ0lOed8n3O+f1IMpVSaptkIguAeADyIddYXLMs6ceNxwGq1+l69Xh8ILpPJgG3bcBogAIBlWftBECwAwINYqVSaIYRcYoxt95usXq/D2traQI3G7Oystm27r1jGWEgImS6VSjOolLrFOX89SLJ3Ic75a6XULaSU3kgkEq2LBupWIpFoUUpvICGkcNjHjZNisViLEFJArfWVcQXUWl9BpVR2XAGVUtle3cxYCRGx1m634xcN0q12ux1HxBoSQrbGFZAQsoVa641xBdRab2AURc+azebYATabzXhnpsYnQoiJiwbqlhBiAhGfxMrl8nqpVNqTUhr99oKZTAZmZ2cHGgcymUzfsVJKQ2u9Vy6X1w+7mce+7y9MTk6eCsg537dtG/r98Hfv7SfO9/0UADwGAIgBACDioyAIvkylUvXTesJ+erphFEURC4IgjYiPADpD0/r6+sHMzEwyiqKPk8mkP6rk/Wh3dzffbrd/XFlZ+RXg2EyitV4Mw9CSUhoXBSelNDqWyOLh2hGg67qB1vqu53kFpdRJlshIpJSinucVOn7Nkan0BkilUnleLBbTrVbrE9M0R3bOeoh4nleQUv7kuu53b9zoFXzz5s1fOOfXs9lsFUbvLpBarWYLIVZXVlY+687Xq5vRjLE7QojVnZ2d6VG+bqUU3dnZmRZCrDLG7nTDAZzsDxLHcb6hlH6Ry+U2znugl1IanucVoij6wXXdB73gTgMEgIs3MP//FvBxja2J3kvv6m+IfwAOnmI7UIorLQAAAABJRU5ErkJggg==") no-repeat; } ')
	GM_addStyle('#btStop:hover { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAVLSURBVFiF1ZlNbBNHFIDfzNgBh+D1Cm1spGA3baicHw6AS2MkU5REsyCBiBBc4MAFqaiHihMXDlU5cOBUtVIFRy70QEUkOIRdYSSwRFLkOEI4xQpZEUfbyPEKORZgBzsz00PjKE1s54f8mO84b2bn8+5o5s0zgjWiqmoL5/w0IeQwQqhJCOHhnO8CAMAYv0UIpYQQJmPsGcb4nqZpY2uZB62m8/HjxxXO+WUAOCdJkisQCHBFUYAQwjDGDGPMAAA454RzThhjxLIsiEajOJvNTgPAHYzxL/39/da6ClJKdyCErthsth97enpYY2Mjy+fzuUQikclkMoVqY2VZrvP7/bLD4ahPp9Pk0aNHZHZ29lchxA1d1z98siCl9AzG+GYoFBJ79+5lsVgsZVnWzEp+2GIURdl+4MABz+vXr0kkEkGc80u6rv9ZbQypEkOU0utut/va+fPnxdTU1NTQ0FA6l8vNrkUOACCXy80ahjHtdDqLx44dazBN85TH45EMw3hcUaJc48mTJ+uLxeJdv9//bTAYLIbD4QnGmFirWDkIIai7u9s7MDBgTyQSf9nt9rMPHjzILe6Hy0kXi8W7nZ2dhzo6Ot7pup5cbzkAAMaY0HU92dHR8a6zs/NQsVi8C2Ve2JJPTCm93traeqqlpeX9wMDA1HqLLcY0zQ/t7e11nPMvnU6nyzCMcEVBSukZt9t9rbu7u/DkyZN/NlpuoeTRo0d3Tk5OBj0ej2EYxt+l2PwnppTuwBjf7O3tZeFweGKz5EqEw+GJ3t5ehjG+SSndsUQQIXQlFAqJkZGR1EasueVgjImRkZFUKBQSCKEr814A/50QGOPRCxcufNQ0bbzSQyRJsnu93oZPEZmYmHifzWaLleKqqn5x+/btbZzzr/v7+y0bAADn/DKllMVisVS1h3u93obm5uavhoeHK05Qjf3799sBwHj58mWmUp9YLJbq6elpevjw4WUAuGqbaz/X2NjI4vH4sifE8PBwUdf1bZlMxTnKIssyAMBHl8tVtZ9lWTP79u1jAHAOAK7aVFVtkSTJlc/np1c6WSaTgVevXq0q0WhtbV3xus7n8zlJklyqqrZgzvnpQCDAE4nE6l7JBpJIJDKBQIBzzk9jQshhRVFguaxkM8lkMoW5NO4wRgg1EULYVksthhDCEEJNWAjhKSWatQTGmAkhPJhzvqtWBTnnu8plMzUFxhi/5ZxXS1y3BM45wRi/xQihVK0KIoRSeO5qWHOCjDEihDAxY+yZZVkgy3LdVkuVkGW5zrIsmLtT43vRaBT7/X55q8VK+P1+ORqNYozxPZumaWOqqk47HI76lT5AluVVna2lMSvF4XDUZ7PZaU3TxkrZzJ10Ov29oijbl7vzzqVMH1cjt3DsmzdvqvZRFGV7Op0mAHAH4DNIWNGCwM9Hjhz5gTE2lUwm33+KxFrx+XwNhBD306dPf9c07SeABXcSIcSNSCSC2tra3ISQVeV66wEhBLW1tbkjkQgSQtwotc8L6rr+gXN+qa+vz9bV1bVnswW7urr29PX12ebqNfNFpf9t0IZh/L17925pZmbmm4MHD9aZprls9Wk9CAaD7qGhIUcymbyl6/pvC2NLThDDMB7Lsvyd0+lsbm9v33DJYDDoNk2z4cWLF881Tbu4OF4umxF2u/3s4ODg83g8vpNS6tuINUkIQZRSXzwe3zk4OPjcbrefBYAle2vZM3h0dLQ4Njb2h9PpdE1OTgZPnDjhKhQKhWw2uy7XAp/P1xAMBr3379+vGx8fv6Vp2sXR0dGyW0/NFzA//xLwQmq2iF6Ozfob4l+31OWm1j44SgAAAABJRU5ErkJggg==") no-repeat; } ')

	GM_addStyle('#btPause { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAASJSURBVFiF1Zk9bCNFFMffvPHYO971h+SPxIpPRNYJqhS0KehYJxJpoksTCkpOFOiqayiAgitSRdBAQUGTJihNkBKvBOW1FJGusOKT4GI58drIib3Ztcc7Q3G2lfM5H74k2PylLXb27exvd57evPeWwDsqn88/lFKuUkoXCSFZpdSslDIBAICIdULIsVLqyPf954i4UygUDt/lOWQc4+Xl5ZSU8gkArBNCYpqmNUOhUCcQCAwOAIButxvsH+12O+h5XkQpdQoAW4i4ube3Z98poGmaOiHkKQB8qet6wzCMM8aYO87LCSF4q9WKOo4TB4DvlVIblmU5twY0TfMRIeRHznkrHo/XKaViHLBh+b7PGo1GwnVdQyn12LKsX6+yp1dcI6ZpPqOUfpNOp8uGYTQQUd4GDgAAEWU4HG5xzl3XdT/N5XLxUqn0x6UQowZXVlbCQohtxtiHyWSyjIj+bcFGSUpJa7XanBDiT8bY2u7u7vmwDY64jwghtjVNW0in06/uCw4AABH9dDr9StO0BSHENoz4YG8tsWmaz4LB4HIqlSoDgLovuIsKh8Mtz/M+mJ+fT5RKpd8vBTRN81HP5/4mhNza38YR57x1fn7+cS6Xe1kqlV70xweftBdK/pqZmSmPG0LuSkIIfnJyMqeUeq8fggY+SAh5yjlvTQoOAIAx5nLOW72Y+5oLYLBDFDOZzMubxLmzs7MZ13Uj/XPO+Wk0GrWHbFKu68Yu2DSj0ejJdXP7vs8qlUoOEd/f29uzEQBASvlE1/XGTYOw4zjxcrkcLRaLRqVSiXmeFxm28TwvUqlUYsVi0SiXy/0d5FpRSoWu643eljpY4nXDMM5uMkFfzWbTr9VqwnGcS8OQ4zh+rVYTzWZzrFDVY1kHAMB8Pv+QEBKbpO8NizHmEkJi+Xz+IUopVzVNa04aaliapjWllKtIKV0MhUKdSQMNKxQKdSili0gIyfbzuGlSIBDoEEKyqJSanVZApdQsSikT0woopUyMymamSoiI9W63G5w0yLC63W4QEetICDmeVkBCyDEqpY6mFVApdYS+7z9vt9tTB9hut4O9mhp3Rm32k5bneRFE3MFCoXColDoVQvBJQ/UlhOBKqdNCoXDYDzNbrVYrOs4kkUiEJpNJpuv6paWrrus0mUyySCRyVXn7lnosWwAAAQAARNx0HOeLaDT6z01yQl3XG3Nzc4MUalSyoWlaM5PJYCaTAYDXCetN4HzfZ47jxBFxE+BCTZLP57/lnH+WSCSObzLRfaler8+6rvtLoVD4GuBCTaKU2nBd15ikLwoheK8lstEfGwBaluUopR7btp2VUo7lM3chKSW1bTvb69cMmkpvgJRKpRe5XC7e6XQ+0nV9rBLgliK2bWeFED9blvXDGxdGGS8tLf2madpCIpGowP13F0i9Xs94nnewv7//yfDzRmUzijG25nneQbVafXCfyy2lpNVq9YHneQeMsbVhOICr+4PENM3vKKWfp1Kpo7suqoQQ3LbtrO/7P1mW9dUouOsAAWDyDcz/fwv4oqa2iT5K/9VviH8Bvf+C2hXUc8IAAAAASUVORK5CYII=") no-repeat; } ')
	GM_addStyle('#btPause:hover { background: url("data:image/png;base64,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") no-repeat; } ')
}

/*
 * ============================================================================
 * Site dependent code here!!!!
 * ============================================================================
 */
var supported_hosts = [ '180upload.com', '2gb-hosting.com', 'allmyvideos.net',
		'auengine.com', 'bayfiles.com', 'bestreams.net', 'billionuploads.com',
		'castamp.com', 'cheesestream.com', 'clicktoview.org', 'cloudy.ch',
		'cloudy.com', 'cloudy.ec', 'cloudy.eu', 'cloudy.sx', 'crunchyroll.com',
		'cyberlocker.ch', 'daclips.com', 'daclips.in', 'dailymotion.com',
		'divxden.com', 'divxstage.eu', 'divxstage.net', 'divxstage.to',
		'donevideo.com', 'ecostream.tv', 'entroupload.com', 'filebox.com',
		'filedrive.com', 'filenuke.com', 'firedrive.com', 'flashx.tv',
		'gorillavid.com', 'gorillavid.in', 'hostingbulk.com', 'hostingcup.com',
		'hugefiles.net', 'jumbofiles.com', 'lemuploads.com', 'limevideo.net',
		'megarelease.org', 'mega-vids.com', 'mightyupload.com', 'mooshare.biz',
		'movdivx.com', 'movieshd.co', 'movpod.in', 'movpod.net', 'movreel.com',
		'movshare.net', 'movzap.com', 'mp4stream.com', 'mp4upload.com',
		'mrfile.me', 'muchshare.net', 'nolimitvideo.com', 'nosvideo.com',
		'novamov.com', 'nowvideo.ch', 'nowvideo.eu', 'nowvideo.sx',
		'ovile.com', 'play44.net', 'played.to', 'playwire.com',
		'primeshare.tv', 'promptfile.com', 'purevid.com', 'putlocker.com',
		'rapidvideo.com', 'seeon.tv', 'shared.sx', 'sharefiles4u.com',
		'sharerepo.com', 'sharesix.com', 'sharevid.org', 'skyload.net',
		'slickvid.com', 'sockshare.com', 'stagevu.com', 'stream2k.com',
		'streamcloud.eu', 'thefile.me', 'thevideo.me', 'trollvid.net',
		'tubeplus.me', 'tune.pk', 'ufliq.com', 'uploadc.com',
		'uploadcrazy.net', 'veehd.com', 'veoh.com', 'vidbull.com',
		'vidbux.com', 'vidcrazy.net', 'video44.net', 'videobb.com',
		'videoboxone.com', 'videofun.me', 'videomega.tv', 'videoraj.ch',
		'videoraj.com', 'videoraj.ec', 'videoraj.eu', 'videoraj.sx',
		'videotanker.co', 'videoweed.es', 'videozed.net', 'videozer.com',
		'vidhog.com', 'vidpe.com', 'vidplay.net', 'vidspot.net',
		'vidstream.in', 'vidto.me', 'vidup.org', 'vidxden.com', 'vidzi.tv',
		'vidzur.com', 'vimeo.com', 'vk.com', 'vodlocker.com', 'vureel.com',
		'watchfreeinhd.com', 'xvidstage.com', 'yourupload.com', 'youtu.be',
		'youtube.com', 'youwatch.org', 'zalaa.com', 'zooupload.com',
		'zshare.net', 'zuzvideo.com' ];

function binarySearch(items, value) {

	var startIndex = 0, stopIndex = items.length - 1, middle = Math
			.floor((stopIndex + startIndex) / 2);

	while (items[middle] != value && startIndex < stopIndex) {
		// adjust search area
		if (value < items[middle]) {
			stopIndex = middle - 1;
		} else if (value > items[middle]) {
			startIndex = middle + 1;
		}

		// recalculate middle
		middle = Math.floor((stopIndex + startIndex) / 2);
	}

	// make sure it's the right value
	return (items[middle] != value) ? -1 : middle;
}

function encode_video_url(video_url) {
	return 'plugin://script.video.anyurl/?mode=play_video&url='
			+ encodeURIComponent(video_url);
}

// var clip = document.URL;

// Remove known top domain names (i.e 'www', 'm', 'embed')
var top_domain = /^www\.|^m\.|^embed\./
var host = window.location.host.toLowerCase().replace(top_domain, '');

if (binarySearch(supported_hosts, host) >= 0 && top == self) {
	add_play_on_xbmc_buttons()
} else {
	console.log("Unsupported host " + document.documentURI)
}
