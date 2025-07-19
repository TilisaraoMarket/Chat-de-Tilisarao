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

  // --- INICIO: Persistencia de sesión ---

  // Función para verificar sesión existente al cargar la página
  function checkExistingSession() {
    const savedUser = localStorage.getItem('chatUser');
    const sessionToken = localStorage.getItem('sessionToken');
    if (savedUser && sessionToken) {
      $nickError.html('<div class="alert alert-info">Verificando sesión...</div>');
      $.post('/verify-session', { nick: savedUser, token: sessionToken }, function (data) {
        if (data.success) {
          connectUserToChat(savedUser);
        } else {
          clearSession();
          $nickError.html('<div class="alert alert-warning">Sesión expirada, por favor inicia sesión nuevamente.</div>');
        }
      }).fail(function() {
        clearSession();
        $nickError.html('<div class="alert alert-danger">Error verificando sesión, por favor inicia sesión.</div>');
      });
    }
  }

  // Función para limpiar datos de sesión
  function clearSession() {
    localStorage.removeItem('chatUser');
    localStorage.removeItem('sessionToken');
  }

  // Función para conectar usuario al chat
  function connectUserToChat(nick) {
    socket.emit("new user", nick, function (ok) {
      if (ok) {
        $("#nickWrap").hide();
        document.querySelector("#contentWrap").style.display = "flex";
        $("#message").focus();
        $("#logoutBtn").show();
        $nickError.html('');
      } else {
        $nickError.html('<div class="alert alert-danger">Ese apodo ya está en uso en el chat.</div>');
        clearSession();
      }
    });
  }

  // Función para cerrar sesión
  function logout() {
    const token = localStorage.getItem('sessionToken');
    if (token) {
      $.post('/logout', { token: token });
    }
    clearSession();
    socket.disconnect();
    location.reload();
  }

  // Verificar sesión al cargar la página
  checkExistingSession();

  // Evento para logout
  $(document).on('click', '#logoutBtn', function (e) {
    e.preventDefault();
    if (confirm('¿Estás seguro que quieres cerrar sesión?')) {
      logout();
    }
  });

  // Atajo de teclado para logout (Ctrl + L)
  $(document).on('keydown', function(e) {
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      if (confirm('¿Cerrar sesión?')) {
        logout();
      }
    }
  });

  // --- FIN: Persistencia de sesión ---

  // Evento para login
  $loginBtn.on('click', function (e) {
    e.preventDefault();
    const nick = $nickname.val().trim();
    const pass = $password.val();
    const fileInput = document.getElementById('profilePic');
    if (!nick || !pass) {
      $nickError.html('<div class="alert alert-danger">Completa apodo y contraseña.</div>');
      return;
    }
    $nickError.html('<div class="alert alert-info">Iniciando sesión...</div>');
    // Procesar imagen si existe
    if (fileInput && fileInput.files && fileInput.files[0]) {
      compressImage(fileInput.files[0], function(base64img) {
        sendLogin(nick, pass, base64img);
      });
    } else {
      sendLogin(nick, pass, null);
    }
    function sendLogin(nick, pass, profilePic) {
      $.post('/login', { nick, password: pass, profilePic }, function (data) {
        if (data.success && data.token) {
          localStorage.setItem('chatUser', nick);
          localStorage.setItem('sessionToken', data.token);
          connectUserToChat(nick);
        } else {
          $nickError.html('<div class="alert alert-danger">' + (data.message || 'Error de login') + '</div>');
        }
      }).fail(function() {
        $nickError.html('<div class="alert alert-danger">Error de conexión, intenta nuevamente.</div>');
      });
    }
  });

  // Evento para registro
  $registerBtn.on('click', function (e) {
    e.preventDefault();
    const nick = $nickname.val().trim();
    const pass = $password.val();
    const fileInput = document.getElementById('profilePic');
    if (!nick || !pass) {
      $nickError.html('<div class="alert alert-danger">Completa apodo y contraseña.</div>');
      return;
    }
    // Procesar imagen si existe
    if (fileInput && fileInput.files && fileInput.files[0]) {
      compressImage(fileInput.files[0], function(base64img) {
        sendRegister(nick, pass, base64img);
      });
    } else {
      sendRegister(nick, pass, null);
    }
    function sendRegister(nick, pass, profilePic) {
      $.post('/register', { nick, password: pass, profilePic }, function (data) {
        if (data.success) {
          $nickError.html('<div class="alert alert-success">Usuario registrado, ahora puedes iniciar sesión.</div>');
        } else {
          $nickError.html('<div class="alert alert-danger">' + data.message + '</div>');
        }
      });
    }
  });
  // Función para comprimir imagen a base64
  function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        const maxSize = 128; // px
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // calidad 0.7
        callback(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

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

  socket.on("usernames", (data) => {
    let html = "";
    for (let i = 0; i < data.length; i++) {
      const user = data[i];
      const userId = `user-${user.nick}`;
      if (user.profilePic) {
        html += `<p class="user-item" data-nick="${user.nick}" id="${userId}" style="cursor:pointer;"><img src="${user.profilePic}" alt="Foto" style="width:32px;height:32px;border-radius:50%;margin-right:8px;vertical-align:middle;"> <b>${user.nick}</b></p>`;
      } else {
        html += `<p class="user-item" data-nick="${user.nick}" id="${userId}" style="cursor:pointer;"><i class="fas fa-user"></i> <b>${user.nick}</b></p>`;
      }
    }
    $users.html(html);
  });

  // Mensaje privado al seleccionar usuario
  let privateRecipient = null;
  $(document).on('click', '.user-item', function() {
    const nick = $(this).data('nick');
    if (nick) {
      privateRecipient = nick;
      $('#message').attr('placeholder', `Privado a: ${nick}`);
      $('#message').focus();
    }
  });

  // Limpiar destinatario privado si el usuario borra el input
  $('#message').on('input', function() {
    if (!$(this).val()) {
      privateRecipient = null;
      $(this).attr('placeholder', 'Escribe tu mensaje...');
    }
  });

  $messageForm.submit((e) => {
    e.preventDefault();
    let msg = $messageBox.val();
    if (privateRecipient) {
      msg = `/w ${privateRecipient} ${msg}`;
    }
    socket.emit("send message", msg, (data) => {
      $chat.append(`<p class="error">${data}</p>`);
    });
    $messageBox.val("");
    privateRecipient = null;
    $messageBox.attr('placeholder', 'Escribe tu mensaje...');
  });

  socket.on("whisper", (data) => {
    $chat.append(`<p class="whisper"><b>${data.nick}</b>: ${data.msg}</p>`);
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

  // Emoji picker
  $(document).ready(function() {
    const emojiBtn = document.getElementById('emoji-btn');
    const messageInput = document.getElementById('message');
    if (emojiBtn && messageInput && window.EmojiButton) {
      const picker = new EmojiButton({
        position: 'top-end',
        zIndex: 9999,
        autoHide: false,
        theme: 'auto',
      });
      emojiBtn.addEventListener('click', function(e) {
        picker.togglePicker(emojiBtn);
      });
      picker.on('emoji', function(emoji) {
        // Insertar emoji en la posición actual del cursor
        const start = messageInput.selectionStart;
        const end = messageInput.selectionEnd;
        const value = messageInput.value;
        messageInput.value = value.substring(0, start) + emoji + value.substring(end);
        messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
        messageInput.focus();
      });
    }
  });
});
