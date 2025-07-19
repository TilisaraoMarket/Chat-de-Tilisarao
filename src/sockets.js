import Chat from './models/Chat.js'

export default io => {

  let users = {};
  // Almacén temporal de fotos de perfil
  let userPics = {};

  io.on('connection', async socket => {

    let messages = await Chat.find({ limit: 8, sort: '-created' });

    socket.emit('load old msgs', messages);

    socket.on('new user', async (data, cb) => {
      // data puede ser solo nick, pero vamos a buscar la foto en la base de datos
      const nick = typeof data === 'string' ? data : (data.nick || '');
      if (nick in users) {
        cb(false);
      } else {
        cb(true);
        socket.nickname = nick;
        users[socket.nickname] = socket;
        // Buscar foto de perfil
        try {
          const { findByNick } = await import('./models/User.js');
          const user = await (await import('./models/User.js')).default.findByNick(nick);
          userPics[nick] = user && user.profile_pic ? user.profile_pic : null;
        } catch (e) {
          userPics[nick] = null;
        }
        updateNicknames();
      }
    });

    // receive a message a broadcasting
    socket.on('send message', async (data, cb) => {
      var msg = data.trim();

      if (msg.substr(0, 3) === '/w ') {
        msg = msg.substr(3);
        var index = msg.indexOf(' ');
        if(index !== -1) {
          var name = msg.substring(0, index);
          var msg = msg.substring(index + 1);
          if (name in users) {
            users[name].emit('whisper', {
              msg,
              nick: socket.nickname 
            });
          } else {
            cb('Error! Enter a valid User');
          }
        } else {
          cb('Error! Please enter your message');
        }
      } else {
        await Chat.save({
          msg,
          nick: socket.nickname
        });
      
        io.sockets.emit('new message', {
          msg,
          nick: socket.nickname
        });
      }
    });

    socket.on('disconnect', data => {
      if(!socket.nickname) return;
      delete users[socket.nickname];
      updateNicknames();
    });

    function updateNicknames() {
      // Enviar nick y foto de perfil
      const userList = Object.keys(users).map(nick => ({ nick, profilePic: userPics[nick] || null }));
      io.sockets.emit('usernames', userList);
    }
  });

}
