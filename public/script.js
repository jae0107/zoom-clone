const socket = io('/');
const video_grid = document.getElementById('video-grid');
const my_video = document.createElement('video');
my_video.muted = true;
my_video.setAttribute("controls", "");
my_video.setAttribute("id", "myVideo");

var peer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: '443'
    //port: '7000'
}); 

let nickname = "user";
const peers = {};
let my_video_stream;
let peerList = [];

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true

}).then(stream => {
    my_video_stream = stream;
    add_video_stream(my_video, stream);

    peer.on('call', call => {
        //answer the call
        call.answer(stream);
        //add new user stream
        const video = document.createElement('video');
        video.setAttribute("controls", "");
        video.setAttribute("id", call.peer);

        call.on('stream', user_video_stream => {
            if(!peerList.includes(call.peerConnection)){
                peerList.push(call.peerConnection);
            }
            add_video_stream(video, user_video_stream);
        });
        
        peers[call.peer] = call;
    });

    socket.on('user-connected', (userId, nickname) => {
        connect_to_new_user(userId, stream, nickname);
    });

    socket.on('user-disconnected', (userId) => {
        document.getElementById(userId).remove();

        if (peers[userId]) {
            peers[userId].close();
        }
    });
    
    // input value
    let text = $("input");
    // when press enter send message
    $('html').keydown((e) => {
        if (e.which == 13 && text.val().length !== 0) {
            socket.emit('message', text.val());
            text.val('');
        }
    });

    socket.on('create_message', info => {
        if(info.nickname === sessionStorage.getItem('ID')){
            $('.messages').append(`<li class="message my-bubble"><b>${info.nickname}:</b><br>${info.msg}</li>`);
        } else {
            $('.messages').append(`<li class="message friend-bubble"><b>${info.nickname}:</b><br>${info.msg}</li>`);
        }
        
        scroll_to_bottom();
    });
});

peer.on('open', id => {
    if(sessionStorage.length === 0){
        $(document).ready(() => {
            alertify.prompt("Enter your name", (e, str) => {
                if(str !== ""){
                    nickname = str;
                }
                sessionStorage.setItem('ID', nickname);
                socket.emit('join-room', ROOM_ID, id, nickname);
                
                if (e) {
                    alertify.success("You've clicked OK and typed: " + str);
                } else {
                    alertify.error("You've clicked Cancel");
                }
            }, "");
            return false;
        });
    } else {
        nickname = sessionStorage.getItem('ID');
        socket.emit('join-room', ROOM_ID, id, nickname);
    }
});

$("#success").on( 'click', () => {
    alertify.success("Success log message");
    return false;
});

const connect_to_new_user = (userId, stream, nickname) => {
    //call user
    const call = peer.call(userId, stream);
    const video = document.createElement('video');
    video.setAttribute("controls", "");
    video.setAttribute("id", userId);

    //add new user stream to our own stream
    call.on('stream', user_video_stream => {
        if(!peerList.includes(call.peerConnection)){
            peerList.push(call.peerConnection);
        }
        add_video_stream(video, user_video_stream);
    });

    call.on('close', () => {
        video.remove();
    });
    
    peers[userId] = call;
}

const add_video_stream = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    video_grid.append(video);
}

//keep displaying the bottom of the chat window
const scroll_to_bottom = () => {
    let d = $('.main_chat_window');
    d.scrollTop(d.prop("scrollHeight"));
}

//Mute or unmute my video
const mute_or_unmute = () => {
    const enabled = my_video_stream.getAudioTracks()[0].enabled;
    if(enabled){
        my_video_stream.getAudioTracks()[0].enabled = false;
        setUnmuteButton();

    } else {
        setMuteButton();
        my_video_stream.getAudioTracks()[0].enabled = true;
    }
}

const setMuteButton = () => {
    const html = `
        <i class="fas fa-microphone"></i>
        <span>Mute</span>
    `
    document.querySelector('.main_mute_button').innerHTML = html;
}

const setUnmuteButton = () => {
    const html = `
        <i class="unmute fas fa-microphone-slash"></i>
        <span>Unmute</span>
    `
    document.querySelector('.main_mute_button').innerHTML = html;
}

//stop or resume my video
const stop_or_resume = () => {
    let enabled = my_video_stream.getVideoTracks()[0].enabled;
    if (enabled) {
        my_video_stream.getVideoTracks()[0].enabled = false;
        setPlayVideo();

    } else {
        setStopVideo();
        my_video_stream.getVideoTracks()[0].enabled = true;
    }
}

