"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Message {
    // author: Client
    constructor(opcode, data, type, options) {
        this.opcode = opcode;
        this.data = data;
        this.type = type;
        this.raw = { op: opcode, d: data, t: type };
        this.options = options || { sync: false };
    }
    serialize(toJson = false) {
        const json = { op: this.opcode, d: this.data, t: this.type };
        if (toJson)
            return json;
        return JSON.stringify(json);
    }
}
exports.default = Message;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zZXJ2ZXIvbWVzc2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQTRCQSxNQUFxQixPQUFPO0lBU3hCLGlCQUFpQjtJQUVqQixZQUFZLE1BQWMsRUFBRSxJQUFVLEVBQUUsSUFBVyxFQUFFLE9BQXdCO1FBQ3pFLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBRWhCLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFBO1FBQzNDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFBO0lBQzdDLENBQUM7SUFFRCxTQUFTLENBQUMsU0FBa0IsS0FBSztRQUM3QixNQUFNLElBQUksR0FBYSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDdEUsSUFBRyxNQUFNO1lBQUUsT0FBTyxJQUFJLENBQUE7UUFFdEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQy9CLENBQUM7Q0FDSjtBQTFCRCwwQkEwQkMifQ==