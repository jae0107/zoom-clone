const socket = io('/');
const video_grid = document.getElementById('video-grid');
const my_video = document.createElement('video');
my_video.muted = true;
my_video.setAttribute("controls", "");

var peer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: '7000'
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
        call.on('stream', user_video_stream => {
            if(!peerList.includes(call.peerConnection)){
                peerList.push(call.peerConnection);
            }
            add_video_stream(video, user_video_stream);
        });
    });

    socket.on('user-connected', (userId) => {
        connect_to_new_user(userId, stream, "ourVideo");
    });

    socket.on('user-disconnected', userId => {
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
        $('.messages').append(`<li class="message"><b>${info.nickname}</b><br>${info.msg}</li>`);
        scroll_to_bottom();
    });
});

peer.on('open', id => {
    if(sessionStorage.length === 0){
        $(document).ready(() => {
            alertify.prompt("Enter your name", (e, str) => {
                nickname = str;
                sessionStorage.setItem('ID',nickname);
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

const connect_to_new_user = (userId, stream, share) => {
    //call user
    const call = peer.call(userId, stream);
    const video = document.createElement('video');
    //add new user stream to our own stream
    if(share !== "share"){
        call.on('stream', user_video_stream => {
            if(!peerList.includes(call.peerConnection)){
                peerList.push(call.peerConnection);
            }
            add_video_stream(video, user_video_stream);
        });
    }

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

const add_share_screen = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    share_screen.append(video);
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

document.getElementById("shareScreen").addEventListener('click', e => {
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
            var sender = pc.getSenders().find(function(s) {
                return s.track.kind == videoTrack.kind;
            });
            sender.replaceTrack(videoTrack);
        });
    }).catch((err) => {
        console.log("unable to get display media" + err);
    });
});

const stopScreenShare = () => {
    let videoTrack = my_video_stream.getVideoTracks()[0];
    peerList.forEach((pc) => {
        var sender = pc.getSenders().find(function(s) {
            return s.track.kind == videoTrack.kind;
        });
        sender.replaceTrack(videoTrack);
    });
    sender.replaceTrack(videoTrack);
}