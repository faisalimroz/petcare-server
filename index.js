const express = require('express')
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const cors = require('cors');
const  jwt = require('jsonwebtoken');
require('dotenv').config();
const bodyParser = require('body-parser');

const multer = require('multer');
const upload = multer();
// Middleware to parse JSON requests
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

app.use(cors())
app.use(express.json())
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

const stripe= require('stripe')('sk_test_51NtCtrF2ejzpUbVI0D61WSBe8TSrr08Hvibewlcu8LLfAHrmOjV8aXmPT2FXbfhMMgSzO4y2wV461Nk1A25EJ12T000CuL1UR1');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tort7uo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}
app.use(cors())
app.use(express.json())
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const blogCollection = client.db('petcare').collection('blog');
    const paymentCollection = client.db('petcare').collection('payments');
    const userCollection = client.db('petcare').collection('user');
    const reviewCollection = client.db('petcare').collection('reviews');
    app.get('/blog', async (req, res) => {
      const query = {}
      const blogs = await blogCollection.find(query).toArray();
      console.log(blogs)
      res.send(blogs);
    })
    app.post('/reviews', async (req, res) => {
      const review = req.body;
      console.log(review)
      const result= await reviewCollection.insertOne(review)
      res.send(result);

      // try {
      //   const newReview = new Review({ rating, reviewMessage });
       
      //   res.json({ success: true });
      // } catch (error) {
      //   console.error(error);
      //   res.status(500).json({ message: 'Error submitting review' });
      // }
    });
    app.post('/blog', async (req, res) => {
      const { title, description, date, img, email } = req.body;
      // Here, you can process the received data, save it to a database, or perform any other necessary actions.
      // For this example, we'll just log the received data.
      console.log({ title, description, date, img, email });
      const post = { title, description, date, img, email }; // Create an object to insert
      const result = await blogCollection.insertOne(post);
      console.log(result)
      res.json(result);
    });
  //   app.post('/blog', upload.single('image'), async (req, res) => {
  //     const { title, description, date, email } = req.body;
  //     const img = req.file.buffer.toString('base64');
   
  //     // Process the received data, save it to a database, or perform other necessary actions.
  //     const post = { title, description, date, img, email };
  //     const result = await blogCollection.insertOne(post);
   
  //     res.json(result);
  //  });
    app.get('/reviews',async(req,res)=>{
      try{
        const result= await reviewCollection.find().limit(3).toArray();
        res.send(result)
      }
      
      catch (error) {
        res.status(500).send('Error fetching reviews');
      }
    })
    app.post('/payments',async(req,res)=>{
      const payment=req.body;
     
      const result=await paymentCollection.insertOne(payment)
      res.send(result)
    })
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query={email:user.email}
      const existingUser= await userCollection.findOne(query)
      if(existingUser){
        return res.send({message: 'user already exists'})
      }
      console.log(user)
      const result = await userCollection.insertOne(user)
      res.send(result);
    })
    app.get('/users',async(req,res)=>{
      const query={}
      const users=await userCollection.find(query).toArray();
      console.log(users)
      res.send(users)
    })
    app.get('/users/:email',async (req,res)=>{
        try {
          const userEmail= req.params.email;
          
          const query = {email: userEmail};
          const user = await userCollection.findOne(query);
          if (user){
            res.json({role:user.role});

          }
          else{
            res.status(404).json({error:'User not found'})
          }
       
        }
        catch(error){
          console.error('Error fetching user role',error)
          res.status(500).json({error:'Internal server error'})
        }
    })

    app.get('/users/admin/:email',verifyJWT,async(req,res)=>{
      const email =req.params.email;
      const decodedEmail=req.decoded.email;
      if(email!=decodedEmail){
        res.send({admin:false})
      }
      const query ={email: email}
      const user= await userCollection.findOne(query);
      const result={admin: user?.role==='admin'}
      res.send(result)
      
    })
    app.get('/orderhistory/:email', async (req, res) => {
      const userEmail = req.params.email;
      console.log('dfgh',userEmail)
      try {
          const userEmail = req.params.email;
          const query = { user: userEmail }; 
          console.log('bddd',query)// Assuming 'user' is the field name in your documents
          const transaction = await paymentCollection.find(query).toArray(); 
          console.log('bddd',transaction)
          if (transaction) {
              res.json(transaction);
          } else {
              res.status(404).json({ error: 'User not found' });
          }
      } catch (error) {
          console.error('Error fetching user history', error);
          res.status(500).json({ error: 'Internal server error' });
      }
  });
  
  
    app.patch('/users/:id', async (req, res) => {
      const userId = req.params.id;

      try {
        const result = await userCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { role: 'admin' } }
        );

        if (result.modifiedCount === 1) {
          res.json({ message: 'User role updated to admin successfully' });
        } else {
          res.status(404).json({ error: 'User not found' });
        }
      } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
  
  }
}
run().catch(console.log)


  


app.get('/',verifyJWT,(req,res)=>{
    res.send('Users Management server is running')
})
//payment

app.post('/jwt',(req,res)=>{
    const user=req.body;
    const token= jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '5h'})
    res.send({token})
})
app.post('/create-payment-intent',verifyJWT,async(req,res)=>{
    const {totalPrice,name}=req.body;
    const amount= totalPrice*100;
    console.log(totalPrice,name)
    const paymentIntent= await stripe.paymentIntents.create({
      amount: amount,
      currency:'usd',
      payment_method_types: ['card']
    })
    res.send({
        clientSecret: paymentIntent.client_secret
    })
})
app.listen(port,()=>{
    console.log(`server is running on PORT: ${port}`)
})