const setStopVideo = () => {
    const html = `
        <i class="fas fa-video"></i>
        <span>Stop Video</span>
    `
    document.querySelector('.main_video_button').innerHTML = html;
}
  
const setPlayVideo = () => {
    const html = `
        <i class="stop fas fa-video-slash"></i>
        <span>Play Video</span>
    `
    document.querySelector('.main_video_button').innerHTML = html;
}

let attr_id = "";
$(".main_share_button").click (function(){
    attr_id = $(this).attr("id");
})

document.getElementById("shareScreen").addEventListener('click', e => {
    //console.log("share");
    if (attr_id === "shareScreen"){
        //console.log("share1");
        navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: "always"
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            }
        }).then((stream) => {
            let videoTrack = stream.getVideoTracks()[0];
            videoTrack.onended = () => {
                stopScreenShare();
            }
            
            peerList.forEach((pc) => {
                var sender = pc.getSenders().find(s => {
                    return s.track.kind == videoTrack.kind;
                });
                sender.replaceTrack(videoTrack);
            });
            
            $("#shareScreen").attr('id', 'unshareScreen');
            const html = `
                <i class="stop fas fa-desktop"></i>
                <span>Unshare Screen</span>
            `
            document.querySelector('.main_share_button').innerHTML = html;
        }).catch((err) => {
            console.log("unable to get display media" + err);
        });
    } else if (attr_id === "unshareScreen") {
        stopScreenShare();
    }
    
});

const stopScreenShare = () => {
    let videoTrack = my_video_stream.getVideoTracks()[0];
    peerList.forEach((pc) => {
        var sender = pc.getSenders().find(function(s) {
            return s.track.kind == videoTrack.kind;
        });
        sender.replaceTrack(videoTrack);
    });

    $("#unshareScreen").attr('id', 'shareScreen');
    const html = `
        <i class="fas fa-desktop"></i>
        <span>Share Screen</span>
    `
    document.querySelector('.main_share_button').innerHTML = html;
    //sender.replaceTrack(videoTrack);
}

const change_name = () => {
    $(document).ready(() => {
        alertify.prompt("Enter your name", (e, str) => {
            nickname = str;
            sessionStorage.removeItem('ID');
            sessionStorage.setItem('ID', nickname);
            socket.emit('change_name', nickname);
            
            if (e) {
                alertify.success("You've clicked OK and typed: " + str);
            } else {
                alertify.error("You've clicked Cancel");
            }
        }, "");
        return false;
    });
}

const leave = () => {
    window.location.href = 'https://shrouded-island-88990.herokuapp.com/';
    //window.location.href = 'http://localhost:7000/';
}

async function num(){
    await Swal.fire({
        title: 'Enter the number of Guests',
        html:
            '<input id="swal-input1" class="swal2-input">',
        focusConfirm: false
    });
    let tmp = document.getElementById('swal-input1').value;
    if(tmp === "" || isNaN(tmp) || tmp === 0){
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Something went wrong!',
            footer: ''
        });
    } else {
        send_invitation(document.getElementById('swal-input1').value);
    }
}

async function send_invitation(num){
    let str = "";
  	for (let i = 1; i <= num; i++) {
  		if(str === ""){
  			str = `<input id="swal-input${i}" class="swal2-input">`;
  		} else {
  			str += `<input id="swal-input${i}" class="swal2-input">`;
  		}
  	}
      
	await Swal.fire({
		title: 'Enter Guests Emails',
		html:
			str,
		focusConfirm: false
	});

    let tmp = new Array();
    for(let i = 1; i <= num; i++){
        tmp.push(document.getElementById(`swal-input${i}`).value);
    }
    email(tmp);
}

const email = (receivers) => {
    Email.send({
        Host: "smtp.gmail.com",
        Username: "ghjgjh0107@gmail.com",
        Password: "ktkpnzvkhwwndjoq",
        To: receivers,
        From: "ghjgjh0107@gmail.com",
        Subject: "Zoom Clone Chat Invitation",
        Body: `Dear Sir or Madam,<br><br>You are invited by ${sessionStorage.getItem('ID')} to join the zoom clone chat. <br><br>The link is below. <br><br>${window.location.href} <br><br>Best regards, <br>Zoom Clone Project Team`,
    }).then((message) => {
        Swal.fire({
            position: 'center',
            icon: 'success',
            title: 'Mail sent successfully',
            showConfirmButton: false,
            timer: 1500
        });
    });
}