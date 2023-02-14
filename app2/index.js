const express = require("express");
const kafka = require("kafka-node");
const { connect, set, model, Schema } = require("mongoose");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbConnection = {
  uri: process.env.MONGO_URL,
  options: {
    autoIndex: false, // Don't build indexes
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
  },
};

const dbsAreRunning = async () => {
  set("strictQuery", false);
  await connect(dbConnection.uri, dbConnection.options);
  const User = model(
    "user",
    new Schema({
      firstname: String,
      lastname: String,
      email: String,
    })
  );

  const kafkaClient = new kafka.KafkaClient({
    kafkaHost: process.env.KAFKA_BOOTSTRAP_SERVERS,
  });

  const consumer = new kafka.Consumer(
    kafkaClient,
    [{ topic: process.env.KAFKA_TOPIC }],
    {
      autoCommit: false,
    }
  );

  consumer.on("message", async (message) => {
    const user = await User.create(JSON.parse(message.value.toString()));
    console.log(user);
  });

  consumer.on("error", (err) => {
    console.log(err);
  });
};

setTimeout(dbsAreRunning, 1000);

app.get("/", (req, res) => {
  res.json({ success: true, from: "app 2" });
});

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`APP2 listening on port: ${port}`);
});
