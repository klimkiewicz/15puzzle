(function() {
    'use strict';

    var GA_WORKERS = [];
    var CURRENT_BOARD = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
    var ARROWS = ['&rarr;', '&darr;', '&larr;', '&uarr;'];
    var INTERVAL_ID = null;

    var $ = document.getElementById.bind(document);

    var drawBoard = function(board) {
        for (var i = 0; i < board.length; i++) {
            var el = $('td' + i);
            if (board[i] == 0) {
                el.innerHTML = "";
            } else {
                el.innerHTML = board[i];
            }
            if (board[i] == i + 1) {
                el.className = "ok";
            } else {
                el.className = "alert";
            }
        }
    };

    drawBoard(CURRENT_BOARD);


    var getConfiguration = function() {
        return {
            population_size: parseInt($('population_size').value),
            moves_len: parseInt($('moves_len').value),
            max_generations: parseInt($('max_generations').value),
            crossover_rate: parseFloat($('crossover_rate').value),
            mutation_rate: parseFloat($('mutation_rate').value)
        }
    };


    $('scramble').addEventListener('click', function(e) {
        e.preventDefault();
        var el = e.target;
        if (!el.disabled) {
            el.disabled = true;
            $('start').disabled = true;
            var moves_len = parseInt($('scramble_len').value);
            var worker = new Worker('ga.js');
      
            worker.onmessage = function(e) {
                drawBoard(e.data);
                CURRENT_BOARD = e.data;
                el.disabled = false;
                $('start').disabled = false;
                $('source_board').value = e.data;
            };
      
            worker.postMessage({
                action: 'scramble',
                moves_len: moves_len
            })
        }
    });


    $('use_board').addEventListener('click', function(e) {
        var value = $('source_board').value;
        var board = value.split(',');
        drawBoard(board);
        CURRENT_BOARD = board;
    });


    var stopWorker = function() {
        var el = $('stop');
        if (el.disabled) {
            return;
        }
        el.disabled = true;

        var worker = GA_WORKERS[0];

        setTimeout(function() {
            worker.terminate();
        }, 10);

        GA_WORKERS = GA_WORKERS.slice(0, 0);
        $('start').disabled = false;
        $('scramble').disabled = false;
        $('use_board').disabled = false;

        if (INTERVAL_ID) {
            clearInterval(INTERVAL_ID);
            INTERVAL_ID = null;
        }
    };


    $('start').addEventListener('click', function(e) {
        var el = e.target;
        if (el.disabled) {
            return;
        }
        el.disabled = true;
        $('scramble').disabled = true;
        $('use_board').disabled = true;

        var config = getConfiguration();
        var board = [];

        for (var i = 0; i < CURRENT_BOARD.length; i++) {
            board.push(parseInt(CURRENT_BOARD[i]));
        }

        $('meter').style.width = '0%';
        $('results').innerHTML = '';
      
        var worker = new Worker('ga.js');
        GA_WORKERS.push(worker);

        var start_time = new Date().getTime();

        var showTime = function() {
            $('time').innerHTML = Math.round((new Date().getTime() - start_time) / 1000);
        };

        INTERVAL_ID = setInterval(showTime, 200);

        worker.onmessage = function(e) {
            if (e.data.log) {
                console.log(e.data.log);
                return;
            } else if (e.data.finished) {
                stopWorker();
                return;
            }

            drawBoard(e.data.best.board);
            $('meter').style.width = ((e.data.generation + 1) / config.max_generations * 100) + '%';

            if (e.data.best.fitness >= 1) {
                var moves = e.data.best.moves.length + ': ';
                for (var i = 0; i < e.data.best.moves.length; i++) {
                    var move = e.data.best.moves[i];
                    moves += '<strong>' + ARROWS[move] + '</strong>' + ' ';
                }
            } else {
                var moves = e.data.best.moves.length;
            }

            var tr = document.createElement('tr');
            tr.innerHTML = '<td>' + (e.data.generation + 1) + '</td>' +
                           '<td>' + e.data.best.fitness + '</td>' +
                           '<td>' + moves + '</td>';
            var parent = $('results');
            if (parent.childNodes.length) {
                parent.insertBefore(tr, parent.childNodes[0]);
            } else {
                parent.appendChild(tr);
            }
        };

        var msg = {
            action: 'ga',
            configuration: config,
            board: board
        };
        worker.postMessage(msg);
      
        $('stop').disabled = false;
    });


    $('stop').addEventListener('click', stopWorker);
})();
