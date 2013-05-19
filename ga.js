'use strict';

// '0' is empty place
// valid moves:
// 0: right
// 1: bottom
// 2: left
// 3: up

var SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];

var BOARD_LEN = SOLVED.length;

var VALID_MOVES = [
    30583, // 0b0111011101110111
    4095,  // 0b0000111111111111
    61166, // 0b1110111011101110
    65520  // 0b1111111111110000
];

var MOVE_OFFSETS = [1, 4, -1, -4];


var log = function(msg) {
    postMessage({log: msg});
};


var fitness = function(board, moves, dont_finish) {
    var current_pos = board.indexOf(0);
    var moves_len = moves.length;
    var prev_move = 100;
    var proper_moves = [];

    for (var i = 0; i < moves_len; i++) {
        var move = moves[i];

        var is_move_redundant = Math.abs(move - prev_move) == 2;

        if (is_move_redundant) {
            proper_moves.pop();
        }

        var is_move_valid = VALID_MOVES[move] & (1 << current_pos);

        if (!is_move_valid) {
            continue;
        }

        if (is_move_redundant) {
            prev_move = proper_moves[proper_moves.length - 1];
        } else {
            prev_move = move;
            proper_moves.push(move);
        }

        var new_pos = current_pos + MOVE_OFFSETS[move];
        board[current_pos] = board[new_pos];
        board[new_pos] = 0;
        current_pos = new_pos;

        var is_solved = (
                SOLVED[0] == board[0] && SOLVED[1] == board[1] &&
                SOLVED[2] == board[2] && SOLVED[3] == board[3] &&
                SOLVED[4] == board[4] && SOLVED[5] == board[5] &&
                SOLVED[6] == board[6] && SOLVED[7] == board[7] &&
                SOLVED[8] == board[8] && SOLVED[9] == board[9] &&
                SOLVED[10] == board[10] && SOLVED[11] == board[11] &&
                SOLVED[12] == board[12] && SOLVED[13] == board[13] &&
                SOLVED[14] == board[14] && SOLVED[15] == board[15]);

        if (!dont_finish && is_solved) {
            return {
                fitness: 1 + (moves.length - proper_moves.length),
                board: board.slice(),
                moves: proper_moves.slice(),
                orig_moves: moves.slice(),
            };
        }
    }

    var diff = 0;

    // Calculate taxicab distances
    for (var i = 0; i < 16; i++) {
        var proper = SOLVED.indexOf(i);
        var current = board.indexOf(i);
        var proper_row = Math.floor(proper / 4);
        var proper_column = proper % 4;
        var current_row = Math.floor(current / 4);
        var current_column = current % 4;
        diff += Math.abs(proper_row - current_row) + Math.abs(proper_column - current_column);
    }

    return {
        fitness: 1 / Math.pow(diff, 2),
        board: board.slice(),
        moves: proper_moves.slice(),
        orig_moves: moves.slice(),
    };
};


var scramble = function(moves_len) {
    moves_len = moves_len || 500;
    var moves = [];

    for (var i = 0; i < moves_len; i++) {
        moves.push(Math.floor(Math.random() * 4));
    }
    var scrambled = fitness(SOLVED.slice(), moves, true);
    return scrambled.board;
}


var initial_population = function(population_size, moves_len) {
    var population = [];
    for (var i = 0; i < population_size; i++) {
        var moves = [];
        for (var j = 0; j < moves_len; j++) {
            moves.push(Math.floor(Math.random() * 4));
        }
        population.push(moves);
    }
    return population;
};


var run = function(board, population_size, moves_len, crossover_rate, mutation_rate, max_generations) {
    var population = initial_population(population_size, moves_len);

    for (var generation = 0; generation < max_generations; generation++) {
        var fitnesses = [];
        var fitness_sum = 0;
        var best = {
            fitness: 0
        }

        for (var i = 0; i < population_size; i++) {
            var f = fitness(board.slice(), population[i].slice());
            fitnesses.push(f);
            fitness_sum += f.fitness;

            if (f.fitness > best.fitness) {
                best = f;
            }
        }

        postMessage({
            generation: generation,
            best: best
        })

        var new_population = [];

        // Selection
        for (var i = 0; i < population_size; i++) {
            var roulette = Math.random() * fitness_sum;
            var current_sum = 0;

            for (var j = 0; j < population_size; j++) {
                current_sum += fitnesses[j].fitness;
                if (current_sum >= roulette) {
                    new_population.push(population[j]);
                    break;
                }
            }
        }

        // Crossover
        for (var i = 0; i < population_size / 2; i++) {
            var first = new_population[i * 2];
            var second = new_population[i * 2 + 1];
            var has_crossover = Math.random() <= crossover_rate;

            if (has_crossover) {
                var cp = Math.floor(Math.random() * (moves_len - 1)) + 1;
                new_population[i * 2] = first.slice(0, cp).concat(second.slice(cp, moves_len * 2));
                new_population[i * 2 + 1] = second.slice(0, cp).concat(first.slice(cp, moves_len * 2));
            }
        }

        // Mutations
        for (var i = 0; i < population_size; i++) {
            for (var j = 0; j < moves_len; j++) {
                var has_mutation = Math.random() <= mutation_rate;
                if (!has_mutation) {
                    continue;
                }
                new_population[i][j] = Math.floor(Math.random() * 4);
            }
        }

        // Keep the best one around
        new_population[0] = best.orig_moves.slice();

        population = new_population;
    }

    postMessage({finished: true});
    self.close();
};


onmessage = function(e) {
    if (e.data.action == 'scramble') {
        postMessage(scramble(e.data.moves_len));
    } else {
        var config = e.data.configuration;
        run(e.data.board, config.population_size, config.moves_len,
                config.crossover_rate, config.mutation_rate,
                config.max_generations);
    }
};

