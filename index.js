const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(
  "sk_test_51L48bjAevmEdl8xn6Vdal3tgHRkoPnPbrr1EJ2S4d8Q7q7PNalpuC96XmDy2s3z7upIR4Qg6fukw7f490wdipKuw00pNfcXWNq"
);

const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();

//Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://carEngine:bG9MZU7x0R0YkpgO@cluster0.8dm4o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ massage: "unAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, function (error, decoded) {
    if (error) {
      return res.status(403).send({ massage: "forbidden" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const engineCollection = client.db("Car-engine").collection("service");
    const purchaseCollection = client.db("Car-engine").collection("purchase");
    const userCollection = client.db("Car-engine").collection("user");

    // Load all data
    app.get("/service", async (req, res) => {
      const services = await engineCollection.find({}).toArray();
      res.send(services);
    });

    // Load single data
    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const service = await engineCollection.findOne(filter);
      res.send(service);
    });

    // get all users
    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get("/purchase", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const result = await purchaseCollection.find(query).toArray();
        res.send(result);
      } else {
        res.status(403).send({ massage: "forbidden access" });
      }
    });

    //Delete
    app.delete("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const deleteItem = await purchaseCollection.deleteOne(filter);
      res.send(deleteItem);
    });

    app.get("/purchase/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await purchaseCollection.findOne(filter);
      res.send(result);
    });

    // post
    app.post("/purchase", async (req, res) => {
      const purchase = req.body;
      const result = await purchaseCollection.insertOne(purchase);
      res.send(result);
    });

    // PUT creating user
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_SECRET_TOKEN,
        { expiresIn: "1d" }
      );
      res.send({ result, token });
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.status === "admin";
      res.send({ admin: isAdmin });
    });

    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterPerson = await userCollection.findOne({
        email: requester,
      });
      if (requesterPerson.status === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { status: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        return res.send({ massage: "you cannot make and admin" });
      }
    });

    // stripe payment route

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;

      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`listening on port: ${port}`);
});
