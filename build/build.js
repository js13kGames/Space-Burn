(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var loader = require('./loader.js');
var score = 0;

loader.done(function() {
    var raf = require('./raf');
    var player = require('./player');
    var key = require('./keys');
    var particles = require('./particles');
    var enemies = require('./enemies');
    var collisions = require('./collisions');
    var menus = require('./menus.js');

    var canvas = document.querySelector('#game');
    var ctx = canvas.getContext('2d');

    window.state = 'menu';
    raf.start(function(elapsed) {
        if (window.state === 'menu') {
            menus.drawMenu(ctx);
        }
        else if (window.state === 'game') {
            player.gravity(elapsed);
            if (key.up()) {
                player.up(elapsed);
                particles.createParticles(player.x + player.width / 2, player.y + player.height, player.angle, Math.PI / 10, 10, 10);
            } else {
                player.move(elapsed);
            }

            if (key.right()) {
                player.right(elapsed);
            }
            if (key.left()) {
                player.left(elapsed);
            }

            collisions.check(player, particles, enemies);

            // Clear the screen
            ctx.fillStyle = '#0f0d20';
            ctx.fillRect(0, 0, 800, 600);

            enemies.loop(elapsed, ctx, player.offsetX, player.offsetY);
            particles.draw(elapsed, ctx, player);
            player.draw(elapsed, ctx);
            menus.ingame(ctx, player.fuel, player.health);

            player.fuel -= 0.01;
            score++;

            if (player.health <= 0 || player.fuel <= 0) {
                window.state = 'end';
            }
        }
        else if (window.state === 'end') {
            menus.drawEnd(ctx, score);
        }

    });
});
},{"./collisions":2,"./enemies":3,"./keys":4,"./loader.js":5,"./menus.js":6,"./particles":7,"./player":8,"./raf":9}],2:[function(require,module,exports){
var playerHitBox = {
    x: 375,
    y: 270,
    width: 50,
    height: 60
};
var angledCollision = function(player, enemy) {
    var colliding = false;
    colliding = aabb(playerHitBox, enemy);
    return colliding;
};

var aabb = function(a, b) {
    if (
        Math.abs(a.x + a.width / 2 - b.x - b.width / 2) > (a.width + b.width) / 2 ||
        Math.abs(a.y + a.height / 2 - b.y - b.height / 2) > (a.height + b.height) / 2
    ) {
        return false;
    }
    return true;
};

var inArea = function(area, array, respColliding, respNotColliding) {
    var ret = [];
    var curElem;
    for (var i = 0; i < array.length; i++) {
        curElem = array[i];
        if (aabb(area, curElem)) {
            ret.push(curElem);
            if (respColliding) {
                respColliding(curElem);
            }
        }
        else if (respNotColliding) {
            respNotColliding(curElem);
        }
    }
    return ret;
};

var playerArea = {
    x: 325,
    y: 225,
    width: 150,
    height: 150
};

var camera = {
    x: -400,
    y: -300,
    width: 1600,
    height: 1200
};

var check = function(player, particlesModule, enemiesModule) {
    var particles = particlesModule.array;
    var enemies = enemiesModule.array;
    // Manage enemy spawning
    var enemiesInView = inArea(camera, enemies, undefined, function(enemy) {
        enemy.alive = false;
    });
    if (enemiesInView.length < 30) {
        enemiesModule.spawn(Math.random() * 100);
    }

    // Collisions between the player and rocks
    var enemiesToTest = inArea(playerArea, enemies);
    for (var i = 0; i < enemiesToTest.length; i++) {
        if (angledCollision(player, enemiesToTest[i])) {
            // console.log('HIT');
            enemiesToTest[i].alive = false;
            if (enemiesToTest[i].type === 'power-icon.png') {
                player.fuel += 10;
            }
            else {
                player.health -= (enemiesToTest[i].width * enemiesToTest[i].height) / 100;
            }
        }
    }

    // Check for collisions between particles and enemies
    for (var i = 0; i < particles.length; i++) {
        inArea(particles[i], enemies, function(enemy) {
            if (particles[i].alive) {
                enemy.alive = false;
            }
        });
    }
};

module.exports = {
    check: check
};
},{}],3:[function(require,module,exports){
var enemies = [];

var loader = require('./loader.js');

var rnd = function() {
    return Math.random();
};
var choose = function() {
    return arguments[Math.floor(rnd() * arguments.length)];
};

var SPAWN_RANGE = 100;
var MIN_SPEED = 0.3, MAX_SPEED = 2;
var WIDTH = 800, HEIGHT = 600;

var spawn = function(n) {
    // console.log('Spawned enemies:', n);
    var obj, targetY, targetX;
    var signX, signY, posX, posY;
    for (var i = 0; i < n; i++) {
        obj = {
            x: (rnd() * WIDTH),
            y: (rnd() * HEIGHT),
            speed: rnd() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED,
            type: choose.apply(this, loader.get('rock').concat(loader.get('power-icon'))),
            alive: true
        };
        targetY = rnd() * WIDTH;
        targetX = rnd() * HEIGHT;
        obj.angle = rnd() * Math.PI * 2;
        obj.width = loader.images[obj.type].width;
        obj.height = loader.images[obj.type].height;

        if (rnd() > 0.5) {
            obj.x += choose(-1, 1) * (WIDTH + obj.width);
        }
        else {
            obj.y += choose(-1, 1) * (HEIGHT + obj.height);
        }
        enemies.push(obj);
    }
};

var loop = function(elapsed, ctx, offsetX, offsetY) {
    var enemy;
    for (var i = enemies.length - 1; i >= 0; i--) {
        enemy = enemies[i];
        if (enemy.alive) {
            enemy.x += Math.cos(enemy.angle) * enemy.speed - offsetX;
            enemy.y += Math.sin(enemy.angle) * enemy.speed - offsetY;
            ctx.fillStyle = 'red';
            ctx.drawImage(loader.images[enemy.type], enemy.x, enemy.y);
        }
        else {
            enemies.splice(i, 1);
        }
    }
};


module.exports = {
    loop: loop,
    array: enemies,
    spawn: spawn
};
},{"./loader.js":5}],4:[function(require,module,exports){
var player = require('./player');
var keys = {};
document.body.addEventListener('keydown', function(e) {
    if (e.keyCode === 32) {
        player.flip();
        e.preventDefault();
    }
    keys[e.keyCode] = true;
});
document.body.addEventListener('keyup', function(e) {
    keys[e.keyCode] = false;
});

module.exports = {
    left: function() {
        return keys[37];
    },
    up: function() {
        return keys[38];
    },
    right: function() {
        return keys[39];
    },
    down: function() {
        return keys[40];
    },
    flip: function() {
        return keys[32];
    }
};

},{"./player":8}],5:[function(require,module,exports){
var imageNames = [
    'astro.png',
    'astro-flying.png',
    'health-bar-icon.png',
    'logo.png',
    'power-bar-icon.png',
    'power-icon.png',
    'rock-5.png',
    'rock-alt-5.png',
    'rock-odd-1.png',
    'rock-odd-3.png',
    'rock-odd-4.png'
];

var images = {};
var loaded = 0;
var done = function(cb) {
    for (var i = 0; i < imageNames.length; i++) {
        images[imageNames[i]] = new Image();
        images[imageNames[i]].src = 'images/' + imageNames[i];
        images[imageNames[i]].onload = function() {
            loaded++;
            if (loaded === imageNames.length) {
                cb();
            }
        }
    }
};

module.exports = {
    list: imageNames,
    images: images,
    done: done,
    get: function(string) {
        var ret = [];
        for(var i = 0; i < imageNames.length; i++) {
            if (imageNames[i].indexOf(string) !== -1) {
                ret.push(imageNames[i]);
            }
        }
        return ret;
    }
};
},{}],6:[function(require,module,exports){
var loader = require('./loader.js');
var text = require('./text.js');
document.body.addEventListener('click', function() {
    if (window.state === 'menu') {
        window.state = 'game';
    }
}, false);

module.exports = {
    drawMenu: function(ctx) {
        ctx.fillStyle = '#0f0d20';
        ctx.fillRect(0, 0, 800, 600);
        text.write('Click to Play', 'center', 300, function() {
            ctx.fillStyle = 'white';
            ctx.font = '42pt Arial';
        });
    },
    drawEnd: function(ctx, score) {
        ctx.fillStyle = '#0f0d20';
        ctx.fillRect(0, 0, 800, 600);
        text.write('The end! You scored ' + score + ' points!', 'center', 300, function() {
            ctx.fillStyle = 'white';
            ctx.font = '32pt Arial';
        });
    },
    ingame: function (ctx, fuel, health) {
        ctx.drawImage(loader.images['power-bar-icon.png'], 30, 500);
        ctx.fillStyle = 'orange';
        ctx.fillRect(30, 490 - fuel, 20, fuel);


        ctx.drawImage(loader.images['health-bar-icon.png'], 70, 500);
        ctx.fillStyle = 'red';
        ctx.fillRect(70, 490 - health, 20, health);
    }
};
},{"./loader.js":5,"./text.js":10}],7:[function(require,module,exports){
var particles = [];
var W = 5, H = 5;
var Particle = function(x, y, angle, speed) {
    this.alive = true;
    this.x = x;
    this.y = y;
    this.width = W;
    this.height = H;
    this.angle = angle;
    this.speed = speed;
    this.opacity = 1;
    this.delay = Math.ceil(Math.random() * 10);
    this.loop = function(ctx, player) {
        if (this.delay > 0) {
            this.delay--;
            return false;
        }
        this.x += Math.sin(-this.angle) * speed;
        this.y += Math.cos(-this.angle) * speed;
        this.opacity -= 0.1;
        if (this.opacity <= 0) {
            this.opacity = 0;
            this.alive = false;
        }
        // Draw
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    };
};

// x, y are fixed
// Particles are created from angle-range to angle+range
// speed is fixed
var angle = 0;
var createParticles = function(x, y, playerAngle, range, speed, n) {
    // console.log('Creating', particles);
    for (var i = 0; i < n; i++) {
        if (particles[i] && !particles[i].alive || !particles[i]) {
            angle = playerAngle - range + (Math.random() * 2 * range);
            particles[i] = new Particle(x, y, angle, speed);
        }
    }
};

var draw = function(elapsed, ctx, player) {
    for (var i = 0; i < particles.length; i++) {
        particles[i].loop(ctx, player);
    }
};

module.exports = {
    createParticles: createParticles,
    draw: draw,
    array: particles
};

},{}],8:[function(require,module,exports){
var Transform = require('./transform.js');
var canvas = document.querySelector('#game');

window.player = {};

player.idle = new Image();
player.idle.src = 'images/astro.png';
player.flying = new Image();
player.flying.src = 'images/astro-flying.png';
player.state = 'idle';
player.fuel = 100;
player.health = 100;

player.width = 52;
player.height = 60;
player.x = (canvas.width - player.width) / 2;
player.y = (canvas.height - player.height) / 2;
player.angle = 0;

player.offsetX = player.offsetY = 0;


// Half width, half height
var hW = player.width / 2;
var hH = player.height / 2;

var speed = 0; // The current speed
var dSpeed;
var dX = 0, dY = 0;

// YOU CAN CONFIGURE THESE! --------------------------
var acc = 7; // Acceleration
var lim = 10; // Speed limit
var turnSpeed = 2.2;
var grav = 0.08;
// NO MORE CONFIGURING! ------------------------------

player.gravity = function(elapsed) {
    dY -= grav;
};
player.move = function(elapsed, flying) {
    player.offsetX = dX;
    player.offsetY = -dY;
    dX *= 0.99;
    dY *= 0.99;

    if (!flying) {
        player.state = 'idle';
    }
};
player.up = function(elapsed) {
    player.fuel -= 0.1;
    player.state = 'flying';
    speed += acc;
    dSpeed = elapsed * speed;
    // console.log(player.x, player.y);
    // console.log(Math.sin(player.angle) * dSpeed, Math.cos(player.angle) * dSpeed);
    dX += Math.sin(player.angle) * dSpeed;
    dY += Math.cos(player.angle) * dSpeed;
    player.move(elapsed, true);
    if (speed > lim) {
        speed = lim;
    }
    else if (speed < -lim) {
        speed = -lim;
    }

};
player.right = function(elapsed) {
    player.angle += elapsed * turnSpeed * Math.PI;
};
player.left = function(elapsed) {
    player.angle -= elapsed * turnSpeed * Math.PI;
};
player.flip = function() {
    player.angle += Math.PI;
};

// var t = new Transform();
player.draw = function(elapsed, ctx) {
    // ctx.fillRect(375, 270, 50, 60);
    // Player
    ctx.save();
    ctx.translate(player.x + hW, player.y + hH);
    // t.translate(player.x + hW, player.y + hH);
    ctx.rotate(player.angle);
    // t.rotate(player.angle);
    ctx.drawImage(player[player.state], -hW, -hH);
    ctx.restore();

    // player.topLeft = t.transformPoint(-hW, -hH);
    // player.topRight = t.transformPoint(hW, -hH);
    // player.bottomLeft = t.transformPoint(-hW, hH);
    // player.bottomRight = t.transformPoint(hW, hH);
    // t.reset();

};
module.exports = player;

},{"./transform.js":11}],9:[function(require,module,exports){
// Holds last iteration timestamp.
var time = 0;

/**
 * Calls `fn` on next frame.
 *
 * @param  {Function} fn The function
 * @return {int} The request ID
 * @api private
 */
function raf(fn) {
  return window.requestAnimationFrame(function() {
    var now = Date.now();
    var elapsed = now - time;

    if (elapsed > 999) {
      elapsed = 1 / 60;
    } else {
      elapsed /= 1000;
    }

    time = now;
    fn(elapsed);
  });
}

module.exports = {
  /**
   * Calls `fn` on every frame with `elapsed` set to the elapsed
   * time in milliseconds.
   *
   * @param  {Function} fn The function
   * @return {int} The request ID
   * @api public
   */
  start: function(fn) {
    return raf(function tick(elapsed) {
      fn(elapsed);
      raf(tick);
    });
  },
  /**
   * Cancels the specified animation frame request.
   *
   * @param {int} id The request ID
   * @api public
   */
  stop: function(id) {
    window.cancelAnimationFrame(id);
  }
};

},{}],10:[function(require,module,exports){
var canvas = document.getElementsByTagName('canvas')[0];
var ctx = canvas.getContext('2d');
module.exports.write = function (text, x, y, preFunc, stroke){
    if(preFunc){
        ctx.save();
        preFunc(ctx);
    }

    var xPos = x;
    if(x === 'center'){
        xPos = (canvas.width - ctx.measureText(text).width) / 2;
    }

    if(stroke){
        ctx.strokeText(text, xPos, y);
    }
    else {
        ctx.fillText(text, xPos, y);
    }

    if(preFunc){
        ctx.restore();
    }
};
},{}],11:[function(require,module,exports){
// Last updated November 2011
// By Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Simple class for keeping track of the current transformation matrix

// For instance:
//    var t = new Transform();
//    t.rotate(5);
//    var m = t.m;
//    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

// Is equivalent to:
//    ctx.rotate(5);

// But now you can retrieve it :)

// Remember that this does not account for any CSS transforms applied to the canvas

function Transform() {
  this.reset();
}

Transform.prototype.reset = function() {
  this.m = [1,0,0,1,0,0];
};

Transform.prototype.multiply = function(matrix) {
  var m11 = this.m[0] * matrix.m[0] + this.m[2] * matrix.m[1];
  var m12 = this.m[1] * matrix.m[0] + this.m[3] * matrix.m[1];

  var m21 = this.m[0] * matrix.m[2] + this.m[2] * matrix.m[3];
  var m22 = this.m[1] * matrix.m[2] + this.m[3] * matrix.m[3];

  var dx = this.m[0] * matrix.m[4] + this.m[2] * matrix.m[5] + this.m[4];
  var dy = this.m[1] * matrix.m[4] + this.m[3] * matrix.m[5] + this.m[5];

  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
  this.m[4] = dx;
  this.m[5] = dy;
};

Transform.prototype.invert = function() {
  var d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]);
  var m0 = this.m[3] * d;
  var m1 = -this.m[1] * d;
  var m2 = -this.m[2] * d;
  var m3 = this.m[0] * d;
  var m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]);
  var m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
  this.m[0] = m0;
  this.m[1] = m1;
  this.m[2] = m2;
  this.m[3] = m3;
  this.m[4] = m4;
  this.m[5] = m5;
};

