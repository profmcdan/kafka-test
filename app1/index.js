const express = require("express");
const kafka = require("kafka-node");
const sequelize = require("sequelize");
const { Sequelize } = require("sequelize");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbsAreRunning = async () => {
  const db = new Sequelize(process.env.POSTGRES_URL);
  const User = db.define("user", {
    firstname: sequelize.STRING,
    lastname: sequelize.STRING,
    email: sequelize.STRING,
  });

  await db.sync({ force: true });

  const kafkaClient = new kafka.KafkaClient({
    kafkaHost: process.env.KAFKA_BOOTSTRAP_SERVERS,
  });

  const producer = new kafka.Producer(kafkaClient);

  producer.on("ready", () => {
    console.log("producer ready");
    app.post("/", async (req, res) => {
      producer.send(
        [
          {
            topic: process.env.KAFKA_TOPIC,
            messages: JSON.stringify(req.body),
          },
        ],
        async (err, data) => {
          if (err) console.log(err);
          else {
            await User.create(req.body);
            res.json(req.body);
          }
        }
      );
    });
  });
};

setTimeout(dbsAreRunning, 10000);

app.get("/", (req, res) => {
  res.json({ success: true, from: "app 1" });
});

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`APP1 listening on port: ${port}`);
});
