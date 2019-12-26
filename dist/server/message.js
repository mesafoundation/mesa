"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Message {
    // author: Client
    constructor(opcode, data, type) {
        this.opcode = opcode;
        this.data = data;
        this.type = type;
        this.raw = { op: opcode, d: data, t: type };
    }
    serialize() {
        return JSON.stringify({
            op: this.opcode,
            d: this.data,
            t: this.type
        });
    }
}
exports.default = Message;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zZXJ2ZXIvbWVzc2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQWlCQSxNQUFxQixPQUFPO0lBT3hCLGlCQUFpQjtJQUVqQixZQUFZLE1BQWMsRUFBRSxJQUFVLEVBQUUsSUFBVztRQUMvQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNoQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtRQUVoQixJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsU0FBUztRQUNMLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNsQixFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDZixDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDWixDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUk7U0FDZixDQUFDLENBQUE7SUFDTixDQUFDO0NBQ0o7QUF4QkQsMEJBd0JDIn0=