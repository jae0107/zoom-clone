const rejoin = () => {
    window.location.href = document.referrer;
}

const gotoRoom = () => {
    window.location.href = '/room';
}

if(window.location.href !== document.referrer && document.referrer !== ""){
    $('.rejoin').append("<button onclick='rejoin()'>Rejoin the Room</button>");
}