Transform.prototype.rotate = function(rad) {
  var c = Math.cos(rad);
  var s = Math.sin(rad);
  var m11 = this.m[0] * c + this.m[2] * s;
  var m12 = this.m[1] * c + this.m[3] * s;
  var m21 = this.m[0] * -s + this.m[2] * c;
  var m22 = this.m[1] * -s + this.m[3] * c;
  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
};

Transform.prototype.translate = function(x, y) {
  this.m[4] += this.m[0] * x + this.m[2] * y;
  this.m[5] += this.m[1] * x + this.m[3] * y;
};

Transform.prototype.scale = function(sx, sy) {
  this.m[0] *= sx;
  this.m[1] *= sx;
  this.m[2] *= sy;
  this.m[3] *= sy;
};

Transform.prototype.transformPoint = function(px, py) {
  var x = px;
  var y = py;
  px = x * this.m[0] + y * this.m[2] + this.m[4];
  py = x * this.m[1] + y * this.m[3] + this.m[5];
  return [px, py];
};

module.exports = Transform;
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4vc3JjL21haW4iLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9jb2xsaXNpb25zLmpzIiwiL2hvbWUvYW1hYW4vR2FtZXMvSlMxM2svMjAxNC9zcmMvZW5lbWllcy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL2tleXMuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9sb2FkZXIuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy9tZW51cy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL3BhcnRpY2xlcy5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL3BsYXllci5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL3JhZi5qcyIsIi9ob21lL2FtYWFuL0dhbWVzL0pTMTNrLzIwMTQvc3JjL3RleHQuanMiLCIvaG9tZS9hbWFhbi9HYW1lcy9KUzEzay8yMDE0L3NyYy90cmFuc2Zvcm0uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyLmpzJyk7XG52YXIgc2NvcmUgPSAwO1xuXG5sb2FkZXIuZG9uZShmdW5jdGlvbigpIHtcbiAgICB2YXIgcmFmID0gcmVxdWlyZSgnLi9yYWYnKTtcbiAgICB2YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbiAgICB2YXIga2V5ID0gcmVxdWlyZSgnLi9rZXlzJyk7XG4gICAgdmFyIHBhcnRpY2xlcyA9IHJlcXVpcmUoJy4vcGFydGljbGVzJyk7XG4gICAgdmFyIGVuZW1pZXMgPSByZXF1aXJlKCcuL2VuZW1pZXMnKTtcbiAgICB2YXIgY29sbGlzaW9ucyA9IHJlcXVpcmUoJy4vY29sbGlzaW9ucycpO1xuICAgIHZhciBtZW51cyA9IHJlcXVpcmUoJy4vbWVudXMuanMnKTtcblxuICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZ2FtZScpO1xuICAgIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgIHdpbmRvdy5zdGF0ZSA9ICdtZW51JztcbiAgICByYWYuc3RhcnQoZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgICAgICBpZiAod2luZG93LnN0YXRlID09PSAnbWVudScpIHtcbiAgICAgICAgICAgIG1lbnVzLmRyYXdNZW51KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAod2luZG93LnN0YXRlID09PSAnZ2FtZScpIHtcbiAgICAgICAgICAgIHBsYXllci5ncmF2aXR5KGVsYXBzZWQpO1xuICAgICAgICAgICAgaWYgKGtleS51cCgpKSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLnVwKGVsYXBzZWQpO1xuICAgICAgICAgICAgICAgIHBhcnRpY2xlcy5jcmVhdGVQYXJ0aWNsZXMocGxheWVyLnggKyBwbGF5ZXIud2lkdGggLyAyLCBwbGF5ZXIueSArIHBsYXllci5oZWlnaHQsIHBsYXllci5hbmdsZSwgTWF0aC5QSSAvIDEwLCAxMCwgMTApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIubW92ZShlbGFwc2VkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGtleS5yaWdodCgpKSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLnJpZ2h0KGVsYXBzZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGtleS5sZWZ0KCkpIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIubGVmdChlbGFwc2VkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29sbGlzaW9ucy5jaGVjayhwbGF5ZXIsIHBhcnRpY2xlcywgZW5lbWllcyk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIHRoZSBzY3JlZW5cbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuXG4gICAgICAgICAgICBlbmVtaWVzLmxvb3AoZWxhcHNlZCwgY3R4LCBwbGF5ZXIub2Zmc2V0WCwgcGxheWVyLm9mZnNldFkpO1xuICAgICAgICAgICAgcGFydGljbGVzLmRyYXcoZWxhcHNlZCwgY3R4LCBwbGF5ZXIpO1xuICAgICAgICAgICAgcGxheWVyLmRyYXcoZWxhcHNlZCwgY3R4KTtcbiAgICAgICAgICAgIG1lbnVzLmluZ2FtZShjdHgsIHBsYXllci5mdWVsLCBwbGF5ZXIuaGVhbHRoKTtcblxuICAgICAgICAgICAgcGxheWVyLmZ1ZWwgLT0gMC4wMTtcbiAgICAgICAgICAgIHNjb3JlKys7XG5cbiAgICAgICAgICAgIGlmIChwbGF5ZXIuaGVhbHRoIDw9IDAgfHwgcGxheWVyLmZ1ZWwgPD0gMCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5zdGF0ZSA9ICdlbmQnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHdpbmRvdy5zdGF0ZSA9PT0gJ2VuZCcpIHtcbiAgICAgICAgICAgIG1lbnVzLmRyYXdFbmQoY3R4LCBzY29yZSk7XG4gICAgICAgIH1cblxuICAgIH0pO1xufSk7IiwidmFyIHBsYXllckhpdEJveCA9IHtcbiAgICB4OiAzNzUsXG4gICAgeTogMjcwLFxuICAgIHdpZHRoOiA1MCxcbiAgICBoZWlnaHQ6IDYwXG59O1xudmFyIGFuZ2xlZENvbGxpc2lvbiA9IGZ1bmN0aW9uKHBsYXllciwgZW5lbXkpIHtcbiAgICB2YXIgY29sbGlkaW5nID0gZmFsc2U7XG4gICAgY29sbGlkaW5nID0gYWFiYihwbGF5ZXJIaXRCb3gsIGVuZW15KTtcbiAgICByZXR1cm4gY29sbGlkaW5nO1xufTtcblxudmFyIGFhYmIgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgaWYgKFxuICAgICAgICBNYXRoLmFicyhhLnggKyBhLndpZHRoIC8gMiAtIGIueCAtIGIud2lkdGggLyAyKSA+IChhLndpZHRoICsgYi53aWR0aCkgLyAyIHx8XG4gICAgICAgIE1hdGguYWJzKGEueSArIGEuaGVpZ2h0IC8gMiAtIGIueSAtIGIuaGVpZ2h0IC8gMikgPiAoYS5oZWlnaHQgKyBiLmhlaWdodCkgLyAyXG4gICAgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG52YXIgaW5BcmVhID0gZnVuY3Rpb24oYXJlYSwgYXJyYXksIHJlc3BDb2xsaWRpbmcsIHJlc3BOb3RDb2xsaWRpbmcpIHtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgdmFyIGN1ckVsZW07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjdXJFbGVtID0gYXJyYXlbaV07XG4gICAgICAgIGlmIChhYWJiKGFyZWEsIGN1ckVsZW0pKSB7XG4gICAgICAgICAgICByZXQucHVzaChjdXJFbGVtKTtcbiAgICAgICAgICAgIGlmIChyZXNwQ29sbGlkaW5nKSB7XG4gICAgICAgICAgICAgICAgcmVzcENvbGxpZGluZyhjdXJFbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyZXNwTm90Q29sbGlkaW5nKSB7XG4gICAgICAgICAgICByZXNwTm90Q29sbGlkaW5nKGN1ckVsZW0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG52YXIgcGxheWVyQXJlYSA9IHtcbiAgICB4OiAzMjUsXG4gICAgeTogMjI1LFxuICAgIHdpZHRoOiAxNTAsXG4gICAgaGVpZ2h0OiAxNTBcbn07XG5cbnZhciBjYW1lcmEgPSB7XG4gICAgeDogLTQwMCxcbiAgICB5OiAtMzAwLFxuICAgIHdpZHRoOiAxNjAwLFxuICAgIGhlaWdodDogMTIwMFxufTtcblxudmFyIGNoZWNrID0gZnVuY3Rpb24ocGxheWVyLCBwYXJ0aWNsZXNNb2R1bGUsIGVuZW1pZXNNb2R1bGUpIHtcbiAgICB2YXIgcGFydGljbGVzID0gcGFydGljbGVzTW9kdWxlLmFycmF5O1xuICAgIHZhciBlbmVtaWVzID0gZW5lbWllc01vZHVsZS5hcnJheTtcbiAgICAvLyBNYW5hZ2UgZW5lbXkgc3Bhd25pbmdcbiAgICB2YXIgZW5lbWllc0luVmlldyA9IGluQXJlYShjYW1lcmEsIGVuZW1pZXMsIHVuZGVmaW5lZCwgZnVuY3Rpb24oZW5lbXkpIHtcbiAgICAgICAgZW5lbXkuYWxpdmUgPSBmYWxzZTtcbiAgICB9KTtcbiAgICBpZiAoZW5lbWllc0luVmlldy5sZW5ndGggPCAzMCkge1xuICAgICAgICBlbmVtaWVzTW9kdWxlLnNwYXduKE1hdGgucmFuZG9tKCkgKiAxMDApO1xuICAgIH1cblxuICAgIC8vIENvbGxpc2lvbnMgYmV0d2VlbiB0aGUgcGxheWVyIGFuZCByb2Nrc1xuICAgIHZhciBlbmVtaWVzVG9UZXN0ID0gaW5BcmVhKHBsYXllckFyZWEsIGVuZW1pZXMpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW5lbWllc1RvVGVzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYW5nbGVkQ29sbGlzaW9uKHBsYXllciwgZW5lbWllc1RvVGVzdFtpXSkpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdISVQnKTtcbiAgICAgICAgICAgIGVuZW1pZXNUb1Rlc3RbaV0uYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChlbmVtaWVzVG9UZXN0W2ldLnR5cGUgPT09ICdwb3dlci1pY29uLnBuZycpIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuZnVlbCArPSAxMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHBsYXllci5oZWFsdGggLT0gKGVuZW1pZXNUb1Rlc3RbaV0ud2lkdGggKiBlbmVtaWVzVG9UZXN0W2ldLmhlaWdodCkgLyAxMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgY29sbGlzaW9ucyBiZXR3ZWVuIHBhcnRpY2xlcyBhbmQgZW5lbWllc1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGluQXJlYShwYXJ0aWNsZXNbaV0sIGVuZW1pZXMsIGZ1bmN0aW9uKGVuZW15KSB7XG4gICAgICAgICAgICBpZiAocGFydGljbGVzW2ldLmFsaXZlKSB7XG4gICAgICAgICAgICAgICAgZW5lbXkuYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY2hlY2s6IGNoZWNrXG59OyIsInZhciBlbmVtaWVzID0gW107XG5cbnZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlci5qcycpO1xuXG52YXIgcm5kID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XG59O1xudmFyIGNob29zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmd1bWVudHNbTWF0aC5mbG9vcihybmQoKSAqIGFyZ3VtZW50cy5sZW5ndGgpXTtcbn07XG5cbnZhciBTUEFXTl9SQU5HRSA9IDEwMDtcbnZhciBNSU5fU1BFRUQgPSAwLjMsIE1BWF9TUEVFRCA9IDI7XG52YXIgV0lEVEggPSA4MDAsIEhFSUdIVCA9IDYwMDtcblxudmFyIHNwYXduID0gZnVuY3Rpb24obikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdTcGF3bmVkIGVuZW1pZXM6Jywgbik7XG4gICAgdmFyIG9iaiwgdGFyZ2V0WSwgdGFyZ2V0WDtcbiAgICB2YXIgc2lnblgsIHNpZ25ZLCBwb3NYLCBwb3NZO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICAgIHg6IChybmQoKSAqIFdJRFRIKSxcbiAgICAgICAgICAgIHk6IChybmQoKSAqIEhFSUdIVCksXG4gICAgICAgICAgICBzcGVlZDogcm5kKCkgKiAoTUFYX1NQRUVEIC0gTUlOX1NQRUVEKSArIE1JTl9TUEVFRCxcbiAgICAgICAgICAgIHR5cGU6IGNob29zZS5hcHBseSh0aGlzLCBsb2FkZXIuZ2V0KCdyb2NrJykuY29uY2F0KGxvYWRlci5nZXQoJ3Bvd2VyLWljb24nKSkpLFxuICAgICAgICAgICAgYWxpdmU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgdGFyZ2V0WSA9IHJuZCgpICogV0lEVEg7XG4gICAgICAgIHRhcmdldFggPSBybmQoKSAqIEhFSUdIVDtcbiAgICAgICAgb2JqLmFuZ2xlID0gcm5kKCkgKiBNYXRoLlBJICogMjtcbiAgICAgICAgb2JqLndpZHRoID0gbG9hZGVyLmltYWdlc1tvYmoudHlwZV0ud2lkdGg7XG4gICAgICAgIG9iai5oZWlnaHQgPSBsb2FkZXIuaW1hZ2VzW29iai50eXBlXS5oZWlnaHQ7XG5cbiAgICAgICAgaWYgKHJuZCgpID4gMC41KSB7XG4gICAgICAgICAgICBvYmoueCArPSBjaG9vc2UoLTEsIDEpICogKFdJRFRIICsgb2JqLndpZHRoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG9iai55ICs9IGNob29zZSgtMSwgMSkgKiAoSEVJR0hUICsgb2JqLmhlaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgZW5lbWllcy5wdXNoKG9iaik7XG4gICAgfVxufTtcblxudmFyIGxvb3AgPSBmdW5jdGlvbihlbGFwc2VkLCBjdHgsIG9mZnNldFgsIG9mZnNldFkpIHtcbiAgICB2YXIgZW5lbXk7XG4gICAgZm9yICh2YXIgaSA9IGVuZW1pZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgZW5lbXkgPSBlbmVtaWVzW2ldO1xuICAgICAgICBpZiAoZW5lbXkuYWxpdmUpIHtcbiAgICAgICAgICAgIGVuZW15LnggKz0gTWF0aC5jb3MoZW5lbXkuYW5nbGUpICogZW5lbXkuc3BlZWQgLSBvZmZzZXRYO1xuICAgICAgICAgICAgZW5lbXkueSArPSBNYXRoLnNpbihlbmVteS5hbmdsZSkgKiBlbmVteS5zcGVlZCAtIG9mZnNldFk7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbZW5lbXkudHlwZV0sIGVuZW15LngsIGVuZW15LnkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZW5lbWllcy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxvb3A6IGxvb3AsXG4gICAgYXJyYXk6IGVuZW1pZXMsXG4gICAgc3Bhd246IHNwYXduXG59OyIsInZhciBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xudmFyIGtleXMgPSB7fTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXlDb2RlID09PSAzMikge1xuICAgICAgICBwbGF5ZXIuZmxpcCgpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICAgIGtleXNbZS5rZXlDb2RlXSA9IHRydWU7XG59KTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbihlKSB7XG4gICAga2V5c1tlLmtleUNvZGVdID0gZmFsc2U7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGVmdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzM3XTtcbiAgICB9LFxuICAgIHVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbMzhdO1xuICAgIH0sXG4gICAgcmlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ga2V5c1szOV07XG4gICAgfSxcbiAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGtleXNbNDBdO1xuICAgIH0sXG4gICAgZmxpcDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBrZXlzWzMyXTtcbiAgICB9XG59O1xuIiwidmFyIGltYWdlTmFtZXMgPSBbXG4gICAgJ2FzdHJvLnBuZycsXG4gICAgJ2FzdHJvLWZseWluZy5wbmcnLFxuICAgICdoZWFsdGgtYmFyLWljb24ucG5nJyxcbiAgICAnbG9nby5wbmcnLFxuICAgICdwb3dlci1iYXItaWNvbi5wbmcnLFxuICAgICdwb3dlci1pY29uLnBuZycsXG4gICAgJ3JvY2stNS5wbmcnLFxuICAgICdyb2NrLWFsdC01LnBuZycsXG4gICAgJ3JvY2stb2RkLTEucG5nJyxcbiAgICAncm9jay1vZGQtMy5wbmcnLFxuICAgICdyb2NrLW9kZC00LnBuZydcbl07XG5cbnZhciBpbWFnZXMgPSB7fTtcbnZhciBsb2FkZWQgPSAwO1xudmFyIGRvbmUgPSBmdW5jdGlvbihjYikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW1hZ2VOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpbWFnZXNbaW1hZ2VOYW1lc1tpXV0gPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgaW1hZ2VzW2ltYWdlTmFtZXNbaV1dLnNyYyA9ICdpbWFnZXMvJyArIGltYWdlTmFtZXNbaV07XG4gICAgICAgIGltYWdlc1tpbWFnZU5hbWVzW2ldXS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICAgICAgaWYgKGxvYWRlZCA9PT0gaW1hZ2VOYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGlzdDogaW1hZ2VOYW1lcyxcbiAgICBpbWFnZXM6IGltYWdlcyxcbiAgICBkb25lOiBkb25lLFxuICAgIGdldDogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGltYWdlTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChpbWFnZU5hbWVzW2ldLmluZGV4T2Yoc3RyaW5nKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXQucHVzaChpbWFnZU5hbWVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbn07IiwidmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyLmpzJyk7XG52YXIgdGV4dCA9IHJlcXVpcmUoJy4vdGV4dC5qcycpO1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGlmICh3aW5kb3cuc3RhdGUgPT09ICdtZW51Jykge1xuICAgICAgICB3aW5kb3cuc3RhdGUgPSAnZ2FtZSc7XG4gICAgfVxufSwgZmFsc2UpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkcmF3TWVudTogZnVuY3Rpb24oY3R4KSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzBmMGQyMCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCA4MDAsIDYwMCk7XG4gICAgICAgIHRleHQud3JpdGUoJ0NsaWNrIHRvIFBsYXknLCAnY2VudGVyJywgMzAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuICAgICAgICAgICAgY3R4LmZvbnQgPSAnNDJwdCBBcmlhbCc7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgZHJhd0VuZDogZnVuY3Rpb24oY3R4LCBzY29yZSkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMwZjBkMjAnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgODAwLCA2MDApO1xuICAgICAgICB0ZXh0LndyaXRlKCdUaGUgZW5kISBZb3Ugc2NvcmVkICcgKyBzY29yZSArICcgcG9pbnRzIScsICdjZW50ZXInLCAzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG4gICAgICAgICAgICBjdHguZm9udCA9ICczMnB0IEFyaWFsJztcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBpbmdhbWU6IGZ1bmN0aW9uIChjdHgsIGZ1ZWwsIGhlYWx0aCkge1xuICAgICAgICBjdHguZHJhd0ltYWdlKGxvYWRlci5pbWFnZXNbJ3Bvd2VyLWJhci1pY29uLnBuZyddLCAzMCwgNTAwKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdvcmFuZ2UnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMzAsIDQ5MCAtIGZ1ZWwsIDIwLCBmdWVsKTtcblxuXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UobG9hZGVyLmltYWdlc1snaGVhbHRoLWJhci1pY29uLnBuZyddLCA3MCwgNTAwKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICBjdHguZmlsbFJlY3QoNzAsIDQ5MCAtIGhlYWx0aCwgMjAsIGhlYWx0aCk7XG4gICAgfVxufTsiLCJ2YXIgcGFydGljbGVzID0gW107XG52YXIgVyA9IDUsIEggPSA1O1xudmFyIFBhcnRpY2xlID0gZnVuY3Rpb24oeCwgeSwgYW5nbGUsIHNwZWVkKSB7XG4gICAgdGhpcy5hbGl2ZSA9IHRydWU7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMud2lkdGggPSBXO1xuICAgIHRoaXMuaGVpZ2h0ID0gSDtcbiAgICB0aGlzLmFuZ2xlID0gYW5nbGU7XG4gICAgdGhpcy5zcGVlZCA9IHNwZWVkO1xuICAgIHRoaXMub3BhY2l0eSA9IDE7XG4gICAgdGhpcy5kZWxheSA9IE1hdGguY2VpbChNYXRoLnJhbmRvbSgpICogMTApO1xuICAgIHRoaXMubG9vcCA9IGZ1bmN0aW9uKGN0eCwgcGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLmRlbGF5ID4gMCkge1xuICAgICAgICAgICAgdGhpcy5kZWxheS0tO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueCArPSBNYXRoLnNpbigtdGhpcy5hbmdsZSkgKiBzcGVlZDtcbiAgICAgICAgdGhpcy55ICs9IE1hdGguY29zKC10aGlzLmFuZ2xlKSAqIHNwZWVkO1xuICAgICAgICB0aGlzLm9wYWNpdHkgLT0gMC4xO1xuICAgICAgICBpZiAodGhpcy5vcGFjaXR5IDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMub3BhY2l0eSA9IDA7XG4gICAgICAgICAgICB0aGlzLmFsaXZlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRHJhd1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSB0aGlzLm9wYWNpdHk7XG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JlZCc7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBXLCBIKTtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9O1xufTtcblxuLy8geCwgeSBhcmUgZml4ZWRcbi8vIFBhcnRpY2xlcyBhcmUgY3JlYXRlZCBmcm9tIGFuZ2xlLXJhbmdlIHRvIGFuZ2xlK3JhbmdlXG4vLyBzcGVlZCBpcyBmaXhlZFxudmFyIGFuZ2xlID0gMDtcbnZhciBjcmVhdGVQYXJ0aWNsZXMgPSBmdW5jdGlvbih4LCB5LCBwbGF5ZXJBbmdsZSwgcmFuZ2UsIHNwZWVkLCBuKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ0NyZWF0aW5nJywgcGFydGljbGVzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAocGFydGljbGVzW2ldICYmICFwYXJ0aWNsZXNbaV0uYWxpdmUgfHwgIXBhcnRpY2xlc1tpXSkge1xuICAgICAgICAgICAgYW5nbGUgPSBwbGF5ZXJBbmdsZSAtIHJhbmdlICsgKE1hdGgucmFuZG9tKCkgKiAyICogcmFuZ2UpO1xuICAgICAgICAgICAgcGFydGljbGVzW2ldID0gbmV3IFBhcnRpY2xlKHgsIHksIGFuZ2xlLCBzcGVlZCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCwgcGxheWVyKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFydGljbGVzW2ldLmxvb3AoY3R4LCBwbGF5ZXIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNyZWF0ZVBhcnRpY2xlczogY3JlYXRlUGFydGljbGVzLFxuICAgIGRyYXc6IGRyYXcsXG4gICAgYXJyYXk6IHBhcnRpY2xlc1xufTtcbiIsInZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL3RyYW5zZm9ybS5qcycpO1xudmFyIGNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNnYW1lJyk7XG5cbndpbmRvdy5wbGF5ZXIgPSB7fTtcblxucGxheWVyLmlkbGUgPSBuZXcgSW1hZ2UoKTtcbnBsYXllci5pZGxlLnNyYyA9ICdpbWFnZXMvYXN0cm8ucG5nJztcbnBsYXllci5mbHlpbmcgPSBuZXcgSW1hZ2UoKTtcbnBsYXllci5mbHlpbmcuc3JjID0gJ2ltYWdlcy9hc3Ryby1mbHlpbmcucG5nJztcbnBsYXllci5zdGF0ZSA9ICdpZGxlJztcbnBsYXllci5mdWVsID0gMTAwO1xucGxheWVyLmhlYWx0aCA9IDEwMDtcblxucGxheWVyLndpZHRoID0gNTI7XG5wbGF5ZXIuaGVpZ2h0ID0gNjA7XG5wbGF5ZXIueCA9IChjYW52YXMud2lkdGggLSBwbGF5ZXIud2lkdGgpIC8gMjtcbnBsYXllci55ID0gKGNhbnZhcy5oZWlnaHQgLSBwbGF5ZXIuaGVpZ2h0KSAvIDI7XG5wbGF5ZXIuYW5nbGUgPSAwO1xuXG5wbGF5ZXIub2Zmc2V0WCA9IHBsYXllci5vZmZzZXRZID0gMDtcblxuXG4vLyBIYWxmIHdpZHRoLCBoYWxmIGhlaWdodFxudmFyIGhXID0gcGxheWVyLndpZHRoIC8gMjtcbnZhciBoSCA9IHBsYXllci5oZWlnaHQgLyAyO1xuXG52YXIgc3BlZWQgPSAwOyAvLyBUaGUgY3VycmVudCBzcGVlZFxudmFyIGRTcGVlZDtcbnZhciBkWCA9IDAsIGRZID0gMDtcblxuLy8gWU9VIENBTiBDT05GSUdVUkUgVEhFU0UhIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG52YXIgYWNjID0gNzsgLy8gQWNjZWxlcmF0aW9uXG52YXIgbGltID0gMTA7IC8vIFNwZWVkIGxpbWl0XG52YXIgdHVyblNwZWVkID0gMi4yO1xudmFyIGdyYXYgPSAwLjA4O1xuLy8gTk8gTU9SRSBDT05GSUdVUklORyEgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnBsYXllci5ncmF2aXR5ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIGRZIC09IGdyYXY7XG59O1xucGxheWVyLm1vdmUgPSBmdW5jdGlvbihlbGFwc2VkLCBmbHlpbmcpIHtcbiAgICBwbGF5ZXIub2Zmc2V0WCA9IGRYO1xuICAgIHBsYXllci5vZmZzZXRZID0gLWRZO1xuICAgIGRYICo9IDAuOTk7XG4gICAgZFkgKj0gMC45OTtcblxuICAgIGlmICghZmx5aW5nKSB7XG4gICAgICAgIHBsYXllci5zdGF0ZSA9ICdpZGxlJztcbiAgICB9XG59O1xucGxheWVyLnVwID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5mdWVsIC09IDAuMTtcbiAgICBwbGF5ZXIuc3RhdGUgPSAnZmx5aW5nJztcbiAgICBzcGVlZCArPSBhY2M7XG4gICAgZFNwZWVkID0gZWxhcHNlZCAqIHNwZWVkO1xuICAgIC8vIGNvbnNvbGUubG9nKHBsYXllci54LCBwbGF5ZXIueSk7XG4gICAgLy8gY29uc29sZS5sb2coTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCwgTWF0aC5jb3MocGxheWVyLmFuZ2xlKSAqIGRTcGVlZCk7XG4gICAgZFggKz0gTWF0aC5zaW4ocGxheWVyLmFuZ2xlKSAqIGRTcGVlZDtcbiAgICBkWSArPSBNYXRoLmNvcyhwbGF5ZXIuYW5nbGUpICogZFNwZWVkO1xuICAgIHBsYXllci5tb3ZlKGVsYXBzZWQsIHRydWUpO1xuICAgIGlmIChzcGVlZCA+IGxpbSkge1xuICAgICAgICBzcGVlZCA9IGxpbTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3BlZWQgPCAtbGltKSB7XG4gICAgICAgIHNwZWVkID0gLWxpbTtcbiAgICB9XG5cbn07XG5wbGF5ZXIucmlnaHQgPSBmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgcGxheWVyLmFuZ2xlICs9IGVsYXBzZWQgKiB0dXJuU3BlZWQgKiBNYXRoLlBJO1xufTtcbnBsYXllci5sZWZ0ID0gZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHBsYXllci5hbmdsZSAtPSBlbGFwc2VkICogdHVyblNwZWVkICogTWF0aC5QSTtcbn07XG5wbGF5ZXIuZmxpcCA9IGZ1bmN0aW9uKCkge1xuICAgIHBsYXllci5hbmdsZSArPSBNYXRoLlBJO1xufTtcblxuLy8gdmFyIHQgPSBuZXcgVHJhbnNmb3JtKCk7XG5wbGF5ZXIuZHJhdyA9IGZ1bmN0aW9uKGVsYXBzZWQsIGN0eCkge1xuICAgIC8vIGN0eC5maWxsUmVjdCgzNzUsIDI3MCwgNTAsIDYwKTtcbiAgICAvLyBQbGF5ZXJcbiAgICBjdHguc2F2ZSgpO1xuICAgIGN0eC50cmFuc2xhdGUocGxheWVyLnggKyBoVywgcGxheWVyLnkgKyBoSCk7XG4gICAgLy8gdC50cmFuc2xhdGUocGxheWVyLnggKyBoVywgcGxheWVyLnkgKyBoSCk7XG4gICAgY3R4LnJvdGF0ZShwbGF5ZXIuYW5nbGUpO1xuICAgIC8vIHQucm90YXRlKHBsYXllci5hbmdsZSk7XG4gICAgY3R4LmRyYXdJbWFnZShwbGF5ZXJbcGxheWVyLnN0YXRlXSwgLWhXLCAtaEgpO1xuICAgIGN0eC5yZXN0b3JlKCk7XG5cbiAgICAvLyBwbGF5ZXIudG9wTGVmdCA9IHQudHJhbnNmb3JtUG9pbnQoLWhXLCAtaEgpO1xuICAgIC8vIHBsYXllci50b3BSaWdodCA9IHQudHJhbnNmb3JtUG9pbnQoaFcsIC1oSCk7XG4gICAgLy8gcGxheWVyLmJvdHRvbUxlZnQgPSB0LnRyYW5zZm9ybVBvaW50KC1oVywgaEgpO1xuICAgIC8vIHBsYXllci5ib3R0b21SaWdodCA9IHQudHJhbnNmb3JtUG9pbnQoaFcsIGhIKTtcbiAgICAvLyB0LnJlc2V0KCk7XG5cbn07XG5tb2R1bGUuZXhwb3J0cyA9IHBsYXllcjtcbiIsIi8vIEhvbGRzIGxhc3QgaXRlcmF0aW9uIHRpbWVzdGFtcC5cbnZhciB0aW1lID0gMDtcblxuLyoqXG4gKiBDYWxscyBgZm5gIG9uIG5leHQgZnJhbWUuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvblxuICogQHJldHVybiB7aW50fSBUaGUgcmVxdWVzdCBJRFxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHJhZihmbikge1xuICByZXR1cm4gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICB2YXIgZWxhcHNlZCA9IG5vdyAtIHRpbWU7XG5cbiAgICBpZiAoZWxhcHNlZCA+IDk5OSkge1xuICAgICAgZWxhcHNlZCA9IDEgLyA2MDtcbiAgICB9IGVsc2Uge1xuICAgICAgZWxhcHNlZCAvPSAxMDAwO1xuICAgIH1cblxuICAgIHRpbWUgPSBub3c7XG4gICAgZm4oZWxhcHNlZCk7XG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLyoqXG4gICAqIENhbGxzIGBmbmAgb24gZXZlcnkgZnJhbWUgd2l0aCBgZWxhcHNlZGAgc2V0IHRvIHRoZSBlbGFwc2VkXG4gICAqIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uXG4gICAqIEByZXR1cm4ge2ludH0gVGhlIHJlcXVlc3QgSURcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHN0YXJ0OiBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiByYWYoZnVuY3Rpb24gdGljayhlbGFwc2VkKSB7XG4gICAgICBmbihlbGFwc2VkKTtcbiAgICAgIHJhZih0aWNrKTtcbiAgICB9KTtcbiAgfSxcbiAgLyoqXG4gICAqIENhbmNlbHMgdGhlIHNwZWNpZmllZCBhbmltYXRpb24gZnJhbWUgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHtpbnR9IGlkIFRoZSByZXF1ZXN0IElEXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzdG9wOiBmdW5jdGlvbihpZCkge1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShpZCk7XG4gIH1cbn07XG4iLCJ2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2NhbnZhcycpWzBdO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xubW9kdWxlLmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAodGV4dCwgeCwgeSwgcHJlRnVuYywgc3Ryb2tlKXtcbiAgICBpZihwcmVGdW5jKXtcbiAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgcHJlRnVuYyhjdHgpO1xuICAgIH1cblxuICAgIHZhciB4UG9zID0geDtcbiAgICBpZih4ID09PSAnY2VudGVyJyl7XG4gICAgICAgIHhQb3MgPSAoY2FudmFzLndpZHRoIC0gY3R4Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoKSAvIDI7XG4gICAgfVxuXG4gICAgaWYoc3Ryb2tlKXtcbiAgICAgICAgY3R4LnN0cm9rZVRleHQodGV4dCwgeFBvcywgeSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdHguZmlsbFRleHQodGV4dCwgeFBvcywgeSk7XG4gICAgfVxuXG4gICAgaWYocHJlRnVuYyl7XG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgfVxufTsiLCIvLyBMYXN0IHVwZGF0ZWQgTm92ZW1iZXIgMjAxMVxuLy8gQnkgU2ltb24gU2FycmlzXG4vLyB3d3cuc2ltb25zYXJyaXMuY29tXG4vLyBzYXJyaXNAYWNtLm9yZ1xuLy9cbi8vIEZyZWUgdG8gdXNlIGFuZCBkaXN0cmlidXRlIGF0IHdpbGxcbi8vIFNvIGxvbmcgYXMgeW91IGFyZSBuaWNlIHRvIHBlb3BsZSwgZXRjXG5cbi8vIFNpbXBsZSBjbGFzcyBmb3Iga2VlcGluZyB0cmFjayBvZiB0aGUgY3VycmVudCB0cmFuc2Zvcm1hdGlvbiBtYXRyaXhcblxuLy8gRm9yIGluc3RhbmNlOlxuLy8gICAgdmFyIHQgPSBuZXcgVHJhbnNmb3JtKCk7XG4vLyAgICB0LnJvdGF0ZSg1KTtcbi8vICAgIHZhciBtID0gdC5tO1xuLy8gICAgY3R4LnNldFRyYW5zZm9ybShtWzBdLCBtWzFdLCBtWzJdLCBtWzNdLCBtWzRdLCBtWzVdKTtcblxuLy8gSXMgZXF1aXZhbGVudCB0bzpcbi8vICAgIGN0eC5yb3RhdGUoNSk7XG5cbi8vIEJ1dCBub3cgeW91IGNhbiByZXRyaWV2ZSBpdCA6KVxuXG4vLyBSZW1lbWJlciB0aGF0IHRoaXMgZG9lcyBub3QgYWNjb3VudCBmb3IgYW55IENTUyB0cmFuc2Zvcm1zIGFwcGxpZWQgdG8gdGhlIGNhbnZhc1xuXG5mdW5jdGlvbiBUcmFuc2Zvcm0oKSB7XG4gIHRoaXMucmVzZXQoKTtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLm0gPSBbMSwwLDAsMSwwLDBdO1xufTtcblxuVHJhbnNmb3JtLnByb3RvdHlwZS5tdWx0aXBseSA9IGZ1bmN0aW9uKG1hdHJpeCkge1xuICB2YXIgbTExID0gdGhpcy5tWzBdICogbWF0cml4Lm1bMF0gKyB0aGlzLm1bMl0gKiBtYXRyaXgubVsxXTtcbiAgdmFyIG0xMiA9IHRoaXMubVsxXSAqIG1hdHJpeC5tWzBdICsgdGhpcy5tWzNdICogbWF0cml4Lm1bMV07XG5cbiAgdmFyIG0yMSA9IHRoaXMubVswXSAqIG1hdHJpeC5tWzJdICsgdGhpcy5tWzJdICogbWF0cml4Lm1bM107XG4gIHZhciBtMjIgPSB0aGlzLm1bMV0gKiBtYXRyaXgubVsyXSArIHRoaXMubVszXSAqIG1hdHJpeC5tWzNdO1xuXG4gIHZhciBkeCA9IHRoaXMubVswXSAqIG1hdHJpeC5tWzRdICsgdGhpcy5tWzJdICogbWF0cml4Lm1bNV0gKyB0aGlzLm1bNF07XG4gIHZhciBkeSA9IHRoaXMubVsxXSAqIG1hdHJpeC5tWzRdICsgdGhpcy5tWzNdICogbWF0cml4Lm1bNV0gKyB0aGlzLm1bNV07XG5cbiAgdGhpcy5tWzBdID0gbTExO1xuICB0aGlzLm1bMV0gPSBtMTI7XG4gIHRoaXMubVsyXSA9IG0yMTtcbiAgdGhpcy5tWzNdID0gbTIyO1xuICB0aGlzLm1bNF0gPSBkeDtcbiAgdGhpcy5tWzVdID0gZHk7XG59O1xuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmludmVydCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZCA9IDEgLyAodGhpcy5tWzBdICogdGhpcy5tWzNdIC0gdGhpcy5tWzFdICogdGhpcy5tWzJdKTtcbiAgdmFyIG0wID0gdGhpcy5tWzNdICogZDtcbiAgdmFyIG0xID0gLXRoaXMubVsxXSAqIGQ7XG4gIHZhciBtMiA9IC10aGlzLm1bMl0gKiBkO1xuICB2YXIgbTMgPSB0aGlzLm1bMF0gKiBkO1xuICB2YXIgbTQgPSBkICogKHRoaXMubVsyXSAqIHRoaXMubVs1XSAtIHRoaXMubVszXSAqIHRoaXMubVs0XSk7XG4gIHZhciBtNSA9IGQgKiAodGhpcy5tWzFdICogdGhpcy5tWzRdIC0gdGhpcy5tWzBdICogdGhpcy5tWzVdKTtcbiAgdGhpcy5tWzBdID0gbTA7XG4gIHRoaXMubVsxXSA9IG0xO1xuICB0aGlzLm1bMl0gPSBtMjtcbiAgdGhpcy5tWzNdID0gbTM7XG4gIHRoaXMubVs0XSA9IG00O1xuICB0aGlzLm1bNV0gPSBtNTtcbn07XG5cblRyYW5zZm9ybS5wcm90b3R5cGUucm90YXRlID0gZnVuY3Rpb24ocmFkKSB7XG4gIHZhciBjID0gTWF0aC5jb3MocmFkKTtcbiAgdmFyIHMgPSBNYXRoLnNpbihyYWQpO1xuICB2YXIgbTExID0gdGhpcy5tWzBdICogYyArIHRoaXMubVsyXSAqIHM7XG4gIHZhciBtMTIgPSB0aGlzLm1bMV0gKiBjICsgdGhpcy5tWzNdICogcztcbiAgdmFyIG0yMSA9IHRoaXMubVswXSAqIC1zICsgdGhpcy5tWzJdICogYztcbiAgdmFyIG0yMiA9IHRoaXMubVsxXSAqIC1zICsgdGhpcy5tWzNdICogYztcbiAgdGhpcy5tWzBdID0gbTExO1xuICB0aGlzLm1bMV0gPSBtMTI7XG4gIHRoaXMubVsyXSA9IG0yMTtcbiAgdGhpcy5tWzNdID0gbTIyO1xufTtcblxuVHJhbnNmb3JtLnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbih4LCB5KSB7XG4gIHRoaXMubVs0XSArPSB0aGlzLm1bMF0gKiB4ICsgdGhpcy5tWzJdICogeTtcbiAgdGhpcy5tWzVdICs9IHRoaXMubVsxXSAqIHggKyB0aGlzLm1bM10gKiB5O1xufTtcblxuVHJhbnNmb3JtLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uKHN4LCBzeSkge1xuICB0aGlzLm1bMF0gKj0gc3g7XG4gIHRoaXMubVsxXSAqPSBzeDtcbiAgdGhpcy5tWzJdICo9IHN5O1xuICB0aGlzLm1bM10gKj0gc3k7XG59O1xuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnRyYW5zZm9ybVBvaW50ID0gZnVuY3Rpb24ocHgsIHB5KSB7XG4gIHZhciB4ID0gcHg7XG4gIHZhciB5ID0gcHk7XG4gIHB4ID0geCAqIHRoaXMubVswXSArIHkgKiB0aGlzLm1bMl0gKyB0aGlzLm1bNF07XG4gIHB5ID0geCAqIHRoaXMubVsxXSArIHkgKiB0aGlzLm1bM10gKyB0aGlzLm1bNV07XG4gIHJldHVybiBbcHgsIHB5XTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNmb3JtOyJdfQ==
