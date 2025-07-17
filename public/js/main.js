$(function () {
  // socket.io client side connection
  const socket = io.connect();

  // obtaining DOM elements from the Chat Interface
  const $messageForm = $("#message-form");
  const $messageBox = $("#message");
  const $chat = $("#chat");


  // obteniendo elementos del formulario de autenticación
  const $authForm = $("#authForm");
  const $nickError = $("#nickError");
  const $nickname = $("#nickname");
  const $password = $("#password");
  const $loginBtn = $("#loginBtn");
  const $registerBtn = $("#registerBtn");

  // obtaining the usernames container DOM
  const $users = $("#usernames");

  // Evento para login
  $loginBtn.on('click', function (e) {
    e.preventDefault();
    const nick = $nickname.val().trim();
    const pass = $password.val();
    const avatar = $('#avatar')[0].files[0];
    
    if (!nick || !pass) {
      $nickError.html('<div class="alert alert-danger">Completa apodo y contraseña.</div>');
      return;
    }

    const formData = new FormData();
    formData.append('nick', nick);
    formData.append('password', pass);
    if (avatar) {
      formData.append('avatar', avatar);
    }

    $.ajax({
      url: '/login',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function (data) {
        if (data.success) {
          // Asociar el usuario al socket
          socket.emit("new user", nick, function (ok) {
            if (ok) {
              $("#nickWrap").hide();
              document.querySelector("#contentWrap").style.display = "flex";
              $("#message").focus();
              // Store avatar URL in localStorage
              localStorage.setItem('avatar', data.avatarUrl);
            } else {
              $nickError.html('<div class="alert alert-danger">Ese apodo ya está en uso en el chat.</div>');
            }
          });
        } else {
          $nickError.html('<div class="alert alert-danger">' + data.message + '</div>');
        }
      }
    });
  });

  // Evento para registro
  $registerBtn.on('click', function (e) {
    e.preventDefault();
    const nick = $nickname.val().trim();
    const pass = $password.val();
    if (!nick || !pass) {
      $nickError.html('<div class="alert alert-danger">Completa apodo y contraseña.</div>');
      return;
    }
    $.post('/register', { nick, password: pass }, function (data) {
      if (data.success) {
        $nickError.html('<div class="alert alert-success">Usuario registrado, ahora puedes iniciar sesión.</div>');
      } else {
        $nickError.html('<div class="alert alert-danger">' + data.message + '</div>');
      }
    });
  });

  // events
  $messageForm.submit((e) => {
    e.preventDefault();
    socket.emit("send message", $messageBox.val(), (data) => {
      $chat.append(`<p class="error">${data}</p>`);
    });
    $messageBox.val("");
  });

  socket.on("new message", (data) => {
    displayMsg(data);
  });

  // Handle private messages
  socket.on('private message', (data) => {
    if (data.type === 'sent') {
      $chat.append(`<p class="private-message-sent"><b>Tú → ${data.nick}:</b> ${data.msg}</p>`);
    } else {
      $chat.append(`<p class="private-message-received"><b>${data.nick} → Tú:</b> ${data.msg}</p>`);
    }
    $chat.scrollTop($chat[0].scrollHeight);
  });

  // Mostrar usuarios y permitir chat privado
  socket.on("usernames", (data) => {
    let html = "";
    for (let i = 0; i < data.length; i++) {
      const avatarUrl = localStorage.getItem('avatar') || '/images/default-avatar.png';
      html += `
        <div class="user-item" data-user="${data[i]}">
          <img src="${avatarUrl}" class="avatar" alt="Avatar">
          <span><i class="fas fa-user"></i> ${data[i]}</span>
        </div>
      `;
    }
    $users.html(html);
  });

  // Evento click en usuario para chat privado
  $users.on('click', '.user-item', function () {
    const toUser = $(this).data('user');
    const myUser = $nickname.val() || localStorage.getItem('myUser');
    if (toUser && toUser !== myUser) {
      const privateMsg = prompt(`Mensaje privado para ${toUser}:`);
      if (privateMsg) {
        socket.emit('private message', { to: toUser, msg: privateMsg });
        $chat.append(`<p class="whisper text-end"><b>Tú → ${toUser}:</b> ${privateMsg}</p>`);
      }
    }
  });

  socket.on("whisper", (data) => {
    $chat.append(`<p class="whisper"><b>${data.nick} → Tú:</b> ${data.msg}</p>`);
  });

  socket.on("load old msgs", (msgs) => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      displayMsg(msgs[i]);
    }
  });

  function displayMsg(data) {
    $chat.append(
      `<p class="p-2 bg-secondary w-75 animate__animated animate__backInUp"><b>${data.nick}</b>: ${data.msg}</p>`
    );
    const chat = document.querySelector("#chat");
    chat.scrollTop = chat.scrollHeight;
  }

  // Emoji picker (corregido para asegurar inicialización y compatibilidad jQuery)
  if (window.EmojiButton) {
    const picker = new EmojiButton();
    $('#emoji-btn').on('click', function (e) {
      picker.togglePicker(this);
    });
    picker.on('emoji', function (emoji) {
      const $msg = $('#message');
      $msg.val($msg.val() + emoji);
      $msg.focus();
    });
  }
});
