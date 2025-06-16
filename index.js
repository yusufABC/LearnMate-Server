const express = require('express')
const app = express()
const cors=require('cors')
const port = process.env.PORT||3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

// middleware

app.use(cors())
app.use(express.json())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sgdhrky.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

const courseCollection=client.db('LearnMate').collection('course')
const studentCollection=client.db('LearnMate').collection('students')
const enrollmentCollection = client.db('LearnMate').collection('enrollments');
// students review post 




app.get('/students', async (req, res) => {
  const result = await studentCollection.find().toArray();
  res.send(result);
});



// course api 
    app.post('/courses', async (req, res) => {
      const course = {...req.body , createdAt: new Date()}
      const result = await courseCollection.insertOne(course)
      console.log(result)
      res.send(result)
    })
// enrollment 

    app.post('/courses-enroll',async (req,res)=>{
      const {courseId,email}=req.body
      const alreadyEnrolled=await enrollmentCollection.findOne({courseId,email})
       if (alreadyEnrolled) {
    return res.status(400).send({ message: 'Already enrolled' });
  }

  const enrollment={
    courseId,
    email,
  }

    const result = await enrollmentCollection.insertOne(enrollment);
  res.send(result);
    })
// overall course enroll 
    app.get('/courses-enroll', async (req, res) => {
  const { courseId, email } = req.query;

  if (!courseId || !email) {
    return res.status(400).send({ message: 'Missing courseId or email' });
  }

  const enrolled = await enrollmentCollection.findOne({ courseId, email });
  res.send({ enrolled: !!enrolled });
});

// my enrollment 

app.get('/my-enrollments', async (req, res) => {
  const { email } = req.query;
  const result = await enrollmentCollection.find({ email }).toArray();
  res.send(result);
});



app.get('/courses',async(req,res)=>{



      const result=await courseCollection.find().sort({_id:-1}).limit(6).toArray()
    res.send(result)
})




app.get('/courses-find',async(req,res)=>{

    const email=req.query.email
  const query={}
  if(email){
    query.email=email
  }

      const result=await courseCollection.find(query).toArray()
    res.send(result)
})


app.get('/tutorials/:id',async(req,res)=>{
  const id=req.params.id
  const query={_id : new ObjectId(id)}
  const result=await courseCollection.findOne(query)
  res.send(result)
})

app.get('/courses-find/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await courseCollection.findOne(query);
  res.send(result);
});

app.put('/courses-find/:id',async(req,res)=>{
  const id=req.params.id
  const filter={_id:new ObjectId(id)}
  const updatedPost=req.body
  const updatedDoc={
    $set:updatedPost
  }

    const result=await courseCollection.updateOne(filter,updatedDoc)
  res.send(result)

})


   app.delete('/courses-find/:id',async (req,res)=>{
      const id=req.params.id
      const query={_id:new ObjectId(id)}
      const result=await courseCollection.deleteOne(query)
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Learn Mate Is Running')
})





app.listen(port, () => {
  console.log(`Learn mate server is running in port  ${port}`)
})


