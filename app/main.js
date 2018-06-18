var socket, serverGame,
    username = "", playerColor,
    game, board,
    usersOnline = [],
    myGames = [];

socket = io();

//////////////////////////////
// Socket.io handlers
////////////////////////////// 

socket.on('login', function (msg) {
    usersOnline = msg.users;
    updateUserList();

    myGames = msg.games;
    updateGamesList();
});

socket.on('checking', function (msg) {
    var onlineUsers = msg;
    checkUser(onlineUsers);
});

function checkUser(onlineUsers) {
    if (onlineUsers.includes(username)) {
        document.getElementById("alert2").style.display = "";
    } else {
        socket.emit('login', username);
        $('#page-login').hide();
        document.getElementById('nav').style.display = "";
        $('#pages').show();
        $('#page-lobby').show();
        document.body.style.background = "none";

    }
}

socket.on('joinlobby', function (msg) {
    addUser(msg);
});

socket.on('leavelobby', function (msg) {
    removeUser(msg);
});

socket.on('gameadd', function (msg) {

});

socket.on('resign', function (msg) {
    if (msg.gameId == serverGame.id) {

        socket.emit('login', username);
        $('#page-lobby').show();
        $('#page-game').hide();
    }
});

socket.on('joingame', function (msg) {
    console.log("joined as game id: " + msg.game.id);
    playerColor = msg.color;
    initGame(msg.game);

    $('#page-lobby').hide();
    $('#page-game').show();

});

socket.on('move', function (msg) {
    if (serverGame && msg.gameId === serverGame.id) {
        game.move(msg.move);
        board.position(game.fen());
    }
});


socket.on('logout', function (msg) {
    removeUser(msg.userId);
});



//////////////////////////////
// Menus
////////////////////////////// 
$('#login').on('click', function () {
    username = $('#username').val();

    if (username.length > 0) {
        $('#userLabel').text("Nome Utente: " + username);
        socket.emit('check');
    } else
        document.getElementById("alert1").style.display = "";
});

$('#game-back').on('click', function () {
    socket.emit('login', username);

    $('#page-game').hide();
    $('#page-lobby').show();
});

$('#game-resign').on('click', function () {
    socket.emit('resign', {
        userId: username,
        gameId: serverGame.id
    });

    socket.emit('login', username);
    $('#page-game').hide();
    $('#page-lobby').show();
});

var addUser = function (userId) {
    if (!usersOnline.includes(userId))
        usersOnline.push(userId);
    updateUserList();
};

var removeUser = function (userId) {
    for (var i = 0; i < usersOnline.length; i++) {
        if (usersOnline[i] === userId) {
            usersOnline.splice(i, 1);
        }
    }
    
    updateUserList();
};

var updateGamesList = function () {
    var count = 1;
    document.getElementById('gamesList').innerHTML = '';
    myGames.forEach(function (game) {
        $('#gamesList').append($('<tr>')
            .append($('<td>').text(count++))
            .append($('<td>').text(game))
            .append($('<td>').append($('<button>')
                    .addClass("btn btn-warning")
                    .on('click', function () {
                        socket.emit('resumegame', game);
                    }).append($('<i>').addClass('fas fa-caret-square-right fa-lg')))));
    });
};

var updateUserList = function () {
    var count = 1;
    document.getElementById('userList').innerHTML = '';
    usersOnline.forEach(function (user) {
        $('#userList').append($('<tr>')
            .append($('<td>').text(count++))
            .append($('<td>').text(user))
            .append($('<td>').append($('<button>')
                    .addClass("btn btn-success")
                    .on('click', function () {
                        socket.emit('invite', user);
                    }).append($('<i>').addClass('fas fa-chess-knight fa-lg')))));
    });
    console.log(usersOnline);
};

//////////////////////////////
// Chess Game
////////////////////////////// 

var removeGreySquares = function () {
    $('#scacchiera .square-55d63').css('background', '');
};

var greySquare = function (square) {
    var squareEl = $('#scacchiera .square-' + square);

    var background = '#a9a9a9';
    if (squareEl.hasClass('black-3c85d') === true) {
        background = '#696969';
    }

    squareEl.css('background', background);
};

var onDragStart = function (source, piece) {
    // do not pick up pieces if the game is over
    // or if it's not that side's turn
    if (game.game_over() === true ||
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
        (game.turn() !== playerColor[0])) {
        return false;
    }
};

var onDrop = function (source, target) {
    removeGreySquares();

    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });
    console.log(game);
    // illegal move
    if (move === null) { 
        return 'snapback';
      } else {
         socket.emit('move', {move: move, gameId: serverGame.id, board: game.fen()});
    }

    updateStatus();
};

var onMouseoverSquare = function (square, piece) {
    // get list of possible moves for this square
    var moves = game.moves({
        square: square,
        verbose: true
    });

    // exit if there are no moves available for this square
    if (moves.length === 0) return;

    // highlight the square they moused over
    greySquare(square);

    // highlight the possible squares for this piece
    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
    }
};

var onMouseoutSquare = function (square, piece) {
    removeGreySquares();
};

var onSnapEnd = function () {
    board.position(game.fen());
};

var updateStatus = function () {
    var status = '';

    var moveColor = 'Bianco';
    if (game.turn() === 'b') {
        moveColor = 'Nero';
    }

    // checkmate?
    if (game.in_checkmate() === true) {
        status = 'Scacco matto, il ' + moveColor + ' ha perso.';
    }

    // draw?
    else if (game.in_draw() === true) {
        status = 'Stallo, il gioco è finito in pareggio.';
    }

    // game still on
    else {
        status = "E' il turno del "+ moveColor;

        // check?
        if (game.in_check() === true) {
            status += ', il re ' + moveColor + ' è sotto scacco!';
        }
    }
    $('#status').val(status);
    $('#fen').val(game.fen());
    $('#pgn').val(game.pgn());
};

socket.on('move', function (msg) {
    game.move(msg);
    board.position(game.fen());
    updateStatus();
});

var initGame = function (serverGameState) {
    serverGame = serverGameState;

    var cfg = {
        draggable: true,
        orientation: playerColor,
        position: serverGame.board ? serverGame.board : 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onMouseoutSquare: onMouseoutSquare,
        onMouseoverSquare: onMouseoverSquare,
        onSnapEnd: onSnapEnd
    };

    game = serverGame.board ? new Chess(serverGame.board) : new Chess();
      board = new ChessBoard('scacchiera', cfg);
    updateStatus();
}
   