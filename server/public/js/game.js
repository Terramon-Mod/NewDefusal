var config = {
    type: Phaser.WEBGL,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#CCCCCC',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                y: 0
            },
            debug: true
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const players = {}
var selfSocketId;

var game = new Phaser.Game(config);

var screenWidth = window.innerWidth;
var screenHeight = window.innerHeight;
var maxScreenWidth = 1920
var maxScreenHeight = 1080
var screenMult = 1
var targetScale = 1

// Movement packet (Rotation, Up Key, Left Key, Down Key, Right Key)
var target = [0, 0, 0, 0, 0]

const MESSAGE_ENUM = Object.freeze({
    SELF_CONNECTED: 0,
    CLIENT_CONNECTED: 1,
    CLIENT_DISCONNECTED: 2,
    MOVEMENT: 3,
    PLAYER_UPDATES: 4,
})

const factory = new PacketFactory()

function preload ()
{
    this.load.image('playerHead', 'assets/playerHead.png');
    this.load.image('playerPack', 'assets/playerPack.png');
    this.load.image('playerLeftArm', 'assets/playerLeftArm.png');
    this.load.image('playerRightArm', 'assets/playerRightArm.png');
    this.load.image('playerShadow', 'assets/playerShadow.png');
}

function create ()
{
    var self = this;
    this.players = this.add.group();

    // Create input keys
    this.keybinds = this.input.keyboard.addKeys({ 'up': Phaser.Input.Keyboard.KeyCodes.W, 'left': Phaser.Input.Keyboard.KeyCodes.A, 'down': Phaser.Input.Keyboard.KeyCodes.S, 'right': Phaser.Input.Keyboard.KeyCodes.D });

    this.socket = new WebSocket("ws://localhost:7777/ws");
    this.socket.binaryType = "arraybuffer";
    this.socket.onopen = evt => {
        this.socket.onmessage = evt => {
          let buffer = evt.data
          let msgType = factory.getType(buffer)
          switch (msgType) {
            case MESSAGE_ENUM.SELF_CONNECTED:
                var arr = factory.decodeSelfConnectedPacket(buffer);
                selfSocketId = arr[0]
                var players = arr[1]
                Object.keys(players).forEach(function (id) {
                    if (players[id].playerId === selfSocketId) {
                        displayPlayers(self, players[id], true);
                    } else {
                        displayPlayers(self, players[id], false);
                    }
                });
                break;
            case MESSAGE_ENUM.CLIENT_CONNECTED:
                var playerInfo = factory.decodeClientConnectedPacket(buffer);
                displayPlayers(self, playerInfo, false);
                break;
            case MESSAGE_ENUM.CLIENT_DISCONNECTED:
                var playerId = factory.decodeClientDisconnectedPacket(buffer);
                self.players.getChildren().forEach(function (player) {
                    if (playerId === player.playerId) {
                        player.destroy();
                    }
                });
                break;
            case MESSAGE_ENUM.PLAYER_UPDATES:
                var players = factory.decodePlayerUpdatesPacket(buffer);
                Object.keys(players).forEach(function (id) {
                    self.players.getChildren().forEach(function (player) {
                      if (players[id].playerId === player.playerId) {
                        if (players[id].playerId != selfSocketId) {
                            player.angleTarget = players[id].rotation;
                        }
                        player.targetX = players[id].x;
                        player.targetY = players[id].y;
                      }
                    });
                });
                break;
            default:
              return
          }
        }
    }

    setInterval(function(self) {
        if (self.socket.readyState == WebSocket.OPEN) {
            self.socket.send(factory.encodeMovementPacket(MESSAGE_ENUM.MOVEMENT, target));
        }
    }, 1000 / 60, this);

    this.physics.world.setBounds(0, 0, 15000, 15000);
    this.cameras.main.setBounds(0, 0, 15000, 15000);

    var grid = this.add.grid(0, 0, 25640, 25640, 64, 64, 0xFFFFFF, 0, 0x010101, 0.05).setScale(1, 1)

    game.scale.resize(window.innerWidth, window.innerHeight);

    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;
    targetScale = Math.max(screenWidth / maxScreenWidth * screenMult, screenHeight / maxScreenHeight * screenMult);

    this.input.on('pointermove', function(pointer) {
        var player = this.children.getByName('selfPlayer');
        if (player != undefined) {
            var rot = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
            player.angle = Phaser.Math.RadToDeg(rot) - 90
            target[0] = player.angle
        }
    }, this);
}

var interpolateVal = 0.25
function update () {
    this.cameras.main.setZoom(targetScale)

    target[1] = this.keybinds.up.isDown ? 1 : 0
    target[2] = this.keybinds.left.isDown ? 1 : 0
    target[3] = this.keybinds.down.isDown ? 1 : 0
    target[4] = this.keybinds.right.isDown ? 1 : 0
    
    this.players.getChildren().forEach(function(player) {
        if (player.targetX != null) {
            player.x = Phaser.Math.Linear(player.x, player.targetX, 0.25 * 1.4)
        }
        if (player.targetY != null) {
            player.y = Phaser.Math.Linear(player.y, player.targetY, 0.25 * 1.4)
        }
        if (player.angleTarget != null) {
            var a = Phaser.Math.DegToRad(player.angle)
            var b = Phaser.Math.DegToRad(player.angleTarget)
            var c = Phaser.Math.Angle.ShortestBetween(a, b)
            player.rotation = RotateToLinear(a, a + c, 0.25 * 1.4)
	    }
    });
}

function displayPlayers(self, playerInfo, isPlayer) {
    const playerHead = self.add.sprite(0, 0, 'playerHead').setScale(0.5)
    const playerPack = self.add.sprite(0, 0, 'playerPack').setScale(0.5)
    const playerLeftArm = self.add.sprite(0, 0, 'playerLeftArm').setScale(0.5)
    const playerRightArm = self.add.sprite(0, 0, 'playerRightArm').setScale(0.5)
    const playerShadow = self.add.sprite(0, 0, 'playerShadow').setScale(0.5).setAlpha(0.14)
    const player = self.add.container(playerInfo.x, playerInfo.y, [playerShadow, playerLeftArm, playerRightArm, playerPack, playerHead]).setDepth(4)
    self.physics.world.enable(player);
    player.body.setSize(70, 70).setOffset(-player.body.halfWidth, -player.body.halfHeight)
    if (isPlayer) {
        player.name = "selfPlayer"
        self.cameras.main.startFollow(player);
    }
    player.playerId = playerInfo.playerId;
    self.players.add(player);
}

// Smart resizing that keeps view range the same on all resolutions.
window.addEventListener('resize', function(event) {
    game.scale.resize(window.innerWidth, window.innerHeight);

    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;
    targetScale = Math.max(screenWidth / maxScreenWidth * screenMult, screenHeight / maxScreenHeight * screenMult);
}, false);

// Utilities

const MathPI2 = Math.PI * 2

var RotateToLinear = function (p0, p1, t)
{
    if (t === undefined) { t = 0.25; }

    if (p0 === p1)
    {
        return p0;
    }

    if (Math.abs(p1 - p0) > Math.PI)
    {
        if (p1 < p0)
        {
            p1 += MathPI2;
        }
        else
        {
            p1 -= MathPI2;
        }
    }

    return (p1 - p0) * t + p0;
};