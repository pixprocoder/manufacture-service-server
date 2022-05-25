const express = require("express");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@cluster0.8dm4o.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    await client.connect();
    const engineCollection = client.db("Car-engine").collection("service");

    app.get("/service", async (req, res) => {
      const services = await engineCollection.find({}).toArray();
      res.send(services);
    });
  } finally {
  }
}
run().catch(console.dir);

// client.connect((err) => {
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   console.log("db connected");
//   client.close();
// });

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`listening on port: ${port}`);
});
