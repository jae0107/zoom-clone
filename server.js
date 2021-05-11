const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const{ v4: uuidv4 } = require('uuid');
const { ExpressPeerServer } = require('peer');

const peerServer = ExpressPeerServer(server, {
	debug: true
});

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use('/peerjs', peerServer);
app.get('/', (req, res) => {
	res.render('home');
	//res.redirect(`/${uuidv4()}`);
});

app.get('/room', (req, res) => {
	res.redirect(`/${uuidv4()}`);
});

app.get('/:room', (req, res) => {
	res.render('room', { roomId: req.params.room });
});

let user_nickname = "user";
io.on('connection', socket => {
	socket.on('join-room', (roomId, userId, nickname) => {
		socket.join(roomId);
		//user_nickname = nickname;
		//socket.broadcast.emit('user-connected'); // to all clients in the current namespace except the sender
		//socket.to(roomId).broadcast.emit('user-connected');
		socket.to(roomId).emit('user-connected', userId); // to all clients in roomId except the sender

		socket.on('change_name', changed_name => {
			nickname = changed_name;
		});

		socket.on('message', message => {
			let info = {
				msg: message,
				nickname: nickname
			};
			io.to(roomId).emit('create_message', info);
		});

		socket.on('disconnect', () => {
			socket.to(roomId).emit('user-disconnected', userId);
		})
	});
});

server.listen(7000);