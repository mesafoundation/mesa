# Opcodes
Mesa relies on opcodes to identify different event types. While internal Mesa events uses opcodes 1 to 22, these may be useful to know for building a custom client for example.

We recommend that you keep to opcode 0 for sending / recieving events via Mesa to minimalise errors and interference with internal Mesa events.

| **Code** | **Name**           | **Client Action** | **Description**                                                                          |
|----------|--------------------|-------------------|------------------------------------------------------------------------------------------|
| 0        | Dispatch           | Send/Receive      | Sent by both Mesa and the client to transfer events                                      |
| 1        | Heartbeat          | Send/Recieve      | Sent by both Mesa and the client for ping checking                                       |
| 2        | Authentication     | Send              | Sent by the client to authenticate with Mesa                                             |
| 5        | Internal Event     | N/A               | Sent and recieved by internal server components                                          |
| 10       | Hello              | Recieve           | Sent by Mesa alongside server information for client setup                               |
| 11       | Heartbeat ACK      | Receive           | Sent by Mesa to acknowledge a heartbeat has been received                                |
| 22       | Authentication ACK | Receive           | Sent by Mesa alongside user information to acknowledge the client has been authenticated |
