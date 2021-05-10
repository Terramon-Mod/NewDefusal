const { Reader, Writer } = window.Binlingo

class PacketFactory {
    constructor() {}
    getType = function typeFromBuffer(buffer) {
        const reader = new Reader(buffer)
        return reader.readUInt8(buffer)
    }
    decodeSelfConnectedPacket(buffer) {
        const reader = new Reader(buffer)
        reader.readUInt8()
        const selfId = reader.readZTStringUTF8()
        const players = {}
        const dataLength = reader.readUInt8()
        for (let i = 0; i < dataLength; i++) {
            let rotation = reader.readFloat()
            let x = reader.readInt16()
            let y = reader.readInt16()
            let playerId = reader.readZTStringUTF8()
            let up = reader.readUInt8()
            let left = reader.readUInt8()
            let down = reader.readUInt8()
            let right = reader.readUInt8()
            players[playerId] = {
                rotation: rotation,
                x: x,
                y: y,
                playerId: playerId,
                up: up,
                left: left,
                down: down,
                right: right
            }
        }
        return [selfId, players]
    }
    decodeClientConnectedPacket(buffer) {
        const reader = new Reader(buffer)
        reader.readUInt8()
        let rotation = reader.readFloat()
        let x = reader.readInt16()
        let y = reader.readInt16()
        let playerId = reader.readZTStringUTF8()
        let up = reader.readUInt8()
        let left = reader.readUInt8()
        let down = reader.readUInt8()
        let right = reader.readUInt8()
        const playerInfo = {
            rotation: rotation,
            x: x,
            y: y,
            playerId: playerId,
            up: up,
            left: left,
            down: down,
            right: right
        }
        return playerInfo
    }
    decodeClientDisconnectedPacket(buffer) {
        const reader = new Reader(buffer)
        reader.readUInt8()
        return reader.readZTStringUTF8()
    }
    decodePlayerUpdatesPacket(buffer) {
        const reader = new Reader(buffer)
        reader.readUInt8()
        const players = {}
        const dataLength = reader.readUInt8()
        for (let i = 0; i < dataLength; i++) {
            let rotation = reader.readFloat()
            let x = reader.readInt16()
            let y = reader.readInt16()
            let playerId = reader.readZTStringUTF8()
            let up = reader.readUInt8()
            let left = reader.readUInt8()
            let down = reader.readUInt8()
            let right = reader.readUInt8()
            players[playerId] = {
                rotation: rotation,
                x: x,
                y: y,
                playerId: playerId,
                up: up,
                left: left,
                down: down,
                right: right
            }
        }
        return players
    }
    encodeMovementPacket(messageEnum, data) {
        const writer = new Writer()
        writer.writeUInt8(messageEnum)
        writer.writeFloat(data[0])
        writer.writeUInt8(data[1])
        writer.writeUInt8(data[2])
        writer.writeUInt8(data[3])
        writer.writeUInt8(data[4])
        return writer.finalize()
    }
}