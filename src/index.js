import { newClient, onMessage } from "matrix-bot-starter";

const client = await newClient();
await client.setPresenceStatus("online");

const changeScore = /[\+-]\d+(\.\d+)?/;

async function loadFullThread(roomId, eventId) {
  // copied from https://github.com/turt2live/matrix-bot-sdk/blob/bb93184806317f75cc50c396d9db51f9fe14bdf4/src/MatrixClient.ts#L1974
  let url = `/_matrix/client/v1/rooms/${encodeURIComponent(
    roomId
  )}/relations/${encodeURIComponent(eventId)}/m.thread/m.room.message`;

  let events = [];
  let token;
  while (true) {
    const { chunk, next_batch } = await client.doRequest(
      "GET",
      token ? url + "?from=" + token : url
    );
    events = events.concat(chunk);
    if (!next_batch) return events;
    token = next_batch;
  }
}

async function sendMessageInThread(roomId, threadId, eventId, message) {
  return await client.sendMessage(roomId, {
    msgtype: "m.text",
    body: message,
    "m.relates_to": {
      rel_type: "m.thread",
      event_id: threadId,
      is_falling_back: true,
      "m.in_reply_to": {
        event_id: eventId,
      },
    },
  });
}

async function replaceMessage(roomId, eventId, message) {
  return await client.sendMessage(roomId, {
    msgtype: "m.text",
    body: " * " + message,
    "m.new_content": {
      msgtype: "m.text",
      body: message,
    },
    "m.relates_to": {
      rel_type: "m.replace",
      event_id: eventId,
    },
  });
}

onMessage(
  client,
  async (
    roomId,
    event,
    sender,
    content,
    body,
    requestEventId,
    isEdit,
    isHtml,
    mentioned
  ) => {
    const isInThread = content["m.relates_to"]?.rel_type === "m.thread";
    const threadId = content["m.relates_to"]?.event_id;

    if (isInThread && threadId) {
      const me = await client.getUserId();

      // get all the events in the thread
      const thread = await loadFullThread(roomId, threadId);

      // find leader board message
      const leaderBoardEvent = Array.from(thread)
        .reverse()
        .find((e) => e.sender === me && e.content.body.match(/^leaderboard/i));

      if (mentioned) {
        let command = mentioned.toLowerCase();
        if (command.includes("create") || command.includes("start")) {
          if (!leaderBoardEvent) {
            await sendMessageInThread(
              roomId,
              threadId,
              requestEventId,
              "Leaderboard"
            );
          }
        }
      } else if (body.match(changeScore)) {
        // add the latest event to the top
        thread.unshift(event);

        // recalculate scores
        const scores = new Map();
        for (const event of Array.from(thread).reverse()) {
          if (event.sender === me) continue;
          const match = event.content.body.match(changeScore);
          if (match) {
            const amount = parseFloat(match[0]);
            if (!Number.isFinite(amount)) continue;
            const current = scores.get(event.sender) || 0;
            scores.set(event.sender, amount + current);
          }
        }

        const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);

        // update leader board
        if (leaderBoardEvent) {
          const lines = ["Leaderboard:"];
          for (const [name, score] of sorted) {
            const profile = await client.getUserProfile(name);
            lines.push(`${profile.displayname}: ${score}`);
          }
          const body = lines.join("\n");

          await replaceMessage(roomId, leaderBoardEvent.event_id, body);
        }
      }
    } else if (mentioned) {
      await client.replyText(
        roomId,
        event,
        "leader boards only work in threads"
      );
    }
  }
);

async function shutdown() {
  console.log("shutting down");
  await client.setPresenceStatus("offline");
  client.stop();
  process.exit();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.once("SIGUSR2", shutdown);
