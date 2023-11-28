const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SEC)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// console.log(process.env.DB_USER);
// console.log(process.env.DB_PASS);
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pz6rkt0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
     serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
     },
});

async function run() {
     try {
          // Connect the client to the server	(optional starting in v4.7)
          await client.connect();

          const userCollection = client.db("contestDB").collection("users");
          const allContextCollection = client
               .db("contestDB")
               .collection("allContexts");
          const contextCollection = client
               .db("contestDB")
               .collection("createContext");
          const registerCollection = client
               .db("contestDB")
               .collection("registerUser");
          const BestCreatorCollection = client
               .db("contestDB")
               .collection("bestCreator");

          // jwt api

          app.post("/jwt", async (req, res) => {
               const user = req.body;
               const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
                    expiresIn: "1h",
               });
               res.send({ token });
          });
          // middlewares
          const verifyToken = (req, res, next) => {
               //  console.log("inside verify token", req.headers);
               if (!req.headers.authorization) {
                    return res
                         .status(401)
                         .send({ message: "Unauthorized access" });
               }
               const token = req.headers.authorization.split(" ")[1];

               jwt.verify(token, process.env.ACCESS_TOKEN, (err, decode) => {
                    if (err) {
                         return res
                              .status(401)
                              .send({ message: "Unauthorized access" });
                    }
                    req.decode = decode;
                    next();
               });

               // next();
          };

          // use verify admin after access token
          const verifyAdmin = async (req, res, next) => {
               const email = req.decode.email;
               const query = { email: email };
               const user = await userCollection.findOne(query);
               const isAdmin = user?.role === "admin";
               if (!isAdmin) {
                    return res
                         .status(403)
                         .send({ message: "forbidden access" });
               }
               next();
          };

          // user api

          app.get("/users", async (req, res) => {
               const result = await userCollection.find().toArray();
               res.send(result);
          });
          app.get("/users/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) };
               result = await userCollection.findOne(query);
               res.send(result);
          });
          app.get("/users/admin/:email", verifyToken, async (req, res) => {
               //  console.log(req.headers);
               const email = req.params.email;
               //  if(email !== req.decode.email){
               //       return res.status(403).send({message: 'unauthorize access'})
               //  }
               const query = { email: email };
               const user = await userCollection.findOne(query);
               let isAdmin = false;
               if (user) {
                    isAdmin = user?.role === "admin";
               }
               res.send({ isAdmin });
          });
          app.get("/users/creator/:email", verifyToken, async (req, res) => {
               //  console.log(req.headers);
               const email = req.params.email;
               //  if(email !== req.decode.email){
               //       return res.status(403).send({message: 'unauthorize access'})
               //  }
               const query = { email: email };
               const user = await userCollection.findOne(query);
               let isCreator = false;
               if (user) {
                    isCreator = user?.role === "creator";
               }
               res.send({ isCreator });
          });

          app.post("/users", async (req, res) => {
               const user = req.body;
               const query = { email: user.email };
               //  console.log("Query", query);
               const existingUser = await userCollection.findOne(query);
               if (existingUser) {
                    return res.send({ message: "user already exists" });
               }
               const result = await userCollection.insertOne(user);
               res.send(result);
          });
          app.delete(
               "/users/:id",
               verifyToken,
               verifyAdmin,
               async (req, res) => {
                    const id = req.params.id;
                    const query = { _id: new ObjectId(id) };
                    const result = await userCollection.deleteOne(query);
                    res.send(result);
               }
          );

          // app.patch("/users/admin/:id",verifyToken,verifyAdmin, async (req, res) => {
          //      const id = req.params.id;
          //      const filter = { _id: new ObjectId(id) };
          //      const updatedDoc = {
          //           $set: {
          //                role: "admin",
          //           },
          //      };
          //      const result = await userCollection.updateOne(
          //           filter,
          //           updatedDoc
          //      );
          //      res.send(result);
          // });

          app.patch(
               "/users/role/:id",
               verifyToken,
               verifyAdmin,
               async (req, res) => {
                    const id = req.params.id;
                    const filter = { _id: new ObjectId(id) };
                    const updateUserRole = req.body;
                    // console.log(updateUserRole);
                    //  const options = { upsert: true };
                    const updatedDoc = {
                         $set: {
                              role: updateUserRole.selectedOption,
                         },
                    };
                    const result = await userCollection.updateOne(
                         filter,
                         updatedDoc
                    );
                    res.send(result);
               }
          );
          app.patch("/users/:id", async (req, res) => {
               const id = req.params.id;
               const updatedName = req.body;
               const filter = { _id: new ObjectId(id) };
               console.log(updatedName);
               //  const options = { upsert: true };
               const updatedDoc = {
                    $set: {
                         name: updatedName.name,
                    },
               };
               const result = await userCollection.updateOne(
                    filter,
                    updatedDoc
               );
               res.send(result);
          });

          // create connext api
          // app.get("/allContexts",verifyToken, async (req, res) => {
          //      // const email = req.query.email;
          //      // const query = { email: email };
          //      const result = await allContextCollection.find().toArray();
          //      res.send(result);
          // });

          app.get("/createContext", async (req, res) => {
               const result = await contextCollection.find().toArray();
               res.send(result);
          });
          app.get("/createContext/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) };
               result = await contextCollection.findOne(query);
               res.send(result);
          });
          app.post("/createContext", verifyToken, async (req, res) => {
               const context = req.body;
               console.log(context);
               const result = await contextCollection.insertOne(context);
               res.send(result);
          });
          app.put("/createContext/:id", async (req, res) => {
               const id = req.params.id;
               const updatedInfo = req.body;
               const filter = { _id: new ObjectId(id) };
               const options = { upsert: true };
               const updatedItems = {
                    name: updatedInfo.name,
                    tag: updatedInfo.tag,
                    price: updatedInfo.price,
                    prizeMoney: updatedInfo.prizeMoney,
                    deadLine: updatedInfo.deadLine,
                    description: updatedInfo.description,
                    instruction: updatedInfo.instruction,
                    image: updatedInfo.image,
                    // participants: updatedInfo.finalParticipants
               };
               console.log(updatedItems);
               const result = await contextCollection.updateOne(
                    filter,
                    { $set: { ...updatedItems } },
                    options
               );
               res.send(result);
          });
          app.patch("/createContext/:id", verifyToken, async (req, res) => {
               const id = req.params.id;
               const userStatus = req.body;
               console.log(userStatus);
               const filter = { _id: new ObjectId(id) };
               const updateDoc = {
                    $set: {
                         status: userStatus?.status,
                         participants:userStatus?.finalParticipants,
                    },
               };
               console.log(userStatus);
               const result = await contextCollection.updateOne(
                    filter,
                    updateDoc
               );
               res.send(result);
          });
          app.delete("/createContext/:id", verifyToken, async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) };
               const result = await contextCollection.deleteOne(query);
               res.send(result);
          });

          // payment methods
          app.post('/create-payment-intent',async(req, res)=>{
               const {price} = req.body;
               const amount = parseInt(price * 100);
               console.log(amount,'amount');
               const paymentIntent = await stripe.paymentIntents.create({
                    amount:amount,
                    currency: "usd",
                    payment_method_types: ['card']
                  });
                  res.send({
                    clientSecret : paymentIntent.client_secret,
                  })
          });

          // registerCollections api

          app.get("/registerUser", async (req, res) => {
               const result = await registerCollection.find().toArray();
               res.send(result);
          });
          app.post('/registerUser',async (req, res) => {
               const registerUser=req.body;
               console.log(registerUser);
               const result = await registerCollection.insertOne(registerUser);
               res.send(result);
          })
          app.put("/registerUser/:id", async (req, res) => {
               const id = req.params.id;
               const filter = { _id: new ObjectId(id) };
               const updatedInfo = req.body;
               const options = { upsert: true };
               const updatedItems = {
                    task: updatedInfo.task,
                   
               };
               console.log(updatedItems);
               const result = await registerCollection.updateOne(
                    filter,
                    { $set: { ...updatedItems } },
                    options
               );
               res.send(result);
          });
          app.patch("/registerUser/:id", async (req, res) => {
               const id = req.params.id;
               const filter = { _id: new ObjectId(id) };
               const updateWinnerUser = req.body;
               console.log(updateWinnerUser);
               const updateDoc = {
                    $set: {
                         status: updateWinnerUser?.confirm,
                    },
               };
               console.log(updateWinnerUser);
               const result = await registerCollection.updateOne(
                    filter,
                    updateDoc
               );
               res.send(result);
          });
         
           

          // bestCreator api
          app.get("/bestCreator", async (req, res) => {
               const result = await BestCreatorCollection.find().toArray();
               res.send(result);
          });


        

          // Send a ping to confirm a successful connection
          await client.db("admin").command({ ping: 1 });
          console.log(
               "Pinged your deployment. You successfully connected to MongoDB!"
          );
     } finally {
          // Ensures that the client will close when you finish/error
          //     await client.close();
     }
}
run().catch(console.dir);

app.get("/", (req, res) => {
     res.send("ContestHub server is running");
});

app.listen(port, () => {
     console.log(`ContestHub server listening on port ${port}`);
});
