const rejoin = () => {
    window.location.href = document.referrer;
}

const gotoRoom = () => {
    window.location.href = '/room';
}

if(window.location.href !== document.referrer 
    && document.referrer !== "" 
    && document.referrer.substr(0, ("https://" + document.domain).length) === ("https://" + document.domain)){
        $('.rejoin').append("<button onclick='rejoin()'>Rejoin the Room</button>");
}